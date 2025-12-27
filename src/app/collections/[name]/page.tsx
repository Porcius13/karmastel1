"use client";

import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { DashboardShell } from '@/components/DashboardShell';
import { SmartProductCard } from '@/components/SmartProductCard';
import { FolderOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CollectionDetailsPage() {
    const { user } = useAuth();
    const params = useParams();
    // Decode percent-encoded string (e.g., "Living%20Room" -> "Living Room")
    const collectionName = decodeURIComponent(params.name as string);

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Derived collections for the sidebar
    const [allCollections, setAllCollections] = useState<string[]>([]);

    useEffect(() => {
        if (!user || !collectionName) return;

        let productsA: any[] = [];
        let productsB: any[] = [];
        let collectionsA: string[] = [];
        let collectionsB: string[] = [];

        const updateState = () => {
            const allProducts = [...productsA, ...productsB];
            const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());

            // Filter by collection name
            const filteredProducts = uniqueProducts.filter(p => p.collection === collectionName);
            filteredProducts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setProducts(filteredProducts);

            // Also update allCollections list from the separate listeners
            const allColNames = Array.from(new Set([...collectionsA, ...collectionsB, ...uniqueProducts.map(p => p.collection).filter(Boolean)])).sort();
            setAllCollections(allColNames);

            setLoading(false);
        };

        // 1. Products (Owner)
        const qP1 = query(collection(db, "products"), where("userId", "==", user.uid));
        const unsubP1 = onSnapshot(qP1, (snap) => {
            productsA = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), inStock: doc.data().inStock !== false }));
            updateState();
        }, (err) => console.error("Collection Page Products (Owner) Error:", err));

        // 2. Products (Participant)
        const qP2 = query(collection(db, "products"), where("participants", "array-contains", user.uid));
        const unsubP2 = onSnapshot(qP2, (snap) => {
            productsB = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), inStock: doc.data().inStock !== false }));
            updateState();
        }, (err) => console.error("Collection Page Products (Participant) Error:", err));

        // 3. Collections (Owner)
        const qC1 = query(collection(db, "collection_settings"), where("userId", "==", user.uid));
        const unsubC1 = onSnapshot(qC1, (snap) => {
            collectionsA = snap.docs.map(doc => doc.data().name).filter(Boolean);
            updateState();
        }, (err) => console.error("Collection Page Settings (Owner) Error:", err));

        // 4. Collections (Participant)
        const qC2 = query(collection(db, "collection_settings"), where("participants", "array-contains", user.uid));
        const unsubC2 = onSnapshot(qC2, (snap) => {
            collectionsB = snap.docs.map(doc => doc.data().name).filter(Boolean);
            updateState();
        }, (err) => console.error("Collection Page Settings (Participant) Error:", err));

        return () => {
            unsubP1(); unsubP2(); unsubC1(); unsubC2();
        };
    }, [user, collectionName]);

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
        <DashboardShell collections={allCollections} activeCollection={collectionName}>
            <div className="space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-surfaceHighlight/50 rounded-lg flex items-center justify-center text-primary">
                                <FolderOpen size={20} />
                            </div>
                            <h1 className="text-3xl font-black text-[var(--text-main)]">{collectionName}</h1>
                        </div>
                        <p className="text-muted-foreground ml-1">
                            {products.length} items in this collection.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-6">
                        <div className="w-24 h-24 bg-surfaceHighlight/30 rounded-full flex items-center justify-center text-muted-foreground">
                            <FolderOpen size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-main)]">Collection is empty</h3>
                        <p className="text-muted-foreground">
                            This collection has no items yet.
                        </p>
                        <Link href="/dashboard" className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[var(--text-main)] font-medium transition-colors">
                            Browse All Items
                        </Link>
                    </div>
                ) : (
                    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                        {products.map((product) => (
                            <SmartProductCard
                                key={product.id}
                                product={product}
                                onDelete={() => handleDelete(product.id)}
                                collections={allCollections}
                            />
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
