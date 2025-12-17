"use client";

import React from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { ShoppingBag } from 'lucide-react';

export default function PurchasedPage() {
    return (
        <DashboardShell>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="w-24 h-24 bg-surfaceHighlight/30 rounded-full flex items-center justify-center text-green-400">
                    <ShoppingBag size={48} />
                </div>
                <div className="space-y-2 max-w-md">
                    <h1 className="text-3xl font-black text-white">Purchased Items</h1>
                    <p className="text-muted-foreground text-lg">
                        Keep track of everything you've bought. Your purchase history will live here.
                    </p>
                </div>
            </div>
        </DashboardShell>
    );
}
