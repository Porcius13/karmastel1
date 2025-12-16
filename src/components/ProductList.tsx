"use client";

import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { ExternalLink, Trash2 } from "lucide-react";

interface Product {
    id: string;
    title: string;
    price: number;
    image: string;
    currency: string;
    url: string;
    source?: string;
    brand?: string; // If scraping logic adds brand later
    createdAt?: any;
}

export default function ProductList() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Client-side fetching for real-time updates (matching dashboard.html behavior somewhat)
    // or sticking to Server Component? The prompt originally asked for Server Component in previous step, 
    // but now we are porting a specific UI which has interactive filtering. 
    // Let's make it a Client Component to handle filtering/sorting state easily as per the HTML template.

    useEffect(() => {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
            setProducts(items);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, "products", id));
        }
    };

    const formatPrice = (price: number, currency: string) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(price);
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;
    }

    return (
        <>
            {/* Filter and Sort Bar */}
            <div className="filter-sort-bar">
                <div className="filter-sort-container">
                    <div className="filter-item">
                        <input type="text" id="product-search" className="filter-search-input" placeholder="ARA" autoComplete="off" />
                    </div>
                    <div className="filter-item">
                        <div className="select-wrapper">
                            <select id="sort-select" className="filter-select-minimal">
                                <option value="newest">YENİ</option>
                                <option value="price-low">FİYAT ↑</option>
                                <option value="price-high">FİYAT ↓</option>
                            </select>
                        </div>
                    </div>
                    {/* Simplified for MVP */}
                </div>
            </div>

            {/* Product Grid */}
            <div className="products-grid">
                {products.length === 0 ? (
                    <div className="empty-state">
                        <h3>Henüz Ürün Yok</h3>
                        <p>Yukarıdaki kutucuğa bir link yapıştırın.</p>
                    </div>
                ) : (
                    products.map((product) => (
                        <div key={product.id} className="product-card">
                            <div className="product-image-container relative">
                                {/* Single Image for now */}
                                <div className="carousel-images">
                                    <img
                                        src={product.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDI4MCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iMjgwIiBmaWxsPSIjRjhGOEY4Ii8+CjxwYXRoIGQ9Ik0xNDAgMTQwTDEwMCAxMDBIMTgwTDE0MCAxNDBaIiBmaWxsPSIjQ0NDIi8+Cjx0ZXh0IHg9IjE0MCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPkfDvHJzZWwgWXVrbMO8PC90ZXh0Pgo8L3N2Zz4K'}
                                        alt={product.title}
                                        className="product-image active w-full h-auto aspect-[3/4] object-cover"
                                    />
                                </div>

                                {/* New Badge if recent? - Skipping for now */}
                                <button className="add-to-collection-btn absolute top-2 right-2 opacity-0 group-hover:opacity-100" title="Koleksiyona Ekle">
                                    +
                                </button>
                            </div>

                            <div className="product-info p-4">
                                <h3 className="text-sm font-medium line-clamp-2 min-h-[40px] mb-2 uppercase tracking-wide">
                                    {product.title}
                                </h3>
                                <div className="price-container mb-4">
                                    <span className="product-price text-lg font-bold">
                                        {formatPrice(product.price, product.currency)}
                                    </span>
                                </div>

                                <div className="product-actions flex items-center gap-2 border-t pt-3 border-gray-100">
                                    <a
                                        href={product.url}
                                        target="_blank"
                                        className="view-btn flex-1 flex items-center justify-center gap-2 text-xs uppercase"
                                    >
                                        SİTEYE GİT <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="delete-btn w-8 h-8 flex items-center justify-center"
                                        title="Sil"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
