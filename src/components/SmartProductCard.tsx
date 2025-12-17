import React, { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Bell, TrendingDown, ArrowRight, Trash2, Pencil, CheckCircle2, Heart, FolderPlus } from 'lucide-react';
import { EditProductModal } from './EditProductModal';
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface Product {
    id: string;
    title: string;
    image: string;
    price: string | number;
    url: string;
    inStock: boolean;
    aspect?: string;
    priceHistory?: any[];
    collection?: string;
    targetPrice?: number;
    isFavorite?: boolean;
}

interface SmartProductCardProps {
    product: Product;
    onSetAlarm?: () => void;
    onOpenChart?: () => void;
    onDelete?: () => void;
    collections?: string[]; // Needed for Edit Modal
}

export const SmartProductCard: React.FC<SmartProductCardProps> = ({ product: initialProduct, onSetAlarm, onOpenChart, onDelete, collections = [] }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    // Use local state for optimistic updates
    const [product, setProduct] = useState(initialProduct);

    // Sync local state if prop changes (though for this simple case, direct mapping is often enough, but we want internal mutations)
    // Actually, usually we rely on parent to re-render, but for optimistic updates without parent handler, we need local state.
    // Ideally we should sync back up or just rely on re-fetch, but let's do local + firestore.

    const handleToggleFavorite = async () => {
        const newStatus = !product.isFavorite;
        // Optimistic update
        setProduct((prev) => ({ ...prev, isFavorite: newStatus }));

        try {
            const docRef = doc(db, "products", product.id);
            await updateDoc(docRef, { isFavorite: newStatus });
        } catch (e) {
            console.error("Error updating favorite", e);
            // Revert
            setProduct((prev) => ({ ...prev, isFavorite: !newStatus }));
        }
    };

    const handleAddToCollection = async () => {
        const currentCollection = product.collection || '';
        const newCollection = prompt("Hangi koleksiyona eklemek istersiniz?", currentCollection);

        if (newCollection !== null && newCollection !== currentCollection) {
            // Optimistic update
            setProduct((prev) => ({ ...prev, collection: newCollection }));
            try {
                const docRef = doc(db, "products", product.id);
                await updateDoc(docRef, { collection: newCollection });
            } catch (e) {
                console.error("Error updating collection", e);
                setProduct((prev) => ({ ...prev, collection: currentCollection }));
            }
        }
    };

    // Format Price
    const numericPrice = typeof product.price === 'string'
        ? parseFloat(product.price.replace(/[^0-9,.-]/g, '').replace(',', '.'))
        : product.price;

    const formattedPrice = typeof numericPrice === 'number'
        ? numericPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
        : product.price;

    // Check Badge Logic
    const isTargetMet = product.targetPrice && numericPrice && numericPrice <= product.targetPrice;

    return (
        <>
            <div className="break-inside-avoid group relative flex flex-col mb-6">
                {/* Image Container */}
                <div className={`
                    relative w-full overflow-hidden rounded-2xl bg-surface shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:shadow-primary/10
                    ${product.aspect || 'aspect-square'}
                `}>
                    <Link href={`/product/${product.id}`} className="block h-full cursor-pointer">
                        <img
                            alt={product.title}
                            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${!product.inStock ? 'grayscale opacity-60' : ''}`}
                            src={product.image || "https://placehold.co/600x600?text=No+Image"}
                            loading="lazy"
                            onError={(e) => (e.currentTarget.src = "https://placehold.co/600x600?text=No+Image")}
                        />
                    </Link>

                    {/* Overlay & Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px] pointer-events-none">

                        {/* Edit Button */}
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="bg-white text-black p-3 rounded-full transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:bg-black hover:text-white hover:scale-110 shadow-lg pointer-events-auto"
                            title="Düzenle"
                        >
                            <Pencil size={18} />
                        </button>

                        {product.inStock ? (
                            <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-black p-3 rounded-full transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:scale-110 shadow-lg pointer-events-auto delay-75"
                                title="Ürüne Git"
                            >
                                <ExternalLink size={20} />
                            </a>
                        ) : (
                            <button
                                onClick={onSetAlarm}
                                className="bg-surfaceHighlight text-[var(--text-main)] p-3 rounded-full transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:bg-danger hover:scale-110 shadow-lg pointer-events-auto delay-75"
                                title="Stok Alarmı Kur"
                            >
                                <Bell size={20} />
                            </button>
                        )}

                        {/* Analysis/Chart Button - Centered */}
                        <button
                            onClick={onOpenChart}
                            className="bg-white text-black p-3 rounded-full transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:scale-110 shadow-lg delay-100 pointer-events-auto"
                            title="Fiyat Analizi"
                        >
                            <TrendingDown size={20} />
                        </button>

                        {/* Favorite Button - Bottom Right */}
                        <button
                            onClick={handleToggleFavorite}
                            className={`absolute bottom-4 right-4 bg-white p-3 rounded-full transition-all duration-300 hover:scale-110 shadow-lg pointer-events-auto ${product.isFavorite ? 'text-red-500 hover:bg-red-50' : 'text-black hover:bg-red-50 hover:text-red-500'}`}
                            title="Favorilere Ekle/Çıkar"
                        >
                            <Heart size={18} fill={product.isFavorite ? "currentColor" : "none"} />
                        </button>

                        {/* Collection Button - Bottom Left */}
                        <button
                            onClick={handleAddToCollection}
                            className="absolute bottom-4 left-4 bg-white text-black p-3 rounded-full transition-all duration-300 hover:bg-blue-50 hover:text-blue-500 hover:scale-110 shadow-lg pointer-events-auto"
                            title="Koleksiyona Ekle"
                        >
                            <FolderPlus size={18} />
                        </button>

                        {/* Delete Button (If provided) - Shifted Delay */}
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="bg-black/50 text-white p-3 rounded-full transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:bg-red-500 hover:scale-110 shadow-lg delay-300 pointer-events-auto"
                                title="Sil"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>

                    {/* Status Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
                        {!product.inStock && (
                            <span className="bg-danger/90 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                                Tükendi
                            </span>
                        )}
                        {/* Target Price Met Badge */}
                        {isTargetMet && (
                            <span className="bg-primary/90 backdrop-blur text-black text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide flex items-center gap-1 shadow-lg shadow-primary/20 animate-pulse">
                                <CheckCircle2 size={12} className="stroke-[3px]" />
                                Fırsat 🔥
                            </span>
                        )}

                        <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5">
                            <span className={`text-sm font-bold ${isTargetMet ? 'text-primary' : 'text-[var(--text-main)]'}`}>
                                {formattedPrice}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Meta Info */}
                <div className="mt-3 px-1">
                    <h3 className="text-sm font-medium leading-snug text-[var(--text-main)] line-clamp-2 group-hover:text-primary transition-colors">
                        {product.title}
                    </h3>
                    {product.targetPrice && !isTargetMet && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                            <Bell size={10} />
                            <span>Target: {product.targetPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            <EditProductModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                product={product}
                collections={collections}
            />
        </>
    );
};
