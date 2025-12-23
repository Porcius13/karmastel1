import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Bell, TrendingDown, ArrowRight, Trash2, Pencil, CheckCircle2, Heart, FolderPlus } from 'lucide-react';
import { EditProductModal } from './EditProductModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
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
    userId?: string;
    originalSourceId?: string;
    createdAt?: string | any;
    updatedAt?: any;
}

interface SmartProductCardProps {
    product: Product;
    onSetAlarm?: () => void;
    onOpenChart?: () => void;
    onDelete?: () => void;
    collections?: string[]; // Needed for Edit Modal
    viewMode?: 'grid' | 'list';
}

export const SmartProductCard: React.FC<SmartProductCardProps> = ({ product: initialProduct, onSetAlarm, onOpenChart, onDelete, collections = [], viewMode = 'grid' }) => {
    const router = useRouter();
    const { t } = useLanguage();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [collectionDropdownPos, setCollectionDropdownPos] = useState<{ x: number, y: number } | null>(null);

    // Debugging
    // console.log("SmartProductCard Collections:", collections);



    // Use local state for optimistic updates
    const [product, setProduct] = useState(initialProduct);

    // Sync local state if prop changes (though for this simple case, direct mapping is often enough, but we want internal mutations)
    // Actually, usually we rely on parent to re-render, but for optimistic updates without parent handler, we need local state.
    // Ideally we should sync back up or just rely on re-fetch, but let's do local + firestore.

    const { user } = useAuth();
    const isOwner = user?.uid === product.userId;

    const handleToggleFavorite = async () => {
        if (!user) {
            alert(t('product.signin_to_favorite'));
            return;
        }

        const newStatus = !product.isFavorite;
        // Optimistic update
        setProduct((prev) => ({ ...prev, isFavorite: newStatus }));

        try {
            if (isOwner) {
                // If owner, toggle existing field
                const docRef = doc(db, "products", product.id);
                await updateDoc(docRef, { isFavorite: newStatus });
            } else {
                // If NOT owner, clone to my products
                if (newStatus) {
                    const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
                    const newProductData = {
                        ...product,
                        userId: user.uid,
                        isFavorite: true,
                        originalSourceId: product.id,
                        createdAt: new Date().toISOString(),
                        updatedAt: serverTimestamp()
                    };
                    // Remove ID from source to let Firestore gen new one
                    const { id, ...dataToSave } = newProductData;
                    await addDoc(collection(db, "products"), dataToSave);
                    console.log("Product cloned to favorites");
                }
                // If unliking a non-owned product, we technically can't "delete" the copy we just made 
                // without knowing its ID. For MVP, we just let "unfavorite" be a visual toggle 
                // that doesn't delete the COPY (unless we tracked it).
                // Or we restricts "Unfavorite" on non-owned items.
            }
        } catch (e) {
            console.error("Error updating favorite", e);
            // Revert
            setProduct((prev) => ({ ...prev, isFavorite: !newStatus }));
            alert(t('common.error_occurred'));
        }
    };

    const handleAddToCollection = async (newCollection: string) => {
        if (newCollection && newCollection !== product.collection) {
            setCollectionDropdownPos(null); // Close dropdown

            // Instead of moving (updateDoc), we CLONE (addDoc) to the new collection.
            // This allows the product to exist in multiple collections (as separate entries).
            try {
                const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");

                const newProductData = {
                    ...product,
                    collection: newCollection,
                    originalSourceId: product.id, // Track origin if needed
                    createdAt: new Date().toISOString(),
                    updatedAt: serverTimestamp()
                };

                // Remove ID so it generates a new one
                const { id, ...dataToSave } = newProductData;

                await addDoc(collection(db, "products"), dataToSave);
                alert(t('product.cloned_success').replace('{collection}', newCollection));

            } catch (e) {
                console.error("Error adding to collection", e);
                alert(t('product.cloned_error'));
            }
        }
    };

    const handleRemoveFromCollection = async () => {
        if (!confirm(t('product.remove_col_confirm').replace('{collection}', product.collection || ''))) return;

        try {
            const { deleteDoc, doc, updateDoc } = await import("firebase/firestore");

            if (product.originalSourceId) {
                // If it's a clone/copy in a specific collection, delete the document entirely
                await deleteDoc(doc(db, "products", product.id));
            } else {
                // If it's the original product, just unset the collection field
                const docRef = doc(db, "products", product.id);
                await updateDoc(docRef, {
                    collection: null,
                    updatedAt: new Date().toISOString()
                });
            }

            // Sync local state optimistically
            setProduct(prev => ({ ...prev, collection: undefined }));
            alert(t('product.removed_from_col'));

        } catch (e) {
            console.error("Error removing from collection", e);
            alert(t('product.action_failed'));
        }
    };


    // Format Price
    const numericPrice = typeof product.price === 'string'
        ? parseFloat(product.price.replace(/[^0-9,.-]/g, '').replace(',', '.'))
        : product.price;

    const formattedPrice = typeof numericPrice === 'number'
        ? numericPrice.toLocaleString('en-US', { style: 'currency', currency: 'TRY' })
        : product.price;

    // Check Badge Logic
    const isTargetMet = product.targetPrice && numericPrice && numericPrice <= product.targetPrice;

    const renderActionButtons = (isList: boolean) => {
        const btnClass = (extra: string = "") => `p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 pointer-events-auto flex items-center justify-center ${extra}`;
        const animClass = isList ? "" : "transform translate-y-8 group-hover:translate-y-0";

        return (
            <>
                {/* Edit Button */}
                <button
                    onClick={() => setIsEditModalOpen(true)}
                    className={btnClass(`bg-surface text-foreground hover:bg-primary hover:text-black ${animClass}`)}
                    title={t('product.edit')}
                >
                    <Pencil size={18} />
                </button>

                {product.inStock ? (
                    <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnClass(`bg-surface text-foreground hover:bg-primary hover:text-black ${animClass} delay-75`)}
                        title={t('product.go_to_store')}
                    >
                        <ExternalLink size={20} />
                    </a>
                ) : (
                    <button
                        onClick={onSetAlarm}
                        className={btnClass(`bg-surfaceHighlight text-foreground hover:bg-danger hover:text-white ${animClass} delay-75`)}
                        title={t('product.set_alert')}
                    >
                        <Bell size={20} />
                    </button>
                )}

                {/* Analysis/Chart Button */}
                <button
                    onClick={onOpenChart}
                    className={btnClass(`bg-surface text-foreground hover:bg-primary hover:text-black ${animClass} delay-100`)}
                    title={t('product.price_analysis')}
                >
                    <TrendingDown size={20} />
                </button>

                {/* Favorite Button */}
                <button
                    onClick={handleToggleFavorite}
                    className={btnClass(`bg-surface ${product.isFavorite ? 'text-danger hover:bg-danger/10' : 'text-foreground hover:bg-danger/10 hover:text-danger'} ${isList ? '' : 'absolute bottom-4 right-4'} `)}
                    title={t('product.favorite_toggle')}
                >
                    <Heart size={18} fill={product.isFavorite ? "currentColor" : "none"} />
                </button>

                {/* Collection Button */}
                <div className={`${isList ? '' : 'absolute bottom-4 left-4'} group/collection flex gap-2`}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            if (collectionDropdownPos) {
                                setCollectionDropdownPos(null);
                            } else {
                                setCollectionDropdownPos({ x: rect.left, y: rect.bottom + 8 });
                            }
                        }}
                        className={btnClass(`bg-surface text-foreground hover:bg-primary/20 hover:text-primary`)}
                        title={t('product.add_to_collection')}
                    >
                        <FolderPlus size={18} />
                    </button>

                    {/* Quick Remove from Collection Button (Only if in a collection) */}
                    {product.collection && product.collection !== 'Uncategorized' && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveFromCollection();
                            }}
                            className={btnClass(`bg-surface text-orange-500 hover:bg-orange-500/10`)}
                            title={t('product.remove_from_collection')}
                        >
                            <TrendingDown size={18} className="rotate-45" />
                        </button>
                    )}
                </div>

                {/* Delete Button */}
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete();
                        }}
                        className={btnClass(`bg-surface-secondary text-foreground hover:bg-danger hover:text-white delay-300`)}
                        title={t('product.delete')}
                    >
                        <Trash2 size={20} />
                    </button>
                )}
            </>
        );
    };

    return (
        <>
            <div className={`break-inside-avoid group relative flex ${viewMode === 'list' ? 'flex-row items-center gap-4 bg-surface p-4 rounded-2xl shadow-sm' : 'flex-col mb-6'}`}>
                {/* Image Container */}
                <div className={`
                    relative overflow-hidden rounded-xl bg-surface shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:shadow-primary/10
                    ${viewMode === 'list' ? 'w-24 h-24 shrink-0' : (product.aspect || 'aspect-square') + ' w-full'}
                `}>
                    <Link href={`/product/${product.id}`} className="block h-full cursor-pointer">
                        <img
                            alt={product.title}
                            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${!product.inStock ? 'grayscale opacity-60' : ''}`}
                            src={product.image?.startsWith('http://') ? product.image.replace('http://', 'https://') : (product.image || "https://placehold.co/600x600?text=No+Image")}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                e.currentTarget.src = "https://placehold.co/600x600?text=No+Image";
                            }}
                        />
                    </Link>

                    {/* Overlay & Actions */}
                    <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px] pointer-events-none ${viewMode === 'grid' ? 'opacity-0 group-hover:opacity-100' : 'hidden'}`}>
                        {viewMode === 'grid' && renderActionButtons(false)}
                    </div>

                    {/* Status Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
                        {!product.inStock && (
                            <span className="bg-danger/10 backdrop-blur border border-danger/20 text-danger text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                                {t('product.out_of_stock')}
                            </span>
                        )}
                        {/* Target Price Met Badge */}
                        {isTargetMet && (
                            <span className="bg-primary/90 backdrop-blur text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide flex items-center gap-1 shadow-glow animate-pulse">
                                <CheckCircle2 size={12} className="stroke-[3px]" />
                                {t('product.deal_badge')}
                            </span>
                        )}

                        {viewMode !== 'list' && (
                            <div className="bg-surface/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border">
                                <span className={`text-sm font-bold ${isTargetMet ? 'text-primary font-black' : 'text-foreground'}`}>
                                    {formattedPrice}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta Info */}
                <div className={`mt-3 px-1 ${viewMode === 'list' ? 'flex-1 mt-0' : ''}`}>
                    <h3 className="text-sm font-bold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {product.title}
                    </h3>
                    {product.targetPrice && !isTargetMet && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                            <Bell size={10} />
                            <span>{t('product.target_price')}: {product.targetPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                        </div>
                    )}
                </div>

                {/* List View Actions */}
                {viewMode === 'list' && (
                    <div className="flex items-center gap-4 ml-auto pr-2">
                        <div className="text-right">
                            <div className={`text-lg font-bold ${isTargetMet ? 'text-primary' : 'text-foreground'}`}>
                                {formattedPrice}
                            </div>
                            {product.targetPrice && !isTargetMet && (
                                <div className="text-xs text-muted-foreground">
                                    {t('product.target_price')}: {product.targetPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </div>
                            )}
                        </div>
                        {renderActionButtons(true)}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <EditProductModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                product={product}
                collections={collections}
            />

            {/* Collection Dropdown - Rendered at root with fixed positioning to escape overflow */}
            {collectionDropdownPos && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[60] bg-transparent"
                        onClick={() => setCollectionDropdownPos(null)}
                    />

                    {/* Dropdown Menu */}
                    <div
                        className="fixed w-48 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-[70] animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            top: collectionDropdownPos.y,
                            left: collectionDropdownPos.x
                        }}
                    >
                        <div className="p-2 max-h-48 overflow-y-auto">
                            <div className="text-[10px] font-black text-muted-foreground px-3 py-2 mb-1 uppercase tracking-widest border-b border-border/50">
                                {t('common.collections')}
                            </div>
                            {collections.length > 0 ? (
                                collections.map((col) => (
                                    <button
                                        key={col}
                                        onClick={() => handleAddToCollection(col)}
                                        className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors flex items-center gap-2 ${product.collection === col
                                            ? 'bg-primary/10 text-primary font-bold'
                                            : 'text-foreground hover:bg-surface-secondary'
                                            }`}
                                    >
                                        {product.collection === col && <CheckCircle2 size={14} />}
                                        <span className="truncate">{col}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="text-xs text-muted-foreground px-3 py-6 italic text-center">
                                    {t('product.no_collections')}
                                </div>
                            )}
                        </div>
                        <div className="p-2 border-t border-border bg-surface-secondary/50">
                            <button
                                onClick={() => router.push('/collections/create')}
                                className="w-full text-center text-[10px] font-bold text-primary hover:text-primary/80 py-1.5 tracking-wide"
                            >
                                + {t('product.create_new')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
