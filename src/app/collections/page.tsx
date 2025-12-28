"use client";

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, or } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { DashboardShell } from '@/components/DashboardShell';
import { Folder } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { writeBatch, getDocs, deleteField } from 'firebase/firestore';
import { CollectionCard } from '@/components/CollectionCard';

// ... imports remain the same
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function CollectionsPage() {
    const { user } = useAuth();
    const [collectionsMap, setCollectionsMap] = useState<Record<string, number>>({});
    const [privacySettings, setPrivacySettings] = useState<Record<string, boolean>>({});
    const [collectionImages, setCollectionImages] = useState<Record<string, string>>({});
    const [collectionFirstImages, setCollectionFirstImages] = useState<Record<string, string>>({}); // Fallback images from products
    const [availableCollectionNames, setAvailableCollectionNames] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Fetch Products (Counts & Fallback Images)
    useEffect(() => {
        if (!user?.uid) return;

        let productsA: any[] = [];
        let productsB: any[] = [];

        const updateState = () => {
            const allProducts = [...productsA, ...productsB];
            const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());

            const counts: Record<string, number> = {};
            const firstImages: Record<string, string> = {};

            uniqueProducts.forEach((p) => {
                const colName = p.collection || 'Uncategorized';
                counts[colName] = (counts[colName] || 0) + 1;
                if (p.image && !firstImages[colName]) {
                    firstImages[colName] = p.image;
                }
            });
            setCollectionsMap(counts);
            setCollectionFirstImages(firstImages);
        };

        const q1 = query(collection(db, "products"), where("userId", "==", user.uid));
        const unsub1 = onSnapshot(q1, (snap) => {
            productsA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateState();
        }, (err) => {
            console.error("Collections Products (Owner) Error:", err);
            setLoading(false);
        });

        const q2 = query(collection(db, "products"), where("participants", "array-contains", user.uid));
        const unsub2 = onSnapshot(q2, (snap) => {
            productsB = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateState();
        }, (err) => {
            console.error("Collections Products (Participant) Error:", err);
            setLoading(false);
        });

        return () => { unsub1(); unsub2(); };
    }, [user]);

    // Fetch Privacy Settings
    useEffect(() => {
        if (!user?.uid) return;

        let settingsA: any[] = [];
        let settingsB: any[] = [];

        const updateState = () => {
            const allSettings = [...settingsA, ...settingsB];
            const uniqueSettings = Array.from(new Map(allSettings.map(s => [s.id, s])).values());

            const settings: Record<string, boolean> = {};
            const images: Record<string, string> = {};
            const names = new Set<string>();

            uniqueSettings.forEach((s) => {
                if (s.name) {
                    names.add(s.name);
                    settings[s.name] = s.isPublic || false;
                    if (s.image || s.coverImage) {
                        images[s.name] = s.image || s.coverImage;
                    }
                }
            });
            setPrivacySettings(settings);
            setCollectionImages(images);
            setAvailableCollectionNames(names);
            setLoading(false);
        };

        const q1 = query(collection(db, "collection_settings"), where("userId", "==", user.uid));
        const unsub1 = onSnapshot(q1, (snap) => {
            settingsA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateState();
        }, (err) => {
            console.error("Collections Settings (Owner) Error:", err);
            setLoading(false);
        });

        const q2 = query(collection(db, "collection_settings"), where("participants", "array-contains", user.uid));
        const unsub2 = onSnapshot(q2, (snap) => {
            settingsB = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateState();
        }, (err) => {
            console.error("Collections Settings (Participant) Error:", err);
            setLoading(false);
        });

        return () => { unsub1(); unsub2(); };
    }, [user]);

    // ... handlers (handleTogglePrivacy, handleUpdateImage, handleDeleteCollection) remain the same...

    const handleTogglePrivacy = async (e: React.MouseEvent, collectionName: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user?.uid) return;

        const currentStatus = privacySettings[collectionName] || false;
        const newStatus = !currentStatus;

        // Optimistic UI update
        setPrivacySettings(prev => ({ ...prev, [collectionName]: newStatus }));

        try {
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

            // Sync to all products in this collection with batching (max 500 ops)
            const productsRef = collection(db, "products");
            const q = query(
                productsRef,
                where("userId", "==", user.uid),
                where("collection", "==", collectionName)
            );
            const snapshot = await getDocs(q);

            // Chunk updates into batches of 450 (safe margin below 500)
            const CHUNK_SIZE = 450;
            const chunks = [];
            for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
                chunks.push(snapshot.docs.slice(i, i + CHUNK_SIZE));
            }

            console.log(`Syncing privacy for ${snapshot.size} products in ${chunks.length} batches.`);

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach((doc) => {
                    batch.update(doc.ref, { isPublic: newStatus });
                });
                await batch.commit();
            }

            console.log(`Privacy for ${collectionName} set to ${newStatus}`);
        } catch (err) {
            console.error("Error toggling privacy:", err);
            setPrivacySettings(prev => ({ ...prev, [collectionName]: currentStatus }));
            alert("Failed to update privacy settings.");
        }
    };

    const handleUpdateImage = async (file: File, collectionName: string) => {
        if (!user) return;

        try {
            const safeName = collectionName.replace(/[^a-zA-Z0-9-_]/g, '');
            const storagePath = `collection-covers/${user.uid}/${safeName}_${Date.now()}`;
            const storageRef = ref(storage, storagePath);

            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

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
            throw error;
        }
    };


    const handleDeleteCollection = async (e: React.MouseEvent, collectionName: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            alert("Please login to perform this action.");
            return;
        }

        setTimeout(async () => {
            // START MODIFICATION: Update text to reflect that empty collections can be deleted too
            if (!confirm(`Are you sure you want to delete the collection "${collectionName}"?`)) return;

            try {
                // 1. Update products to be 'Uncategorized' if any
                const q = query(
                    collection(db, "products"),
                    where("userId", "==", user.uid),
                    where("collection", "==", collectionName)
                );

                const snapshot = await getDocs(q);
                const batch = writeBatch(db);

                snapshot.docs.forEach((doc) => {
                    batch.update(doc.ref, { collection: deleteField() });
                });

                // 2. Delete the collection setting document
                // This removes it from the list of "created" collections
                const safeNameId = typeof window !== 'undefined'
                    ? btoa(unescape(encodeURIComponent(collectionName))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                    : collectionName;
                const settingRef = doc(db, "collection_settings", `${user.uid}_${safeNameId}`);
                batch.delete(settingRef);

                await batch.commit();
                console.log("Collection deleted successfully.");
                alert(`Collection "${collectionName}" deleted.`);
            } catch (error) {
                console.error("Error deleting collection:", error);
                alert("Failed to delete collection.");
            }
        }, 50);
    };

    // MERGING LOGIC: Combine existing collections from products with created collections from settings
    const allCollectionNames = new Set([
        ...Object.keys(collectionsMap),
        ...Array.from(availableCollectionNames)
    ]);

    // Sort logic needs to handle 'Uncategorized' separately?
    // collectionsList is now an array of strings (names)
    const sortedCollections = Array.from(allCollectionNames).sort((a, b) => {
        if (a === 'Uncategorized') return 1; // Put at end
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });

    return (
        <DashboardShell collections={Array.from(allCollectionNames)}>
            <div className="space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] mb-2">Your Collections</h1>
                        <p className="text-muted-foreground">
                            Organize your items into folders.
                        </p>
                    </div>
                    <Link href="/collections/create" className="bg-primary text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-glow hover:shadow-glow-lg">
                        <Plus size={20} />
                        <span className="hidden sm:inline">Create Collection</span>
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : sortedCollections.length === 0 ? (
                    <div className="text-center py-20 bg-surface/50 rounded-3xl border border-surfaceHighlight">
                        <div className="w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                            <Folder size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">No collections yet</h3>
                        <p className="text-muted-foreground mb-6">Create your first collection to start organizing.</p>
                        <Link href="/collections/create" className="inline-flex items-center gap-2 bg-surfaceHighlight hover:bg-primary hover:text-black text-[var(--text-main)] px-6 py-3 rounded-xl font-bold transition-all">
                            <Plus size={20} />
                            Create Collection
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {sortedCollections.map((name) => {
                            const count = collectionsMap[name] || 0;
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
                                    image={collectionImages[name] || collectionFirstImages[name]} // Prefer explicit setting, fallback to first product image
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
