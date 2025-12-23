"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SocialService } from '@/lib/social-service';
import { DashboardShell } from '@/components/DashboardShell';
import { Bookmark, Compass, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export default function SavedCollectionsPage() {
    const { user } = useAuth();
    const [savedCollections, setSavedCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const loadSaved = async () => {
            try {
                const saved = await SocialService.getSavedCollections(user.uid);

                // Hydrate with counts and preview images if possible
                const hydrated = await Promise.all(saved.map(async (item: any) => {
                    try {
                        const productsRef = collection(db, "products");
                        const q = query(
                            productsRef,
                            where("userId", "==", item.ownerId),
                            where("collection", "==", item.collectionName),
                            limit(1)
                        );
                        const snap = await getDocs(q);
                        const previewImage = snap.empty ? null : snap.docs[0].data().image;

                        return {
                            ...item,
                            previewImage
                        };
                    } catch (e) {
                        return item;
                    }
                }));

                setSavedCollections(hydrated);
            } catch (error) {
                console.error("Error loading saved collections", error);
            } finally {
                setLoading(false);
            }
        };

        loadSaved();
    }, [user]);

    return (
        <DashboardShell>
            <div className="space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] mb-2">Saved Collections</h1>
                        <p className="text-muted-foreground">
                            Collections you've saved from other curators.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : savedCollections.length === 0 ? (
                    <div className="text-center py-20 bg-surface/50 rounded-3xl border border-surfaceHighlight">
                        <div className="w-20 h-20 bg-surfaceHighlight rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
                            <Bookmark size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">No saved collections</h3>
                        <p className="text-muted-foreground mb-8">Discover interesting collections and save them here.</p>
                        <Link href="/discover" className="inline-flex items-center gap-2 bg-primary text-black px-8 py-3 rounded-xl font-bold hover:shadow-glow transition-all">
                            <Compass size={20} />
                            Explore Discover
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {savedCollections.map((col) => (
                            <Link
                                href={`/collection/${col.collectionId}`}
                                key={col.id}
                                className="group relative aspect-[4/5] bg-surface border border-surfaceHighlight rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300"
                            >
                                {/* Preview Image */}
                                {col.previewImage ? (
                                    <div className="absolute inset-0">
                                        <Image
                                            src={col.previewImage}
                                            alt={col.collectionName}
                                            fill
                                            className="object-cover opacity-50 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500"
                                            unoptimized
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-surfaceHighlight/20">
                                        <Bookmark size={48} className="text-muted-foreground/30" />
                                    </div>
                                )}

                                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors leading-tight">
                                            {col.collectionName}
                                        </h3>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="flex items-center gap-2 text-white/70 text-sm font-medium">
                                                <User size={14} />
                                                Saved List
                                            </span>
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                                <ArrowRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
