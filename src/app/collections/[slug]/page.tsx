"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { DashboardShell } from '@/components/DashboardShell';
import { SmartProductCard } from '@/components/SmartProductCard';
import {
    Infinity as InfinityIcon,
    BarChart3,
    Edit2,
    Share2,
    Plus,
    ChevronDown,
    LayoutGrid,
    List,
    Search,
    Filter
} from 'lucide-react';

export default function CollectionDetailPage() {
    const { slug } = useParams();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Fetch Products (Simulating collection filtering by fetching all for now)
    useEffect(() => {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    inStock: data.inStock !== false,
                    priceHistory: data.priceHistory || []
                };
            });
            setProducts(items);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [slug]);

    // Calculate Total Value
    const totalValue = products.reduce((acc, curr) => {
        const price = typeof curr.price === 'number' ? curr.price : parseFloat(curr.price) || 0;
        return acc + price;
    }, 0);

    // Formatted Slug Title
    const title = typeof slug === 'string'
        ? slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        : 'Collection';

    return (
        <DashboardShell>
            <div className="space-y-8 pb-20">

                {/* HERO SECTION */}
                <div className="relative">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-surface border border-surfaceHighlight px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                    Public Collection
                                </div>
                                <div className="flex items-center gap-2 bg-surface border border-primary px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-sm">
                                    <InfinityIcon size={14} className="text-primary" />
                                    <span>Total: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalValue)}</span>
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[0.9]">
                                {title}
                                <span className="text-primary">.</span>
                            </h1>

                            <p className="max-w-xl text-muted-foreground text-lg leading-relaxed">
                                A curated selection of items for the {title.toLowerCase()}. Tracks price drops and stock status automatically.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface border border-surfaceHighlight text-white hover:bg-surfaceHighlight transition-colors font-medium">
                                <Share2 size={18} />
                                <span>Share</span>
                            </button>
                            <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface border border-surfaceHighlight text-white hover:bg-surfaceHighlight transition-colors font-medium">
                                <Edit2 size={18} />
                                <span>Edit</span>
                            </button>
                            <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-transform hover:scale-[1.02] shadow-lg shadow-primary/20">
                                <Plus size={20} />
                                <span>Add Item</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* STICKY FILTER BAR */}
                <div className="sticky top-20 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-background/80 backdrop-blur-xl border-y border-surfaceHighlight/50">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                        {/* Left: Search & Filter */}
                        <div className="w-full md:w-auto flex items-center gap-3">
                            <div className="relative group flex-1 md:w-80">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-white transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Filter items..."
                                    className="w-full bg-surface border border-transparent focus:border-surfaceHighlight rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-muted-foreground focus:outline-none transition-all"
                                />
                            </div>
                            <button className="p-2.5 bg-surface rounded-xl text-muted-foreground hover:text-white hover:bg-surfaceHighlight transition-colors border border-transparent hover:border-surfaceHighlight">
                                <Filter size={18} />
                            </button>
                        </div>

                        {/* Right: Sort & View */}
                        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Sort by:</span>
                                <button className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors">
                                    Date Added <ChevronDown size={14} />
                                </button>
                            </div>

                            <div className="h-8 w-px bg-surfaceHighlight/50"></div>

                            <div className="flex bg-surface rounded-lg p-1 border border-surfaceHighlight/50">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-surfaceHighlight text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                                >
                                    <LayoutGrid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-surfaceHighlight text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTENT GRID */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className={`
                ${viewMode === 'grid'
                            ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6'
                            : 'grid grid-cols-1 gap-4'
                        }
            `}>
                        {products.map((product) => (
                            <SmartProductCard key={product.id} product={product} />
                        ))}

                        {/* Add New Item Placeholder Card used as "Last Item" */}
                        {viewMode === 'grid' && (
                            <div className="break-inside-avoid relative aspect-[4/5] bg-surface/30 border-2 border-dashed border-surfaceHighlight rounded-3xl flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-white hover:border-primary hover:bg-surfaceHighlight/10 transition-all group cursor-pointer">
                                <div className="w-16 h-16 rounded-full bg-surface border border-surfaceHighlight flex items-center justify-center group-hover:scale-110 group-hover:border-primary transition-all shadow-xl">
                                    <Plus size={32} className="group-hover:text-primary transition-colors" />
                                </div>
                                <span className="font-medium">Add to Collection</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
