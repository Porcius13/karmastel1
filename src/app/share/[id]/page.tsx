"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Lock, ExternalLink, User } from 'lucide-react';
import { useParams } from 'next/navigation';
import { UserService } from '@/lib/user-service';

interface Product {
    id: string;
    title: string;
    price: number;
    image: string;
    url: string;
    currency: string;
    collection?: string;
}

export default function SharedCollectionPage() {
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [collectionName, setCollectionName] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [ownerName, setOwnerName] = useState('A User');
    const [ownerAvatar, setOwnerAvatar] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCollection() {
            if (!id) return;

            try {
                // ID Format: USERID_BASE64NAME
                // We split by the FIRST underscore to handle the separator
                const separatorIndex = id.indexOf('_');
                if (separatorIndex === -1) {
                    setError("Invalid URL.");
                    setLoading(false);
                    return;
                }

                const userId = id.substring(0, separatorIndex);
                const encodedName = id.substring(separatorIndex + 1);

                let decodedName = '';
                try {
                    // Reverse the URL-safe Base64 replacements (- -> +, _ -> /)
                    const base64 = encodedName.replace(/-/g, '+').replace(/_/g, '/');
                    decodedName = decodeURIComponent(escape(atob(base64)));
                } catch (e) {
                    // Fallback if not base64 or failed
                    decodedName = decodeURIComponent(encodedName);
                }

                setCollectionName(decodedName);

                // 1. Check Privacy Settings
                // We query by userId and name because ID might differ if encoding changed
                const settingsRef = doc(db, "collection_settings", `${userId}_${encodedName}`);
                // Try direct fetch by ID first (as we saved it). 
                // In CollectionsPage we saved it as `${user.uid}_${safeNameId}` which is exactly our ID param!
                let isPublic = false;

                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists()) {
                    isPublic = settingsSnap.data().isPublic;
                } else {
                    // Fallback: Query by name and userId just in case ID mismatch
                    const q = query(
                        collection(db, "collection_settings"),
                        where("userId", "==", userId),
                        where("name", "==", decodedName)
                    );
                    const qSnap = await getDocs(q);
                    if (!qSnap.empty) {
                        isPublic = qSnap.docs[0].data().isPublic;
                    }
                }

                if (!isPublic) {
                    setError("This collection is private or does not exist.");
                    setLoading(false);
                    return;
                }

                // 2. Fetch Owner Profile
                UserService.getUserProfile(userId).then(profile => {
                    if (profile) {
                        setOwnerName(profile.displayName || profile.username || 'A User');
                        setOwnerAvatar(profile.photoURL || null);
                    }
                });

                // 3. Fetch Products
                const productsQuery = query(
                    collection(db, "products"),
                    where("userId", "==", userId),
                    where("collection", "==", decodedName),
                    where("isPublic", "==", true)
                );

                const productSnap = await getDocs(productsQuery);
                const fetchedProducts: Product[] = [];
                productSnap.forEach((doc) => {
                    fetchedProducts.push({ id: doc.id, ...doc.data() } as Product);
                });

                setProducts(fetchedProducts);
            } catch (err) {
                console.error(err);
                setError("Failed to load collection.");
            } finally {
                setLoading(false);
            }
        }

        fetchCollection();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 bg-surfaceHighlight rounded-full flex items-center justify-center text-muted-foreground mb-6">
                    <Lock size={40} />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
                <p className="text-muted-foreground mb-8 text-center">{error}</p>
                <Link href="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold hover:shadow-glow transition-all">
                    Go Home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* Header */}
            <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="text-2xl tracking-wider hover:scale-105 transition-transform text-[#412234] dark:text-[#FAF0E7]" style={{ fontFamily: "'Luckiest Guy', var(--font-luckiest-guy), cursive" }}>FAVDUCK</Link>
                    <Link href="/signup" className="text-sm font-bold text-primary hover:underline">Create your own wishlist</Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="mb-10 text-center md:text-left">
                    <span className="text-sm font-bold text-primary uppercase tracking-widest mb-2 block">Shared Collection</span>
                    <h1 className="text-4xl md:text-5xl font-black mb-4">{collectionName}</h1>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                        {ownerAvatar ? (
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border">
                                <Image src={ownerAvatar} alt={ownerName} fill sizes="32px" className="object-cover" unoptimized />
                            </div>
                        ) : (
                            <div className="w-8 h-8 bg-surfaceHighlight rounded-full flex items-center justify-center text-muted-foreground">
                                <User size={16} />
                            </div>
                        )}
                        <p className="text-muted-foreground font-medium">{products.length} items curated by {ownerName}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.map((product) => (
                        <div key={product.id} className="group bg-surface border border-surfaceHighlight rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
                            {/* Image */}
                            <div className="relative aspect-[4/5] overflow-hidden">
                                <Image
                                    src={product.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80'}
                                    alt={product.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                    <a
                                        href={product.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                                    >
                                        View at {new URL(product.url).hostname.replace('www.', '')} <ExternalLink size={16} />
                                    </a>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="p-6">
                                <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight min-h-[3rem] group-hover:text-primary transition-colors">{product.title}</h3>
                                <div className="text-2xl font-black text-primary">
                                    {product.price.toLocaleString('tr-TR', { style: 'currency', currency: product.currency || 'TRY' })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
