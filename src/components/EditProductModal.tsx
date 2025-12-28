"use client";

import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface EditProductModalProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
    collections: string[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ product, isOpen, onClose, collections }) => {
    const { t } = useLanguage();
    const [title, setTitle] = useState(product.title);
    const [collection, setCollection] = useState(product.collection || t('edit_modal.uncategorized'));
    const [targetPrice, setTargetPrice] = useState(product.targetPrice || '');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const productRef = doc(db, "products", product.id);
            await updateDoc(productRef, {
                title,
                collection: collection === t('edit_modal.uncategorized') ? null : collection, // Convert back to null
                targetPrice: targetPrice ? Number(targetPrice) : null
            });

            // Auto-Set Collection Cover & Sync Public Status (Client-Side)
            if (collection && collection !== t('edit_modal.uncategorized')) {
                try {
                    // 1. Generate ID
                    const safeName = typeof window !== 'undefined'
                        ? btoa(unescape(encodeURIComponent(collection))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                        : collection;
                    const settingsId = `${product.userId}_${safeName}`;

                    // 2. Check Existance
                    const { getDoc, setDoc, doc } = await import("firebase/firestore");
                    const settingsRef = doc(db, "collection_settings", settingsId);
                    const settingsDoc = await getDoc(settingsRef);

                    let isPublic = false;

                    if (settingsDoc.exists()) {
                        isPublic = settingsDoc.data().isPublic || false;
                    }

                    // A. Update the product's isPublic status to match collection
                    await updateDoc(productRef, {
                        isPublic: isPublic
                    });

                    // B. Auto-Set Cover Image if missing
                    if (product.image && (!settingsDoc.exists() || !settingsDoc.data().image)) {
                        await setDoc(settingsRef, {
                            userId: product.userId,
                            name: collection,
                            image: product.image,
                            updatedAt: new Date(),
                            isPublic: isPublic
                        }, { merge: true });
                        console.log("Auto-set cover image for edited collection");
                    }
                } catch (err) {
                    console.error("Failed to auto-set cover or sync privacy:", err);
                }
            } else {
                // If moving to Uncategorized or clearing collection, set isPublic to false (default safety)
                await updateDoc(productRef, {
                    isPublic: false
                });
            }

            onClose();
        } catch (error) {
            console.error("Error updating product:", error);
            alert(t('edit_modal.update_error'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-surface border border-surfaceHighlight rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-surfaceHighlight flex items-center justify-between bg-surface">
                    <h3 className="text-lg font-bold text-white">{t('edit_modal.title')}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">

                    {/* Title Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('edit_modal.product_title')}</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                        />
                    </div>

                    {/* Collection Select */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('edit_modal.collection')}</label>
                        <select
                            value={collection}
                            onChange={(e) => setCollection(e.target.value)}
                            className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value={t('edit_modal.uncategorized')}>{t('edit_modal.uncategorized')}</option>
                            {collections.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Target Price Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('edit_modal.target_price_label')}</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={targetPrice}
                                onChange={(e) => setTargetPrice(e.target.value)}
                                placeholder={t('edit_modal.target_price_placeholder')}
                                className="w-full bg-surface border border-primary/20 rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                <span className="text-primary font-bold text-sm">₺</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            {t('edit_modal.target_price_hint')}
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-background/50 border-t border-surfaceHighlight flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white hover:bg-surfaceHighlight rounded-lg transition-colors"
                    >
                        {t('common.cancel')}
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
                        {t('edit_modal.save_changes')}
                    </button>
                </div>

            </div>
        </div>
    );
};
