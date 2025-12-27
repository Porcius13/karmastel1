"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from '@/context/AuthContext';
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
    FolderPlus,
    FolderMinus,
    Plus
} from 'lucide-react';

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [collections, setCollections] = useState<string[]>([]);
    const [collectionDropdownPos, setCollectionDropdownPos] = useState<{ x: number, y: number } | null>(null);

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
                console.log("No such document!");
            }
            setLoading(false);
        };
        fetchProduct();
    }, [id]);

    const { user } = useAuth();

    // Fetch Collections
    useEffect(() => {
        if (!user) return;

        let colsA: string[] = [];
        let colsB: string[] = [];

        const updateState = () => {
            const allCols = Array.from(new Set([...colsA, ...colsB])).sort();
            setCollections(allCols);
        };

        const q1 = query(collection(db, "collection_settings"), where("userId", "==", user.uid));
        const unsub1 = onSnapshot(q1, (snap) => {
            colsA = snap.docs.map(doc => doc.data().name);
            updateState();
        }, (err) => console.error("Product Detail Collections (Owner) Error:", err));

        const q2 = query(collection(db, "collection_settings"), where("participants", "array-contains", user.uid));
        const unsub2 = onSnapshot(q2, (snap) => {
            colsB = snap.docs.map(doc => doc.data().name);
            updateState();
        }, (err) => console.error("Product Detail Collections (Participant) Error:", err));

        return () => { unsub1(); unsub2(); };
    }, [user]);

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

    const handleAddToCollection = async (newCollection: string) => {
        if (!product || !newCollection || newCollection === product.collection) return;
        setCollectionDropdownPos(null);

        try {
            const { addDoc, collection: fireCollection, serverTimestamp } = await import("firebase/firestore");
            const newProductData = {
                ...product,
                collection: newCollection,
                originalSourceId: product.id,
                createdAt: new Date().toISOString(),
                updatedAt: serverTimestamp()
            };
            const { id: _, ...dataToSave } = newProductData;
            await addDoc(fireCollection(db, "products"), dataToSave);
            alert(`Product added to ${newCollection}!`);
        } catch (e) {
            console.error("Error adding to collection", e);
            alert("Failed to add to collection.");
        }
    };

    const handleRemoveFromCollection = async () => {
        if (!product || !product.collection || product.collection === 'Uncategorized') return;
        if (!confirm(`Bu ürünü "${product.collection}" koleksiyonundan çıkarmak istediğinize emin misiniz?`)) return;

        try {
            const { deleteDoc, doc: fireDoc, updateDoc: fireUpdate } = await import("firebase/firestore");

            if (product.originalSourceId) {
                await deleteDoc(fireDoc(db, "products", product.id));
                router.push('/dashboard');
            } else {
                const docRef = fireDoc(db, "products", product.id);
                await fireUpdate(docRef, {
                    collection: null,
                    updatedAt: new Date().toISOString()
                });
                setProduct({ ...product, collection: null });
            }
            alert("Ürün koleksiyondan çıkarıldı.");
        } catch (e) {
            console.error("Error removing from collection", e);
            alert("İşlem başarısız oldu.");
        }
    };

    const handleShare = async () => {
        if (!product) return;

        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({
                    title: product.title,
                    text: `Bu ürüne bir bak: ${product.title}`,
                    url: window.location.href,
                });
            } else {
                // Fallback to clipboard
                await navigator.clipboard.writeText(window.location.href);
                alert("Ürün linki kopyalandı!");
            }
        } catch (e) {
            console.warn("Share failed or cancelled", e);
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
                                src={product.image?.startsWith('http://') ? product.image.replace('http://', 'https://') : (product.image || "https://placehold.co/600x600?text=No+Image")}
                                alt={product.title}
                                fill
                                className={`object-cover transition-transform duration-700 group-hover:scale-105 ${!product.inStock && 'grayscale opacity-75'}`}
                                sizes="(max-width: 768px) 100vw, 50vw"
                                priority
                                unoptimized
                                referrerPolicy="no-referrer"
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

                            <div className="relative group/collection">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setCollectionDropdownPos(collectionDropdownPos ? null : { x: rect.left, y: rect.bottom + 8 });
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-surface text-[var(--text-main)] border border-surfaceHighlight hover:bg-surfaceHighlight p-4 rounded-xl font-medium transition-all"
                                >
                                    <FolderPlus size={20} />
                                    <span>Collection</span>
                                </button>
                            </div>

                            {product.collection && product.collection !== 'Uncategorized' && (
                                <button
                                    onClick={handleRemoveFromCollection}
                                    className="flex items-center justify-center gap-2 bg-surface text-orange-500 border border-surfaceHighlight hover:bg-orange-500/10 p-4 rounded-xl font-medium transition-all"
                                >
                                    <FolderMinus size={20} />
                                    <span>Remove</span>
                                </button>
                            )}

                            <button
                                onClick={handleShare}
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
                                productId={product.id}
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
            {/* Collection Dropdown */}
            {collectionDropdownPos && (
                <>
                    <div className="fixed inset-0 z-[60] bg-transparent" onClick={() => setCollectionDropdownPos(null)} />
                    <div
                        className="fixed w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[70] animate-in fade-in zoom-in-95 duration-200"
                        style={{ top: collectionDropdownPos.y, left: collectionDropdownPos.x }}
                    >
                        <div className="p-2 max-h-48 overflow-y-auto">
                            <div className="text-xs font-semibold text-slate-400 px-2 py-1 mb-1 uppercase tracking-wider">Koleksiyonlar</div>
                            {collections.length > 0 ? (
                                collections.map((col) => (
                                    <button
                                        key={col}
                                        onClick={() => handleAddToCollection(col)}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${product.collection === col ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        {product.collection === col && <CheckCircle2 size={14} />}
                                        <span className="truncate">{col}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="text-xs text-slate-400 px-3 py-2 italic text-center">Koleksiyon yok</div>
                            )}
                        </div>
                        <div className="p-2 border-t border-slate-50 bg-slate-50">
                            <button onClick={() => router.push('/collections/create')} className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700 py-1 flex items-center justify-center gap-1">
                                <Plus size={12} /> Yeni Oluştur
                            </button>
                        </div>
                    </div>
                </>
            )}
        </DashboardShell>
    );
}
