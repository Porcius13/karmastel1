"use client";

import React from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { Heart } from 'lucide-react';

export default function FavoritesPage() {
    return (
        <DashboardShell>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="w-24 h-24 bg-surfaceHighlight/30 rounded-full flex items-center justify-center text-primary animate-pulse">
                    <Heart size={48} fill="currentColor" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h1 className="text-3xl font-black text-white">Your Favorites</h1>
                    <p className="text-muted-foreground text-lg">
                        Items you mark as favorites will appear here. Start curating your list!
                    </p>
                </div>
                <button className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white font-medium transition-colors">
                    Explore Items
                </button>
            </div>
        </DashboardShell>
    );
}
