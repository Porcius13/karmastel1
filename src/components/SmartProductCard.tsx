import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Bell, TrendingDown, ArrowRight, Trash2, Pencil, CheckCircle2, Heart, FolderPlus } from 'lucide-react';
import { EditProductModal } from './EditProductModal';
import { useAuth } from '@/context/AuthContext';
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
            alert("Favorilere eklemek için giriş yapmalısınız.");
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
            alert("İşlem sırasında bir hata oluştu.");
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
                alert(`Product added to ${newCollection}!`);

            } catch (e) {
                console.error("Error adding to collection", e);
                alert("Failed to add to collection.");
            }
        }
    };

    const handleRemoveFromCollection = async () => {
        if (!confirm(`Bu ürünü "${product.collection}" koleksiyonundan çıkarmak istediğinize emin misiniz?`)) return;

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
            alert("Ürün koleksiyondan çıkarıldı.");

        } catch (e) {
            console.error("Error removing from collection", e);
            alert("İşlem başarısız oldu.");
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

    const renderActionButtons = (isList: boolean) => {
        const btnClass = (extra: string = "") => `p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 pointer-events-auto flex items-center justify-center ${extra}`;
        const animClass = isList ? "" : "transform translate-y-8 group-hover:translate-y-0";

        return (
            <>
                {/* Edit Button */}
                <button
                    onClick={() => setIsEditModalOpen(true)}
                    className={btnClass(`bg-white text-black hover:bg-black hover:text-white ${animClass}`)}
                    title="Düzenle"
                >
                    <Pencil size={18} />
                </button>

                {product.inStock ? (
                    <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnClass(`bg-white text-black hover:bg-primary ${animClass} delay-75`)}
                        title="Ürüne Git"
                    >
                        <ExternalLink size={20} />
                    </a>
                ) : (
                    <button
                        onClick={onSetAlarm}
                        className={btnClass(`bg-surfaceHighlight text-[var(--text-main)] hover:bg-danger ${animClass} delay-75`)}
                        title="Stok Alarmı Kur"
                    >
                        <Bell size={20} />
                    </button>
                )}

                {/* Analysis/Chart Button */}
                <button
                    onClick={onOpenChart}
                    className={btnClass(`bg-white text-black hover:bg-primary ${animClass} delay-100`)}
                    title="Fiyat Analizi"
                >
                    <TrendingDown size={20} />
                </button>

                {/* Favorite Button */}
                <button
                    onClick={handleToggleFavorite}
                    className={btnClass(`bg-white ${product.isFavorite ? 'text-red-500 hover:bg-red-50' : 'text-black hover:bg-red-50 hover:text-red-500'} ${isList ? '' : 'absolute bottom-4 right-4'} `)}
                    title="Favorilere Ekle/Çıkar"
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
                        className={btnClass(`bg-white text-black hover:bg-blue-50 hover:text-blue-500`)}
                        title="Koleksiyona Ekle"
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
                            className={btnClass(`bg-white text-orange-500 hover:bg-orange-50`)}
                            title="Koleksiyondan Çıkar"
                        >
                            <span className="material-symbols-outlined text-[18px]">folder_off</span>
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
                        className={btnClass(`bg-black/50 text-white hover:bg-red-500 delay-300`)}
                        title="Sil"
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
                            src={product.image || "https://placehold.co/600x600?text=No+Image"}
                            referrerPolicy="no-referrer"
                            onError={(e) => (e.currentTarget.src = "https://placehold.co/600x600?text=No+Image")}
                        />
                    </Link>

                    {/* Overlay & Actions */}
                    <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px] pointer-events-none ${viewMode === 'grid' ? 'opacity-0 group-hover:opacity-100' : 'hidden'}`}>
                        {viewMode === 'grid' && renderActionButtons(false)}
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

                        {viewMode !== 'list' && (
                            <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5">
                                <span className={`text-sm font-bold ${isTargetMet ? 'text-primary' : 'text-[var(--text-main)]'}`}>
                                    {formattedPrice}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta Info */}
                <div className={`mt-3 px-1 ${viewMode === 'list' ? 'flex-1 mt-0' : ''}`}>
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

                {/* List View Actions */}
                {viewMode === 'list' && (
                    <div className="flex items-center gap-4 ml-auto pr-2">
                        <div className="text-right">
                            <div className={`text-lg font-bold ${isTargetMet ? 'text-primary' : 'text-[var(--text-main)]'}`}>
                                {formattedPrice}
                            </div>
                            {product.targetPrice && !isTargetMet && (
                                <div className="text-xs text-muted-foreground">
                                    Hedef: {product.targetPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
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
                        className="fixed w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[70] animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            top: collectionDropdownPos.y,
                            left: collectionDropdownPos.x
                        }}
                    >
                        <div className="p-2 max-h-48 overflow-y-auto">
                            <div className="text-xs font-semibold text-slate-400 px-2 py-1 mb-1 uppercase tracking-wider">
                                Koleksiyonlar
                            </div>
                            {collections.length > 0 ? (
                                collections.map((col) => (
                                    <button
                                        key={col}
                                        onClick={() => handleAddToCollection(col)}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${product.collection === col
                                            ? 'bg-blue-50 text-blue-600 font-bold'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                    >
                                        {product.collection === col && <CheckCircle2 size={14} />}
                                        <span className="truncate">{col}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="text-xs text-slate-400 px-3 py-2 italic text-center">
                                    Koleksiyon yok
                                </div>
                            )}
                        </div>
                        <div className="p-2 border-t border-slate-50 bg-slate-50">
                            <button
                                onClick={() => router.push('/collections/create')}
                                className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700 py-1"
                            >
                                + Yeni Oluştur
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
