"use client";

import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, deleteDoc, or } from "firebase/firestore";
import { DashboardShell } from '@/components/DashboardShell';
import { SmartProductCard } from '@/components/SmartProductCard';
import { PriceChart } from '@/components/PriceChart';
import {
  LayoutGrid,
  List as ListIcon,
  Trash2,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  ListFilter,
  Search,
  FolderHeart,
  Filter,
  Plus,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { CategoryService } from '@/lib/category-service';
import { useRouter } from 'next/navigation';

// Helper to get friendly store name
const getFriendlyStoreName = (product: any) => {
  try {
    if (!product.url) return product.source || 'Diğer';
    const hostname = new URL(product.url).hostname.toLowerCase();

    if (hostname.includes('zara')) return 'Zara';
    if (hostname.includes('hm.com') || hostname.includes('h&m')) return 'H&M';
    if (hostname.includes('mango')) return 'Mango';
    if (hostname.includes('beymen')) return 'Beymen';
    if (hostname.includes('mavi')) return 'Mavi';
    if (hostname.includes('defacto')) return 'DeFacto';
    if (hostname.includes('lcwaikiki')) return 'LC Waikiki';
    if (hostname.includes('stradivarius')) return 'Stradivarius';
    if (hostname.includes('bershka')) return 'Bershka';
    if (hostname.includes('pullandbear')) return 'Pull & Bear';
    if (hostname.includes('nike')) return 'Nike';
    if (hostname.includes('adidas')) return 'Adidas';

    // Fallback: capitalized domain
    const simpleDomain = hostname.replace('www.', '').split('.')[0];
    return simpleDomain.charAt(0).toUpperCase() + simpleDomain.slice(1);
  } catch {
    return product.source || 'Diğer';
  }
};

export default function Home() {
  const { user } = useAuth();
  const { t } = useLanguage();
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


  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Modals
  const [chartProduct, setChartProduct] = useState<any>(null);

  // Firestore Listeners
  useEffect(() => {
    if (!user?.uid) return;

    let productsA: any[] = [];
    let productsB: any[] = [];
    let collectionsA: string[] = [];
    let collectionsB: string[] = [];

    const updateState = () => {
      const allProducts = [...productsA, ...productsB];
      const uniqueProducts = Array.from(new Map(allProducts.map(item => [item.id, item])).values());

      const allColNames = [...collectionsA, ...collectionsB, ...uniqueProducts.map(p => p.collection).filter(Boolean)];
      const uniqueCollections = Array.from(new Set(allColNames)).sort();

      setCollections(uniqueCollections);
      setProducts(uniqueProducts);



      setLoading(false);
    };

    // 1. Products (Owner)
    const qP1 = query(collection(db, "products"), where("userId", "==", user.uid));
    const unsubP1 = onSnapshot(qP1, (snap) => {
      productsA = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), inStock: doc.data().inStock !== false, collection: doc.data().collection || 'Uncategorized' }));
      updateState();
    }, (err) => {
      console.error("Products (Owner) Listener Error:", err);
      setLoading(false);
    });

    // 2. Products (Participant)
    const qP2 = query(collection(db, "products"), where("participants", "array-contains", user.uid));
    const unsubP2 = onSnapshot(qP2, (snap) => {
      productsB = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), inStock: doc.data().inStock !== false, collection: doc.data().collection || 'Uncategorized' }));
      updateState();
    }, (err) => {
      console.error("Products (Participant) Listener Error:", err);
      setLoading(false);
    });

    // 3. Collections (Owner)
    const qC1 = query(collection(db, "collection_settings"), where("userId", "==", user.uid));
    const unsubC1 = onSnapshot(qC1, (snap) => {
      collectionsA = snap.docs.map(doc => doc.data().name).filter(Boolean);
      updateState();
    }, (err) => {
      console.error("Collections (Owner) Listener Error:", err);
      setLoading(false);
    });

    // 4. Collections (Participant)
    const qC2 = query(collection(db, "collection_settings"), where("participants", "array-contains", user.uid));
    const unsubC2 = onSnapshot(qC2, (snap) => {
      collectionsB = snap.docs.map(doc => doc.data().name).filter(Boolean);
      updateState();
    }, (err) => {
      console.error("Collections (Participant) Listener Error:", err);
      setLoading(false);
    });

    // Loading safety timeout
    const timer = setTimeout(() => {
      setLoading(false);
    }, 8000);

    return () => {
      clearTimeout(timer);
      unsubP1(); unsubP2(); unsubC1(); unsubC2();
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
        if (getFriendlyStoreName(p) !== activeSource) return false;
      }

      // 0.6 Category Filter
      if (categoryFilter) {
        if (categoryFilter === 'Diğer') {
          // Show if category is missing OR explicitly 'Diğer'
          if (p.category && p.category !== 'Diğer') return false;
        } else {
          if (p.category !== categoryFilter) return false;
        }
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

  // Derived Data
  const sources = Array.from(new Set(products.map(p => getFriendlyStoreName(p)))).filter(Boolean).sort();
  const categories = Array.from(new Set(products.map(p => p.category || 'Diğer'))).sort();

  // Actions
  const handleDelete = async (product: any) => {
    if (!confirm(t('dashboard.delete_confirm'))) return;

    if (product.userId && product.userId !== user?.uid) {
      alert(t('common.unauthorized'));
      return;
    }

    try {
      await deleteDoc(doc(db, "products", product.id));
    } catch (e) {
      alert(t('dashboard.delete_error'));
      console.error(e);
    }
  };

  const handleSetAlarm = async (product: any) => {
    const email = prompt(t('product.set_alarm_prompt'));
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
      alert(t('product.alarm_set_success'));
    } catch (e) {
      alert(t('common.error_occurred'));
    }
  };

  // Backfill Logic
  const handleAutoCategorize = async () => {
    if (!confirm('Eski ürünleri otomatik kategorize etmek istediğine emin misin? Bu işlem biraz sürebilir.')) return;

    let count = 0;
    for (const p of products) {
      if (p.userId === user?.uid && (!p.category || p.category === 'Diğer')) {
        const predicted = CategoryService.predictCategory(p.title);
        if (predicted && predicted !== 'Diğer') {
          try {
            await updateDoc(doc(db, "products", p.id), { category: predicted });
            count++;
          } catch (e) {
            console.error("Auto categorize error:", e);
          }
        }
      }
    }
    alert(`${count} ürün başarıyla kategorize edildi.`);
  };

  const handleAddCollection = () => {
    const name = prompt(t('profile.display_name_hint')); // reusing a placeholder or could use a new key
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
      {/* Savings Statistics Section - Compact */}
      {!activeCollection || activeCollection === 'all' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">

          {/* Total Savings - Compact */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl px-3 py-2 flex items-center justify-between group hover:border-green-500/30 transition-all">
            <div>
              <p className="text-[10px] font-bold text-green-600/70 mb-0.5 uppercase tracking-wider">Kazanç</p>
              <p className="text-lg font-black text-green-600 tracking-tight leading-none">
                {products.reduce((acc, p) => {
                  if (!p.priceHistory || p.priceHistory.length < 2) return acc;
                  const firstPrice = p.priceHistory[0].price;
                  const currentPrice = p.price;
                  return acc + Math.max(0, firstPrice - currentPrice);
                }, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
              <TrendingDown size={16} />
            </div>
          </div>

          {/* Favorites - Compact */}
          <div className="bg-surface border border-surfaceHighlight/50 rounded-xl px-3 py-2 flex items-center justify-between group hover:border-primary/30 transition-all">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground mb-0.5 uppercase tracking-wider">Favoriler</p>
              <p className="text-lg font-black text-foreground tracking-tight leading-none">
                {products.filter(p => p.isFavorite).length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center text-foreground/70 group-hover:text-red-500 group-hover:scale-110 transition-all">
              <FolderHeart size={16} />
            </div>
          </div>

          {/* Deals Count - Compact */}
          <div className="bg-surface border border-surfaceHighlight/50 rounded-xl px-3 py-2 flex items-center justify-between group hover:border-secondary/30 transition-all">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground mb-0.5 uppercase tracking-wider">İndirimde</p>
              <p className="text-lg font-black text-foreground tracking-tight leading-none">
                {products.filter(p => p.priceDropPercentage > 0).length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center text-foreground/70 group-hover:text-secondary group-hover:scale-110 transition-all">
              <TrendingUp size={16} />
            </div>
          </div>

          {/* Total Count - Compact */}
          <div className="bg-surface border border-surfaceHighlight/50 rounded-xl px-3 py-2 flex items-center justify-between group hover:border-primary/30 transition-all">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground mb-0.5 uppercase tracking-wider">Toplam</p>
              <p className="text-lg font-black text-foreground tracking-tight leading-none">
                {products.length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center text-foreground/70 group-hover:scale-110 transition-transform">
              <LayoutGrid size={16} />
            </div>
          </div>

        </div>
      ) : null}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">
            {activeCollection ? activeCollection : t('common.all_items')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {activeCollection
              ? t('dashboard.view_items_in').replace('{collection}', activeCollection)
              : t('dashboard.track_subtitle')
            }
          </p>
        </div>

        {/* Filters */}
        {/* Filters & Toolbar */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full bg-surface/50 backdrop-blur-sm p-2 rounded-2xl border border-surfaceHighlight/50">

          {/* Left Group: View & Basic Filters */}
          <div className="flex items-center gap-2 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 scrollbar-hide">
            {/* View Toggle */}
            <div className="flex bg-surface rounded-xl p-1 border border-border/50 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title={t('dashboard.grid_view')}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title={t('dashboard.list_view')}
              >
                <ListIcon size={18} />
              </button>
            </div>

            <div className="w-px h-8 bg-border/50 mx-1 shrink-0"></div>

            {/* Status Filters (Pills) */}
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${filter === 'all' && !activeSource && !categoryFilter
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface text-muted-foreground border-transparent hover:bg-surfaceHighlight hover:text-foreground'}`}
              >
                {t('common.all')}
              </button>
              <button
                onClick={() => setFilter('in_stock')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${filter === 'in_stock'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface text-muted-foreground border-transparent hover:bg-surfaceHighlight hover:text-foreground'}`}
              >
                {t('dashboard.in_stock')}
              </button>
              <button
                onClick={() => setFilter('price_drop')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${filter === 'price_drop'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface text-muted-foreground border-transparent hover:bg-surfaceHighlight hover:text-foreground'}`}
              >
                {t('dashboard.deals')}
              </button>
            </div>
          </div>

          {/* Right Group: Dropdowns */}
          <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">

            {/* Category Dropdown */}
            <div className="relative group shrink-0">
              <div className={`flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl transition-colors group-hover:bg-surfaceHighlight group-hover:border-primary/20 ${categoryFilter ? 'bg-primary/5 border-primary/30' : ''}`}>
                <span className={`${categoryFilter ? 'text-primary' : 'text-muted-foreground'}`}>
                  <FolderHeart size={16} />
                </span>
                <span className={`text-sm font-medium ${categoryFilter ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {categoryFilter || "Kategori"}
                </span>
                <span className="text-muted-foreground">
                  <TrendingDown size={14} className="opacity-50" />
                </span>
              </div>
              <select
                value={categoryFilter || ''}
                onChange={(e) => setCategoryFilter(e.target.value || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="">Tüm Kategoriler</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Source Dropdown */}
            <div className="relative group shrink-0">
              <div className={`flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl transition-colors group-hover:bg-surfaceHighlight group-hover:border-primary/20 ${activeSource ? 'bg-primary/5 border-primary/30' : ''}`}>
                <span className={`${activeSource ? 'text-primary' : 'text-muted-foreground'}`}>
                  <ExternalLink size={16} />
                </span>
                <span className={`text-sm font-medium ${activeSource ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {activeSource || t('dashboard.all_stores')}
                </span>
                <span className="text-muted-foreground">
                  <TrendingDown size={14} className="opacity-50" />
                </span>
              </div>
              <select
                value={activeSource || ''}
                onChange={(e) => setActiveSource(e.target.value || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="">{t('dashboard.all_stores')}</option>
                {sources.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="relative group shrink-0">
              <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl transition-colors group-hover:bg-surfaceHighlight group-hover:border-primary/20">
                <span className="text-muted-foreground">
                  <ListFilter size={16} />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {sortBy === 'newest' && t('dashboard.sort.newest')}
                  {sortBy === 'price_asc' && t('dashboard.sort.price_asc')}
                  {sortBy === 'price_desc' && t('dashboard.sort.price_desc')}
                  {sortBy === 'alpha_asc' && t('dashboard.sort.alpha_asc')}
                  {sortBy === 'alpha_desc' && t('dashboard.sort.alpha_desc')}
                </span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="newest">{t('dashboard.sort.newest')}</option>
                <option value="price_asc">{t('dashboard.sort.price_asc')}</option>
                <option value="price_desc">{t('dashboard.sort.price_desc')}</option>
                <option value="alpha_asc">{t('dashboard.sort.alpha_asc')}</option>
                <option value="alpha_desc">{t('dashboard.sort.alpha_desc')}</option>
              </select>
            </div>

            {/* Backfill Button (Temporary/Admin) */}
            <button
              onClick={handleAutoCategorize}
              className="p-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
              title="Eski ürünleri otomatik kategorize et"
            >
              <TrendingUp size={16} />
            </button>

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
            {searchQuery ? t('dashboard.no_results') : t('dashboard.no_items')}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            {searchQuery
              ? t('dashboard.no_results_desc').replace('{query}', searchQuery)
              : t('dashboard.no_items_desc')}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary hover:underline font-medium"
            >
              {t('dashboard.clear_search')}
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
          {filteredProducts.map((product, index) => (
            <SmartProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              priority={index < 4}
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
                productId={chartProduct.id}
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
