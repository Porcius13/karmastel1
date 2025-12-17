"use client";

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Bell, TrendingDown, ArrowRight } from 'lucide-react';

interface Product {
    id: string;
    title: string;
    image: string;
    price: string | number;
    url: string;
    inStock: boolean;
    aspect?: string;
    priceHistory?: any[];
}

interface SmartProductCardProps {
    product: Product;
    onSetAlarm?: () => void;
    onOpenChart?: () => void;
}

export const SmartProductCard: React.FC<SmartProductCardProps> = ({ product, onSetAlarm, onOpenChart }) => {
    // Format Price
    const formattedPrice = typeof product.price === 'number'
        ? product.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
        : product.price;

    return (
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
                    {product.inStock ? (
                        <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white text-black p-3 rounded-full transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:scale-110 shadow-lg pointer-events-auto"
                            title="Ürüne Git"
                        >
                            <ExternalLink size={20} />
                        </a>
                    ) : (
                        <button
                            onClick={onSetAlarm}
                            className="bg-surfaceHighlight text-white p-3 rounded-full transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:bg-danger hover:scale-110 shadow-lg pointer-events-auto"
                            title="Stok Alarmı Kur"
                        >
                            <Bell size={20} />
                        </button>
                    )}

                    {/* Analysis/Chart Button */}
                    <button
                        onClick={onOpenChart}
                        className="bg-white text-black p-3 rounded-full transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:scale-110 shadow-lg delay-75 pointer-events-auto"
                        title="Fiyat Analizi"
                    >
                        <TrendingDown size={20} />
                    </button>
                </div>

                {/* Status Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
                    {!product.inStock && (
                        <span className="bg-danger/90 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                            Tükendi
                        </span>
                    )}
                    <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5">
                        <span className="text-sm font-bold text-primary">{formattedPrice}</span>
                    </div>
                </div>
            </div>

            {/* Meta Info */}
            <div className="mt-3 px-1">
                <h3 className="text-sm font-medium leading-snug text-white line-clamp-2 group-hover:text-primary transition-colors">
                    {product.title}
                </h3>
            </div>
        </div>
    );
};
