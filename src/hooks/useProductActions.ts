import { useState } from 'react';
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Product } from '@/types';

export function useProductActions(initialProduct: Product) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [product, setProduct] = useState<Product>(initialProduct);
    const [loading, setLoading] = useState(false);

    const isOwner = user?.uid === product.userId;

    const toggleFavorite = async () => {
        if (!user) {
            alert(t('common.login_required') || "Please login first.");
            return;
        }

        const newStatus = !product.isFavorite;

        // Optimistic update
        setProduct((prev) => ({ ...prev, isFavorite: newStatus }));

        try {
            setLoading(true);
            if (isOwner) {
                // If owner, toggle existing field
                const docRef = doc(db, "products", product.id);
                await updateDoc(docRef, { isFavorite: newStatus });
            } else {
                // If NOT owner, clone to my products
                if (newStatus) {
                    const newProductData = {
                        ...product,
                        userId: user.uid,
                        isFavorite: true,
                        originalSourceId: product.id,
                        createdAt: new Date().toISOString(),
                        updatedAt: serverTimestamp()
                    };
                    // Remove ID from source to let Firestore gen new one
                    const { id, ...dataToSave } = newProductData as any;
                    await addDoc(collection(db, "products"), dataToSave);
                    console.log("Product cloned to favorites");
                }
            }
        } catch (e) {
            console.error("Error updating favorite", e);
            // Revert
            setProduct((prev) => ({ ...prev, isFavorite: !newStatus }));
            alert(t('common.error_occurred') || "Error occurred");
        } finally {
            setLoading(false);
        }
    };

    const addToCollection = async (newCollection: string) => {
        if (!user) return;
        if (newCollection && newCollection !== product.collection) {
            try {
                setLoading(true);
                const newProductData = {
                    ...product,
                    collection: newCollection,
                    originalSourceId: product.id, // Track origin if needed
                    createdAt: new Date().toISOString(),
                    updatedAt: serverTimestamp()
                };

                // Remove ID so it generates a new one
                const { id, ...dataToSave } = newProductData as any;

                await addDoc(collection(db, "products"), dataToSave);
                alert((t('product.cloned_success') || "Added to {collection}").replace('{collection}', newCollection));
            } catch (e) {
                console.error("Error adding to collection", e);
                alert(t('product.cloned_error') || "Failed to add to collection");
            } finally {
                setLoading(false);
            }
        }
    };

    const removeFromCollection = async () => {
        if (!user) return;
        if (!confirm((t('product.remove_col_confirm') || "Remove from {collection}?").replace('{collection}', product.collection || ''))) return;

        try {
            setLoading(true);
            if (product.originalSourceId) {
                // If it's a clone/copy in a specific collection, delete the document entirely
                await deleteDoc(doc(db, "products", product.id));
            } else {
                // If it's the original product, just unset the collection field
                // Note: 'collection: null' might be changing type, relying on Firestore to handle field deletion or null
                // TypeScript might complain if we try to set string | undefined to null directly if strict.
                // Using 'deleteField()' is better but 'null' works in many firebase setups for "empty".
                // Sticking to code logic from before:
                const docRef = doc(db, "products", product.id);
                await updateDoc(docRef, {
                    collection: null,
                    updatedAt: new Date().toISOString()
                } as any);
            }

            // Sync local state optimistically
            setProduct(prev => ({ ...prev, collection: undefined }));
            alert(t('product.removed_from_col') || "Removed from collection");

        } catch (e) {
            console.error("Error removing from collection", e);
            alert(t('product.action_failed') || "Action failed");
        } finally {
            setLoading(false);
        }
    };

    return {
        product,
        setProduct, // Exposing setter if needed for other optimistic UI
        toggleFavorite,
        addToCollection,
        removeFromCollection,
        isOwner,
        loading
    };
}
