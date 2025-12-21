"use client";

import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, deleteDoc } from "firebase/firestore";
import { DashboardShell } from '@/components/DashboardShell';
import { SmartProductCard } from '@/components/SmartProductCard';
import { PriceChart } from '@/components/PriceChart';
import { LayoutGrid, ListFilter, Search, List } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Verification Check
  useEffect(() => {
    if (user && !user.emailVerified) {
      router.push('/verify-email');
    }
  }, [user, router]);

  const [filter, setFilter] = useState<'all' | 'in_stock' | 'price_drop'>('all');
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'alpha_asc' | 'alpha_desc'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Collections State
  const [collections, setCollections] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]); // Unique sources

  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  // Modals
  const [chartProduct, setChartProduct] = useState<any>(null);

  // Firestore Listener
  useEffect(() => {
    if (!user) return;

    // 1. Products Listener
    const qProducts = query(
      collection(db, "products"),
      where("userId", "==", user.uid)
    );

    // 2. Collections Listener
    const qCollections = query(
      collection(db, "collection_settings"),
      where("userId", "==", user.uid)
    );

    let fetchedProducts: any[] = [];
    let fetchedCollections: string[] = [];

    // Combine updates
    const updateState = () => {
      // Extract unique collections from products (legacy/implicit)
      const productCollections = new Set(fetchedProducts.map((p: any) => p.collection).filter(Boolean));

      // Context merge: explicit collections + implicit ones
      const allCollections = Array.from(new Set([...fetchedCollections, ...Array.from(productCollections)]));
      allCollections.sort();

      setCollections(allCollections);

      // Extract unique sources
      const uniqueSources = Array.from(new Set(fetchedProducts.map((p: any) => p.source).filter(Boolean))) as string[];
      uniqueSources.sort();
      setSources(uniqueSources);

      setProducts(fetchedProducts);
      setLoading(false);
    };


    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          inStock: data.inStock !== false, // Default to true
          priceHistory: data.priceHistory || [],
          collection: data.collection || 'Uncategorized' // Default collection
        };
      });
      // Initial sort by newest
      items.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      fetchedProducts = items;
      updateState();
    });

    const unsubscribeCollections = onSnapshot(qCollections, (snapshot) => {
      const cols = snapshot.docs.map(doc => doc.data().name);
      fetchedCollections = cols;
      updateState();
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCollections();
    };
  }, [user]);

  // Debugging
  // console.log("Dashboard Collections State:", collections);

  // Filter & Sort Logic
  const filteredProducts = products
    .filter(p => {
      // 0. Collection Filter
      if (activeCollection && activeCollection !== 'all') {
        if (p.collection !== activeCollection) return false;
      }

      // 0.5 Source Filter
      if (activeSource) {
        if (p.source !== activeSource) return false;
      }

      // 1. Status Filter
      if (filter === 'in_stock' && !p.inStock) return false;
      // if (filter === 'price_drop') ...

      // 2. Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = p.title?.toLowerCase().includes(query);
        const matchSource = p.source?.toLowerCase().includes(query);
        return matchTitle || matchSource;
      }
      return true;
    })
    .filter((p, index, self) => {
      // 2.5 Deduplication Logic for "All Items" View
      // If we are showing specific collection, duplicates shouldn't theoretically happen (unless data error).
      // If we are showing ALL ITEMS, we must filter out clones.
      // Rule: Prefer the "original" or the first one encountered.
      // Uniqueness key: originalSourceId (if it's a clone) OR id (if it's original).
      // Actually simpler: if products share the same `url` (and are owned by me), they are the same item.
      // Let's use `url` as the primary key for uniqueness in the master list.

      if (!activeCollection || activeCollection === 'all') {
        const indexFirst = self.findIndex(t => t.url === p.url);
        return indexFirst === index;
      }
      return true;
    })
    .sort((a, b) => {
      // 3. Sorting
      switch (sortBy) {
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'price_desc':
          return (b.price || 0) - (a.price || 0);
        case 'alpha_asc':
          return a.title.localeCompare(b.title);
        case 'alpha_desc':
          return b.title.localeCompare(a.title);
        case 'newest':
        default:
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
    });

  // Actions
  const handleDelete = async (product: any) => {
    if (!confirm("Are you sure you want to delete this from your wishlist?")) return;

    if (product.userId && product.userId !== user?.uid) {
      alert("Unauthorized action.");
      return;
    }

    try {
      await deleteDoc(doc(db, "products", product.id));
    } catch (e) {
      alert("Failed to delete item.");
      console.error(e);
    }
  };

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
          email: email,
          userId: user?.uid
        })
      });
      alert("Alarm kuruldu! Ürün stoğa girince haber vereceğiz.");
    } catch (e) {
      alert("Bir hata oluştu.");
    }
  };

  const handleAddCollection = () => {
    const name = prompt("Enter new collection name:");
    if (name && !collections.includes(name)) {
      setCollections([...collections, name]);
      setActiveCollection(name);
    }
  };

  return (
    <DashboardShell
      onSearch={setSearchQuery}
      collections={collections}
      activeCollection={activeCollection || ''}
      onSelectCollection={setActiveCollection}
      onAddCollection={handleAddCollection}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">
            {activeCollection ? activeCollection : 'All Items'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {activeCollection ? `Viewing items in ${activeCollection}` : 'Track prices and stock status in real-time.'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 font-medium">
          {/* View Toggle */}
          <div className="flex bg-surface rounded-lg p-1 mr-2 border border-border/50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${filter === 'all' && !activeSource ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground hover:bg-surfaceHighlight'}`}
          >
            All
          </button>

          {/* Source Filter */}
          <select
            value={activeSource || ''}
            onChange={(e) => setActiveSource(e.target.value || null)}
            className={`px-4 py-2 rounded-lg appearance-none cursor-pointer transition-colors font-medium border-none outline-none ${activeSource ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground hover:bg-surfaceHighlight'}`}
          >
            <option value="" className="bg-surface text-foreground">All Stores</option>
            {sources.map(s => (
              <option key={s} value={s} className="bg-surface text-foreground">{s}</option>
            ))}
          </select>

          <button
            onClick={() => setFilter('in_stock')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${filter === 'in_stock' ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground hover:bg-surfaceHighlight'}`}
          >
            In Stock
          </button>
          <button
            onClick={() => setFilter('price_drop')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${filter === 'price_drop' ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground hover:bg-surfaceHighlight'}`}
          >
            Deals
          </button>

          {/* Sort Dropdown */}
          <div className="relative ml-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-surface text-foreground pl-4 pr-10 py-2 rounded-lg hover:bg-surfaceHighlight focus:outline-none cursor-pointer font-medium min-w-[140px]"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="alpha_asc">Name: A-Z</option>
              <option value="alpha_desc">Name: Z-A</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <ListFilter size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-surface/50 rounded-3xl border border-dashed border-surfaceHighlight flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center mb-4 text-muted-foreground">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {searchQuery ? "No results found" : "No items found"}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            {searchQuery
              ? `We couldn't find any items matching "${searchQuery}".`
              : "Your wishlist is empty. Start by adding a product link above."}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary hover:underline font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className={`
            ${viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'flex flex-col gap-4'
          }
        `}>
          {filteredProducts.map((product) => (
            <SmartProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              onSetAlarm={() => handleSetAlarm(product)}
              onOpenChart={() => setChartProduct(product)}
              onDelete={() => handleDelete(product)}
              collections={collections}
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
