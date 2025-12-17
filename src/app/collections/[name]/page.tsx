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

        // Fetch user products filtered by collection
        const q = query(
            collection(db, "products"),
            where("userId", "==", user.uid),
            where("collection", "==", collectionName)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: any[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                items.push({
                    id: doc.id,
                    ...data,
                    inStock: data.inStock !== false,
                });
            });

            // Sort by newest
            items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            setProducts(items);
            setLoading(false);
        });

        // Also fetch ALL collections for the sidebar (separate listener or derived?) 
        // Ideally sidebar fetches its own, but we usually pass it down. 
        // For efficiency, let's just make a separate query for all user items to get collection names? 
        // Or simpler: just let DashboardShell behave without specific collections or pass empty/mock? 
        // Sidebar usually needs real collections to navigate. 
        // Let's do a quick fetch of all items to derive collection list implies reading EVERYTHING just for the list. 
        // Maybe we accept that sidebar might just have default or we do the heavy lift. 
        // Let's replicate the logic from FavoritesPage which derived it.
        const qAll = query(collection(db, "products"), where("userId", "==", user.uid));
        const unsubAll = onSnapshot(qAll, (snap) => {
            const found = new Set<string>();
            snap.forEach(d => {
                const dData = d.data();
                if (dData.collection) found.add(dData.collection);
            });
            setAllCollections(Array.from(found));
        });

        return () => {
            unsubscribe();
            unsubAll();
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
