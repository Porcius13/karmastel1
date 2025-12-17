"use client";

import React from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { Archive } from 'lucide-react';

export default function ArchivedPage() {
    return (
        <DashboardShell>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="w-24 h-24 bg-surfaceHighlight/30 rounded-full flex items-center justify-center text-muted-foreground">
                    <Archive size={48} />
                </div>
                <div className="space-y-2 max-w-md">
                    <h1 className="text-3xl font-black text-white">Archive</h1>
                    <p className="text-muted-foreground text-lg">
                        Old items that you no longer track but want to remember are stored here.
                    </p>
                </div>
            </div>
        </DashboardShell>
    );
}
