"use client";

import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { DashboardShell } from '@/components/DashboardShell';
import { Folder } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { writeBatch, getDocs, deleteField } from 'firebase/firestore';
import { CollectionCard } from '@/components/CollectionCard';

export default function CollectionsPage() {
    const { user } = useAuth();
    const [collectionsMap, setCollectionsMap] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "products"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const counts: Record<string, number> = {};

            // Add default collections - REMOVED to prevent ghost folders
            // ['Home Office', 'Living Room', 'Tech Setup'].forEach(c => counts[c] = 0);

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.collection) {
                    counts[data.collection] = (counts[data.collection] || 0) + 1;
                } else {
                    counts['Uncategorized'] = (counts['Uncategorized'] || 0) + 1;
                }
            });

            setCollectionsMap(counts);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleDeleteCollection = async (e: React.MouseEvent, collectionName: string) => {
        // Double safety: stop propagation here too even though component does it
        e.preventDefault();
        e.stopPropagation();

        console.log("Root Page: Delete requested for:", collectionName);

        if (!user) {
            console.error("User not authenticated.");
            alert("Please login to perform this action.");
            return;
        }

        // Use a slightly delayed confirm to ensure UI has updated from click
        setTimeout(async () => {
            if (!confirm(`Are you sure you want to delete the collection "${collectionName}"? Items inside will be moved to Uncategorized.`)) return;

            try {
                // Find all products in this collection
                const q = query(
                    collection(db, "products"),
                    where("userId", "==", user.uid),
                    where("collection", "==", collectionName)
                );

                const snapshot = await getDocs(q);
                console.log(`Found ${snapshot.size} items to update.`);

                if (snapshot.empty) {
                    // Even if empty, we might want to "succeed" visually if it was just a glitch
                    console.warn("Collection is empty or does not exist in backend.");
                }

                const batch = writeBatch(db);

                snapshot.docs.forEach((doc) => {
                    batch.update(doc.ref, { collection: deleteField() });
                });

                await batch.commit();
                console.log("Collection deleted successfully.");
                alert(`Collection "${collectionName}" deleted successfully.`);
            } catch (error) {
                console.error("Error deleting collection:", error);
                alert("Failed to delete collection. See console for details.");
            }
        }, 50);
    };

    const collectionsList = Object.entries(collectionsMap);

    return (
        <DashboardShell collections={Object.keys(collectionsMap)}>
            <div className="space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] mb-2">Your Collections</h1>
                        <p className="text-muted-foreground">
                            Organize your items into folders.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : collectionsList.length === 0 ? (
                    <div className="text-center py-20 bg-surface/50 rounded-3xl border border-surfaceHighlight">
                        <div className="w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                            <Folder size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">No collections yet</h3>
                        <p className="text-muted-foreground mb-6">Start saving items to create your first collection.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {collectionsList.map(([name, count]) => (
                            <CollectionCard
                                key={name}
                                name={name}
                                count={count}
                                onDelete={handleDeleteCollection}
                                allowDelete={name !== 'Uncategorized'}
                            />
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
