"use client";


import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, deleteDoc, doc, or } from "firebase/firestore";
import { DashboardShell } from '@/components/DashboardShell';
import { SmartProductCard } from '@/components/SmartProductCard';
import { Heart, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function FavoritesPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Derived collections for the sidebar/modal
    const [collections, setCollections] = useState<string[]>([]);

    useEffect(() => {
        if (!user?.uid) return;

        let productsA: any[] = [];
        let productsB: any[] = [];

        const updateState = () => {
            const allItems = [...productsA, ...productsB];
            const uniqueItems = Array.from(new Map(allItems.map(p => [p.id, p])).values());

            const foundCollections = new Set<string>();
            const items = uniqueItems.map(p => ({
                ...p,
                inStock: p.inStock !== false,
            }));

            items.forEach(p => {
                if (p.collection) foundCollections.add(p.collection);
            });

            items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            setProducts(items);
            setCollections(Array.from(foundCollections));
            setLoading(false);
        };

        const q1 = query(collection(db, "products"), where("userId", "==", user.uid), where("isFavorite", "==", true));
        const unsub1 = onSnapshot(q1, (snap) => {
            productsA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateState();
        }, (err) => {
            console.error("Favorites (Owner) Error:", err);
            setLoading(false);
        });

        const q2 = query(collection(db, "products"), where("participants", "array-contains", user.uid), where("isFavorite", "==", true));
        const unsub2 = onSnapshot(q2, (snap) => {
            productsB = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateState();
        }, (err) => {
            console.error("Favorites (Participant) Error:", err);
            setLoading(false);
        });

        return () => { unsub1(); unsub2(); };
    }, [user]);

    const handleDelete = async (productId: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            await deleteDoc(doc(db, "products", productId));
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("Failed to delete product.");
        }
    };

    return (
        <DashboardShell collections={collections}>
            <div className="space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] mb-2">Your Favorites</h1>
                        <p className="text-muted-foreground">
                            {products.length} items saved to your collection header.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-6">
                        <div className="w-24 h-24 bg-surfaceHighlight/30 rounded-full flex items-center justify-center text-primary/50">
                            <Heart size={48} />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h3 className="text-xl font-bold text-[var(--text-main)]">No favorites yet</h3>
                            <p className="text-muted-foreground">
                                Click the heart icon on any product to save it here for later.
                            </p>
                        </div>
                        <Link href="/dashboard" className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[var(--text-main)] font-medium transition-colors">
                            Browse Items
                        </Link>
                    </div>
                ) : (
                    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                        {products.map((product) => (
                            <SmartProductCard
                                key={product.id}
                                product={product}
                                onDelete={() => handleDelete(product.id)}
                                collections={collections}
                            />
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
