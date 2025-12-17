"use client";

import React from 'react';
import Link from 'next/link';
import { Folder, Trash2, Globe, Lock, Share2 } from 'lucide-react';

interface CollectionCardProps {
    name: string;
    count: number;
    isPublic: boolean;
    shareId: string;
    onDelete: (e: React.MouseEvent, name: string) => void;
    onTogglePrivacy: (e: React.MouseEvent, name: string) => void;
    allowDelete?: boolean;
}

export function CollectionCard({ name, count, isPublic, shareId, onDelete, onTogglePrivacy, allowDelete = true }: CollectionCardProps) {
    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Construct public URL. Format: /share/shareId
        const url = `${window.location.origin}/share/${shareId}`;
        navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
    };

    return (
        <div className="relative group aspect-square">
            <Link
                href={`/collections/${encodeURIComponent(name)}`}
                className="block w-full h-full bg-surface border border-surfaceHighlight p-6 rounded-2xl hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary/5 flex flex-col items-center justify-center text-center"
            >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                    <Folder size={32} />
                </div>
                <h3 className="font-bold text-[var(--text-main)] text-xl mb-1 group-hover:text-primary transition-colors flex items-center gap-2 justify-center">
                    {name}
                </h3>
                <p className="text-sm text-muted-foreground font-medium">{count} items</p>

                {/* Privacy Badge */}
                <div className="absolute top-4 left-4">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onTogglePrivacy(e, name);
                        }}
                        className={`p-2 rounded-full transition-colors ${isPublic ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-surfaceHighlight text-muted-foreground hover:bg-surfaceHighlight/80'}`}
                        title={isPublic ? "Public (Click to make Private)" : "Private (Click to make Public)"}
                    >
                        {isPublic ? <Globe size={16} /> : <Lock size={16} />}
                    </button>
                </div>
            </Link>

            <div className="absolute top-3 right-3 z-20 flex gap-2">
                {isPublic && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${window.location.origin}/share/${name}`); // Placeholder, logic will be improved
                            alert("Link copied to clipboard!");
                        }}
                        className="p-2 bg-surfaceHighlight hover:bg-primary hover:text-white rounded-full text-muted-foreground transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer active:scale-95"
                        title="Copy Share Link"
                    >
                        <Share2 size={16} />
                    </button>
                )}

                {allowDelete && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(e, name);
                        }}
                        className="p-2 bg-surfaceHighlight hover:bg-danger hover:text-white rounded-full text-muted-foreground transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer active:scale-95"
                        title="Delete Collection"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
