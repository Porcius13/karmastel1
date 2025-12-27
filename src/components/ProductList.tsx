"use client";

import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface Product {
    id: string;
    title: string;
    price: number;
    image: string;
    currency: string;
    url: string;
    source?: string;
    brand?: string;
    createdAt?: any;
}

export default function ProductList() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "products"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
            setProducts(items);
            setLoading(false);
        }, (err) => {
            console.error("ProductList Listener Error:", err);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link click
        if (confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, "products", id));
        }
    };

    const formatPrice = (price: number, currency: string) => {
        try {
            return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(price);
        } catch (e) {
            return `${price} ${currency}`;
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-400 font-medium tracking-wide">Yükleniyor...</div>;
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-muted/10 p-6 rounded-full mb-4">
                    <span className="material-symbols-outlined text-4xl text-muted-foreground">inventory_2</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Henüz Ürün Yok</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                    Yukarıdaki arama çubuğuna bir ürün linki yapıştırarak koleksiyonunuza eklemeye başlayın.
                </p>
            </div>
        );
    }

    return (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 pb-12">
            {products.map((product) => (
                <div key={product.id} className="break-inside-avoid group relative flex flex-col gap-3">
                    <div className="relative w-full overflow-hidden rounded-xl bg-surface border border-border/50 hover:border-border transition-colors group" >
                        {/* Image */}
                        <img
                            alt={product.title}
                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                            src={product.image || 'https://via.placeholder.com/400x500?text=No+Image'}
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                            <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-primary text-black rounded-full p-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-lg hover:scale-110"
                                title="Ürüne Git"
                            >
                                <span className="material-symbols-outlined text-[24px]">arrow_outward</span>
                            </a>
                        </div>

                        {/* Delete Button (Custom addition to design) */}
                        <button
                            onClick={(e) => handleDelete(product.id, e)}
                            className="absolute top-2 right-2 bg-white/80 dark:bg-black/50 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-500"
                            title="Sil"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {product.source || 'Website'}
                        </p>
                        <div className="flex justify-between items-start mt-0.5">
                            <h3 className="text-base font-medium leading-tight text-foreground line-clamp-2" title={product.title}>
                                {product.title}
                            </h3>
                            <span className="text-base font-bold text-foreground shrink-0 ml-2">
                                {formatPrice(product.price, product.currency)}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
