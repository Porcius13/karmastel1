"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardShell } from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, FolderPlus, Lock, Globe } from 'lucide-react';
import Link from 'next/link';

export default function CreateCollectionPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;

        setLoading(true);

        try {
            // Generate safe ID logic: UID_Base64Name
            const safeNameId = btoa(unescape(encodeURIComponent(name.trim())))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const docRef = doc(db, "collection_settings", `${user.uid}_${safeNameId}`);

            await setDoc(docRef, {
                userId: user.uid,
                name: name.trim(),
                coverImage: coverImage.trim() || null,
                isPublic: isPublic,
                createdAt: new Date(),
                updatedAt: new Date()
            }, { merge: true });

            router.push('/collections');
        } catch (error) {
            console.error("Error creating collection:", error);
            alert("Failed to create collection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardShell>
            <div className="max-w-2xl mx-auto pb-20 pt-10">
                <Link href="/collections" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8">
                    <ArrowLeft size={20} />
                    <span>Back to Collections</span>
                </Link>

                <div className="bg-surface border border-surfaceHighlight rounded-3xl p-8 shadow-xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                            <FolderPlus size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white">Create Collection</h1>
                            <p className="text-muted-foreground">Organize your wishlist items.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2">
                                Collection Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-background border border-surfaceHighlight rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30"
                                placeholder="e.g., Summer Outfits, Tech Setup..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2">
                                Cover Image URL (Optional)
                            </label>
                            <input
                                type="url"
                                value={coverImage}
                                onChange={(e) => setCoverImage(e.target.value)}
                                className="w-full bg-background border border-surfaceHighlight rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30"
                                placeholder="https://images.unsplash.com/..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2">
                                Privacy Setting
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(false)}
                                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${!isPublic
                                        ? 'border-primary bg-primary/10 text-white'
                                        : 'border-surfaceHighlight bg-background text-muted-foreground hover:border-surfaceHighlight/80'
                                        }`}
                                >
                                    <Lock size={24} />
                                    <span className="font-bold text-sm">Private</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(true)}
                                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${isPublic
                                        ? 'border-primary bg-primary/10 text-white'
                                        : 'border-surfaceHighlight bg-background text-muted-foreground hover:border-surfaceHighlight/80'
                                        }`}
                                >
                                    <Globe size={24} />
                                    <span className="font-bold text-sm">Public</span>
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 text-center">
                                {isPublic
                                    ? "Anyone with the link can view this collection."
                                    : "Only you can see this collection."}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-black font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? "Creating..." : "Create Collection"}
                        </button>
                    </form>
                </div>
            </div>
        </DashboardShell>
    );
}
