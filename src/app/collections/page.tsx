"use client";

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { DashboardShell } from '@/components/DashboardShell';
import { Folder } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { writeBatch, getDocs, deleteField } from 'firebase/firestore';
import { CollectionCard } from '@/components/CollectionCard';

export default function CollectionsPage() {
    const { user } = useAuth();
    const [collectionsMap, setCollectionsMap] = useState<Record<string, number>>({});
    const [privacySettings, setPrivacySettings] = useState<Record<string, boolean>>({});
    const [collectionImages, setCollectionImages] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    // Fetch Products (Counts)
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "products"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const counts: Record<string, number> = {};
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

    // Fetch Privacy Settings
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "collection_settings"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const settings: Record<string, boolean> = {};
            const images: Record<string, string> = {};
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.name) {
                    settings[data.name] = data.isPublic || false;
                    if (data.image) {
                        images[data.name] = data.image;
                    }
                }
            });
            setPrivacySettings(settings);
            setCollectionImages(images);
        });

        return () => unsubscribe();
    }, [user]);

    const handleTogglePrivacy = async (e: React.MouseEvent, collectionName: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) return;

        const currentStatus = privacySettings[collectionName] || false;
        const newStatus = !currentStatus;

        // Optimistic UI update
        setPrivacySettings(prev => ({ ...prev, [collectionName]: newStatus }));

        try {
            // Using a composite ID safe for querying. 
            // Note: If names have special chars (like slashes), this might be tricky for IDs.
            // Using setDoc with merge to ensure we create or update.
            // We store the 'name' field securely inside the doc so we can map it back.
            // ID: user.uid + "_" + collectionName (sanitized or just strict)
            // For simplicity, let's assume standard names, but we'll stick to a query-friendly ID approach if possible?
            // Actually, querying by 'userId' and 'name' logic is better for robustness if IDs are tricky.
            // But setDoc needs an ID. Let's use a safe hashed-like ID or simple concatenation.
            // Base64Url encoding: replace + with -, / with _, and remove = padding
            const safeNameId = typeof window !== 'undefined'
                ? btoa(unescape(encodeURIComponent(collectionName))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                : collectionName;
            const docRef = doc(db, "collection_settings", `${user.uid}_${safeNameId}`);

            await setDoc(docRef, {
                userId: user.uid,
                name: collectionName,
                isPublic: newStatus,
                updatedAt: new Date()
            }, { merge: true });

            console.log(`Privacy for ${collectionName} set to ${newStatus}`);
        } catch (err) {
            console.error("Error toggling privacy:", err);
            // Revert on error
            setPrivacySettings(prev => ({ ...prev, [collectionName]: currentStatus }));
            alert("Failed to update privacy settings.");
        }
    };

    const handleUpdateImage = async (file: File, collectionName: string) => {
        if (!user) return;

        try {
            // Create a safe reference for the file
            // Path: collection-covers/{userId}/{collectionName_timestamp}
            // Using timestamp to avoid caching issues on update
            const safeName = collectionName.replace(/[^a-zA-Z0-9-_]/g, '');
            const storagePath = `collection-covers/${user.uid}/${safeName}_${Date.now()}`;
            const storageRef = ref(storage, storagePath);

            // Upload
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Save to Firestore
            // Re-using the same ID logic as Privacy settings: UID_Base64Name (URL safe)
            const safeNameId = typeof window !== 'undefined'
                ? btoa(unescape(encodeURIComponent(collectionName))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                : collectionName;
            const docRef = doc(db, "collection_settings", `${user.uid}_${safeNameId}`);

            await setDoc(docRef, {
                userId: user.uid,
                name: collectionName,
                image: downloadURL,
                updatedAt: new Date()
            }, { merge: true });

            console.log(`Image updated for ${collectionName}`);
        } catch (error) {
            console.error("Error updating image:", error);
            throw error; // Rethrow so component can handle it (e.g. stop spinner)
        }
    };


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
                        {collectionsList.map(([name, count]) => {
                            // Generate a URL-safe share ID: UID + "_" + Base64Name (URL safe)
                            const safeName = typeof window !== 'undefined'
                                ? btoa(unescape(encodeURIComponent(name))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                                : name;
                            const shareId = `${user?.uid}_${safeName}`;

                            return (
                                <CollectionCard
                                    key={name}
                                    name={name}
                                    count={count}
                                    isPublic={!!privacySettings[name]}
                                    shareId={shareId}
                                    onTogglePrivacy={handleTogglePrivacy}
                                    onDelete={handleDeleteCollection}
                                    allowDelete={name !== 'Uncategorized'}
                                    image={collectionImages[name]}
                                    onUpdateImage={handleUpdateImage}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
