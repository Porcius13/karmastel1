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
    image?: string;
    onUpdateImage?: (file: File, name: string) => Promise<void>;
}


export function CollectionCard({ name, count, isPublic, shareId, onDelete, onTogglePrivacy, allowDelete = true, image, onUpdateImage }: CollectionCardProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = React.useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onUpdateImage) {
            try {
                setIsUploading(true);
                await onUpdateImage(file, name);
            } catch (error) {
                console.error("Upload failed", error);
                alert("Failed to upload image.");
            } finally {
                setIsUploading(false);
            }
        }
    };

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
                className="block w-full h-full bg-surface border border-surface-highlight p-6 rounded-2xl hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary/5 flex flex-col items-center justify-center text-center relative overflow-hidden group"
            >
                {/* Background Image */}
                {image && (
                    <div className="absolute inset-0 z-0">
                        <img
                            src={image}
                            alt={name}
                            className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    </div>
                )}

                <div className="relative z-10 flex flex-col items-center">
                    {!image && (
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform backdrop-blur-sm">
                            <Folder size={32} />
                        </div>
                    )}
                    <h3 className="font-bold text-foreground text-xl mb-1 group-hover:text-primary transition-colors flex items-center gap-2 justify-center drop-shadow-md">
                        {name}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium drop-shadow-md">{count} items</p>
                </div>




                {/* Privacy Badge */}
                <div className="absolute top-4 left-4 z-20">

                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onTogglePrivacy(e, name);
                        }}
                        className={`p-2 rounded-full transition-colors ${isPublic ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-surface-highlight text-muted-foreground hover:bg-surface-highlight/80'}`}
                        title={isPublic ? "Public (Click to make Private)" : "Private (Click to make Public)"}
                    >
                        {isPublic ? <Globe size={16} /> : <Lock size={16} />}
                    </button>
                </div>
            </Link>

            <div className="absolute top-3 right-3 z-20 flex gap-2">
                {isPublic && (
                    <button
                        onClick={handleShare}
                        className="p-2 bg-surface-highlight hover:bg-primary hover:text-white rounded-full text-muted-foreground transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer active:scale-95"
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
                        className="p-2 bg-surface-highlight hover:bg-danger hover:text-white rounded-full text-muted-foreground transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer active:scale-95"
                        title="Delete Collection"
                    >
                        <Trash2 size={16} />
                    </button>
                )}

                {/* Camera / Upload Button (Temporarily Disabled) */}
                {/* {onUpdateImage && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                        className="p-2 bg-surfaceHighlight hover:bg-blue-500 hover:text-white rounded-full text-muted-foreground transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer active:scale-95"
                        title="Change Cover Image"
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined text-[16px] leading-none">photo_camera</span>
                        )}
                    </button>
                )} */}

            </div>
            {/* Upload Input - Moved outside Link to prevent bubbling */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />
        </div>
    );
}
