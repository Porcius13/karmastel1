"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { DashboardShell } from '@/components/DashboardShell';
import { PriceChart } from '@/components/PriceChart';
import {
    ExternalLink,
    Share2,
    Edit2,
    Trash2,
    StickyNote,
    LineChart,
    ArrowLeft,
    Bell,
    CheckCircle2,
    AlertCircle,
    Heart,
    FolderPlus
} from 'lucide-react';

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    // Fetch Product Data
    useEffect(() => {
        if (!id) return;
        const fetchProduct = async () => {
            const docRef = doc(db, "products", id as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setProduct({ id: docSnap.id, ...data });
                setNote(data.note || '');
            } else {
                // Handle 404
                console.log("No such document!");
            }
            setLoading(false);
        };
        fetchProduct();
    }, [id]);

    const handleSaveNote = async () => {
        setSavingNote(true);
        try {
            const docRef = doc(db, "products", id as string);
            await updateDoc(docRef, { note });
            // Optional: Toast notification here
        } catch (e) {
            console.error("Error saving note", e);
        }
        setSavingNote(false);
    };

    const handleToggleFavorite = async () => {
        if (!product) return;
        const newStatus = !product.isFavorite;

        // Optimistic update
        setProduct({ ...product, isFavorite: newStatus });

        try {
            const docRef = doc(db, "products", product.id);
            await updateDoc(docRef, { isFavorite: newStatus });
        } catch (e) {
            console.error("Error updating favorite", e);
            // Revert on error
            setProduct({ ...product, isFavorite: !newStatus });
        }
    };

    const handleAddToCollection = async () => {
        if (!product) return;

        const currentCollection = product.collection || '';
        const newCollection = prompt("Enter collection name:", currentCollection);

        if (newCollection !== null && newCollection !== currentCollection) {
            // Optimistic update
            setProduct({ ...product, collection: newCollection });

            try {
                const docRef = doc(db, "products", product.id);
                await updateDoc(docRef, { collection: newCollection });
            } catch (e) {
                console.error("Error updating collection", e);
                setProduct({ ...product, collection: currentCollection });
            }
        }
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this specific item?')) {
            // Implement delete logic here if needed, or redirect
            // await deleteDoc(...)
            router.push('/');
        }
    };

    if (loading) {
        return (
            <DashboardShell>
                <div className="flex items-center justify-center h-full min-h-[500px]">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            </DashboardShell>
        );
    }

    if (!product) return null;

    return (
        <DashboardShell>
            <main className="max-w-7xl mx-auto space-y-6 pb-20">
                {/* Breadcrumb / Back */}
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 rounded-full bg-surface hover:bg-surfaceHighlight text-muted-foreground hover:text-[var(--text-main)] transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-sm font-medium text-muted-foreground">Product Details</h1>
                </div>

                {/* Main Grid: Split Screen */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT: Image & Key Info (lg:col-span-5) */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="group relative w-full aspect-[4/5] md:aspect-square bg-surface rounded-3xl overflow-hidden border border-surfaceHighlight shadow-2xl">
                            <Image
                                src={product.image || "https://placehold.co/600x600?text=No+Image"}
                                alt={product.title}
                                fill
                                className={`object-cover transition-transform duration-700 group-hover:scale-105 ${!product.inStock && 'grayscale opacity-75'}`}
                                sizes="(max-width: 768px) 100vw, 50vw"
                                priority
                            />
                            {!product.inStock && (
                                <div className="absolute top-4 left-4 bg-danger text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-lg">
                                    OUT OF STOCK
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-4">
                            <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="col-span-2 flex items-center justify-center gap-2 bg-primary text-black hover:bg-primary/90 p-4 rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-primary/20"
                            >
                                <ExternalLink size={20} />
                                <span>Go to Store</span>
                            </a>

                            <button
                                onClick={handleToggleFavorite}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl font-medium transition-all border ${product.isFavorite ? 'bg-red-500/10 text-red-500 border-red-500/50' : 'bg-surface text-[var(--text-main)] border-surfaceHighlight hover:bg-surfaceHighlight'}`}
                            >
                                <Heart size={20} fill={product.isFavorite ? "currentColor" : "none"} />
                                <span>Favorite</span>
                            </button>

                            <button
                                onClick={handleAddToCollection}
                                className="flex items-center justify-center gap-2 bg-surface text-[var(--text-main)] border border-surfaceHighlight hover:bg-surfaceHighlight p-4 rounded-xl font-medium transition-all"
                            >
                                <FolderPlus size={20} />
                                <span>Collection</span>
                            </button>

                            <button
                                className="flex items-center justify-center gap-2 bg-surface text-[var(--text-main)] border border-surfaceHighlight hover:bg-surfaceHighlight p-4 rounded-xl font-medium transition-all"
                            >
                                <Share2 size={20} />
                                <span>Share</span>
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: Details & content (lg:col-span-7) */}
                    <div className="lg:col-span-7 space-y-8">

                        {/* Header Info */}
                        <div>
                            <div className="flex items-start justify-between gap-4">
                                <h1 className="text-3xl md:text-4xl font-black text-[var(--text-main)] leading-tight tracking-tight">
                                    {product.title}
                                </h1>
                                <div className="flex gap-2">
                                    <button onClick={() => { }} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                        <Edit2 size={20} />
                                    </button>
                                    <button onClick={handleDelete} className="p-2 text-muted-foreground hover:text-danger transition-colors">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 flex items-baseline gap-3">
                                <span className="text-4xl font-bold text-primary tracking-tight">
                                    {typeof product.price === 'number' ? product.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : product.price}
                                </span>
                                {product.currency && <span className="text-muted-foreground text-lg font-medium">{product.currency}</span>}
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                {product.inStock ? (
                                    <span className="flex items-center gap-1.5 text-success">
                                        <CheckCircle2 size={16} /> In Stock
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-danger">
                                        <AlertCircle size={16} /> Out of Stock
                                    </span>
                                )}
                                <span>•</span>
                                <span>Added {product.createdAt ? new Date(product.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}</span>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="bg-surface rounded-3xl p-6 border border-surfaceHighlight/50">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <LineChart size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-[var(--text-main)]">Price History</h3>
                            </div>

                            {/* Reusing existing PriceChart component */}
                            <PriceChart
                                history={product.priceHistory || []}
                                currentPrice={typeof product.price === 'number' ? product.price : parseFloat(product.price)}
                            />
                        </div>

                        {/* Notes Section */}
                        <div className="bg-surface rounded-3xl p-6 border border-surfaceHighlight/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                        <StickyNote size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text-main)]">Personal Notes</h3>
                                </div>
                                {savingNote && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
                            </div>

                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                onBlur={handleSaveNote}
                                placeholder="Add details about sizing, color preferences, or why you want this..."
                                className="w-full h-32 bg-background rounded-xl border border-surfaceHighlight p-4 text-[var(--text-main)] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none text-sm leading-relaxed"
                            />
                        </div>

                    </div>
                </div>
            </main>
        </DashboardShell>
    );
}
