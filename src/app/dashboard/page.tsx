"use client";

import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { DashboardShell } from '@/components/DashboardShell';
import { SmartProductCard } from '@/components/SmartProductCard';
import { PriceChart } from '@/components/PriceChart';
import { LayoutGrid, ListFilter } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'price_drop'>('all');

  // Modals
  const [chartProduct, setChartProduct] = useState<any>(null);

  // Firestore Listener
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          inStock: data.inStock !== false, // Default to true
          priceHistory: data.priceHistory || []
        };
      });
      setProducts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter Logic
  const filteredProducts = products.filter(p => {
    if (filter === 'in_stock') return p.inStock;
    // Price drop logic placeholder (needs logic comparing last 2 prices)
    // if (filter === 'price_drop') return p.priceHistory.length > 1 && ...
    return true;
  });

  // Actions
  const handleSetAlarm = async (product: any) => {
    const email = prompt("Stok gelince haber verilecek E-posta adresini girin:");
    if (!email) return;

    try {
      await fetch('/api/set-alarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productUrl: product.url,
          email: email
        })
      });
      alert("Alarm kuruldu! Ürün stoğa girince haber vereceğiz.");
    } catch (e) {
      alert("Bir hata oluştu.");
    }
  };

  return (
    <DashboardShell>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">My Wishlist</h2>
          <p className="text-muted-foreground mt-1">Track prices and stock status in real-time.</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 font-medium">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-primary text-black' : 'bg-surface text-white hover:bg-surfaceHighlight'}`}
          >
            All Items <span className="opacity-60 ml-1 text-xs">({products.length})</span>
          </button>
          <button
            onClick={() => setFilter('in_stock')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${filter === 'in_stock' ? 'bg-primary text-black' : 'bg-surface text-white hover:bg-surfaceHighlight'}`}
          >
            In Stock
          </button>
          <button
            onClick={() => setFilter('price_drop')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${filter === 'price_drop' ? 'bg-primary text-black' : 'bg-surface text-white hover:bg-surfaceHighlight'}`}
          >
            Price Drops
          </button>
          <button className="bg-surface p-2 rounded-lg text-white hover:bg-surfaceHighlight ml-2">
            <LayoutGrid size={20} />
          </button>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-surfaceHighlight">
          <p className="text-muted-foreground">No items found in this category.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {filteredProducts.map((product) => (
            <SmartProductCard
              key={product.id}
              product={product}
              onSetAlarm={() => handleSetAlarm(product)}
              onOpenChart={() => setChartProduct(product)}
            />
          ))}
        </div>
      )}

      {/* Price Chart Modal */}
      {chartProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-surfaceHighlight rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-surfaceHighlight flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {chartProduct.title}
                </h3>
              </div>
              <button
                onClick={() => setChartProduct(null)}
                className="p-2 hover:bg-surfaceHighlight rounded-full transition-colors text-muted-foreground hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 bg-surface">
              <PriceChart
                history={chartProduct.priceHistory}
                currentPrice={typeof chartProduct.price === 'number' ? chartProduct.price : 0}
              />
            </div>
          </div>
        </div>
      )}

    </DashboardShell>
  );
}
