"use client";

import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface EditProductModalProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
    collections: string[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ product, isOpen, onClose, collections }) => {
    const [title, setTitle] = useState(product.title);
    const [collection, setCollection] = useState(product.collection || 'Uncategorized');
    const [targetPrice, setTargetPrice] = useState(product.targetPrice || '');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const productRef = doc(db, "products", product.id);
            await updateDoc(productRef, {
                title,
                collection,
                targetPrice: targetPrice ? Number(targetPrice) : null
            });
            onClose();
        } catch (error) {
            console.error("Error updating product:", error);
            alert("Failed to update product.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-surface border border-surfaceHighlight rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-surfaceHighlight flex items-center justify-between bg-surface">
                    <h3 className="text-lg font-bold text-white">Edit Product</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">

                    {/* Title Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                        />
                    </div>

                    {/* Collection Select */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collection</label>
                        <select
                            value={collection}
                            onChange={(e) => setCollection(e.target.value)}
                            className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="Uncategorized">Uncategorized</option>
                            {collections.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Target Price Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Price (TL)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={targetPrice}
                                onChange={(e) => setTargetPrice(e.target.value)}
                                placeholder="Enter desired price..."
                                className="w-full bg-[#1e3628] border border-primary/20 rounded-lg px-4 py-2 text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                <span className="text-primary font-bold text-sm">₺</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            We will notify you when the price drops below this amount.
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-background/50 border-t border-surfaceHighlight flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white hover:bg-surfaceHighlight rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-bold bg-primary text-black rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
};
