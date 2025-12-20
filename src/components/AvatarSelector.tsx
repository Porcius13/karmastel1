"use client";

import Image from "next/image";
import { AVATAR_OPTIONS } from "@/lib/constants";
import { X, Check } from "lucide-react";

interface AvatarSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
    currentAvatar?: string | null;
}

export function AvatarSelector({ isOpen, onClose, onSelect, currentAvatar }: AvatarSelectorProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface border border-surfaceHighlight rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-xl font-bold text-foreground">Choose an Avatar</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-surface-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {AVATAR_OPTIONS.map((url, index) => (
                        <button
                            key={index}
                            onClick={() => onSelect(url)}
                            className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${currentAvatar === url
                                ? "border-primary ring-2 ring-primary/30"
                                : "border-transparent hover:border-surfaceHighlight"
                                }`}
                        >
                            <Image
                                src={url}
                                alt={`Avatar ${index + 1}`}
                                width={80}
                                height={80}
                                unoptimized
                                className="w-full h-full object-cover bg-surface-secondary"
                            />
                            {currentAvatar === url && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                    <Check className="text-primary font-bold drop-shadow-md" size={24} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
                <div className="p-4 bg-surface-secondary/30 text-center text-xs text-muted-foreground">
                    Powered by DiceBear
                </div>
            </div>
        </div>
    );
}
