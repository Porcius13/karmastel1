"use client";

import React, { useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { FolderHeart, Plus } from 'lucide-react';
import Link from 'next/link';

export default function CollectionsPage() {
    // Mock Data
    const collections = [
        { title: 'Living Room Setup', count: 12, slug: 'living-room-setup', color: 'bg-primary' },
        { title: 'Tech Essentials', count: 8, slug: 'tech-essentials', color: 'bg-blue-400' },
        { title: 'Summer Wardrobe', count: 5, slug: 'summer-wardrobe', color: 'bg-rose-400' },
    ];

    return (
        <DashboardShell>
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Collections</h1>
                        <p className="text-muted-foreground">Organize your wishlist into curated lists.</p>
                    </div>
                    <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/5 text-white font-bold hover:bg-white/10 transition-colors">
                        <Plus size={20} />
                        <span>New Collection</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map(col => (
                        <Link key={col.slug} href={`/collections/${col.slug}`} className="group relative bg-surface border border-surfaceHighlight rounded-3xl overflow-hidden aspect-[4/3] flex flex-col items-center justify-center hover:border-primary/50 transition-all">
                            <div className={`w-20 h-20 ${col.color} rounded-full flex items-center justify-center text-black mb-4 group-hover:scale-110 transition-transform shadow-xl`}>
                                <FolderHeart size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">{col.title}</h2>
                            <p className="text-muted-foreground font-medium">{col.count} Items</p>
                        </Link>
                    ))}
                </div>
            </div>
        </DashboardShell>
    );
}
