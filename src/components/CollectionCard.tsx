"use client";

import React from 'react';
import Link from 'next/link';
import { Folder, Trash2 } from 'lucide-react';

interface CollectionCardProps {
    name: string;
    count: number;
    onDelete: (e: React.MouseEvent, name: string) => void;
    allowDelete?: boolean;
}

export function CollectionCard({ name, count, onDelete, allowDelete = true }: CollectionCardProps) {
    return (
        <div className="relative group aspect-square">
            <Link
                href={`/collections/${encodeURIComponent(name)}`}
                className="block w-full h-full bg-surface border border-surfaceHighlight p-6 rounded-2xl hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary/5 flex flex-col items-center justify-center text-center"
            >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                    <Folder size={32} />
                </div>
                <h3 className="font-bold text-[var(--text-main)] text-xl mb-1 group-hover:text-primary transition-colors">{name}</h3>
                <p className="text-sm text-muted-foreground font-medium">{count} items</p>
            </Link>

            {allowDelete && (
                <div className="absolute top-3 right-3 z-20">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Delete button clicked in CollectionCard for:", name);
                            onDelete(e, name);
                        }}
                        className="p-2 bg-surfaceHighlight hover:bg-danger hover:text-white rounded-full text-muted-foreground transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer active:scale-95"
                        title="Delete Collection"
                        type="button"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
