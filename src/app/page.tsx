"use client";
import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, updateDoc, doc } from "firebase/firestore";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any>(null); // State for the product being edited

  // Helper for price formatting
  const formatFn = (p: any, c: any) => {
    if (typeof p === 'number') {
      return p.toLocaleString('tr-TR') + ' ' + (c || 'TL');
    }
    return (p || '0') + ' ' + (c || 'TL');
  };

  // Firestore Listener
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          brand: data.source ? data.source.toUpperCase() : "MAĞAZA",
          title: data.title || "İsimsiz Ürün",
          price: formatFn(data.price, data.currency),
          image: data.image || "https://placehold.co/600x600?text=No+Image",
          aspect: "aspect-square", // Default aspect
          createdAt: data.createdAt,
          url: data.url,
          // Store raw data for editing
          rawPrice: data.price,
          rawCurrency: data.currency
        };
      });
      setProducts(items);
      setInitialLoading(false);
    }, (error) => {
      console.error("Firestore listener error:", error);
      setInitialLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddProduct = async () => {
    if (!url) return;
    setLoading(true);

    try {
      const response = await fetch('/api/add-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        // No need to manually setProducts, the onSnapshot listener will update the list
        setUrl('');
      } else {
        const errorData = await response.json();
        alert('Hata: ' + (errorData.error || 'Ürün eklenemedi'));
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link click if wrapped
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;

    try {
      await deleteDoc(doc(db, "products", id));
    } catch (error) {
      console.error("Error removing document: ", error);
      alert("Ürün silinirken bir hata oluştu.");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const productRef = doc(db, "products", editingProduct.id);
      await updateDoc(productRef, {
        title: editingProduct.title,
        price: Number(editingProduct.rawPrice), // Ensure number
        image: editingProduct.image,
        url: editingProduct.url
      });
      setEditingProduct(null); // Close modal
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Ürün güncellenirken bir hata oluştu.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddProduct();
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = "https://placehold.co/600x600?text=No+Image";
  };

  return (
    <>
      {/* Top Header / Action Bar */}
      <header className="sticky top-0 z-40 px-8 py-6 bg-background-light/80 backdrop-blur-xl flex items-center justify-between gap-6 shrink-0 z-50">

        {/* Search & Add Product */}
        <div className="flex-1 max-w-2xl relative group">
          <div className={`absolute inset-0 bg-primary/20 blur-xl rounded-full transition-opacity duration-500 ${loading ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className="relative flex items-center bg-white shadow-sm border border-[#f0f0eb] rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all duration-300 hover:shadow-md">
            <span className="material-symbols-outlined text-gray-400 pl-4">search</span>
            <input
              className="w-full py-4 px-3 bg-transparent border-none outline-none text-text-main placeholder:text-text-secondary/50 font-medium"
              placeholder="Bir ürün linki yapıştırın..."
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              onClick={handleAddProduct}
              disabled={loading || !url}
              className="m-1.5 p-2.5 rounded-xl bg-primary text-text-main hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">add</span>
              )}
            </button>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-3">
          <button className="p-3 rounded-full hover:bg-white transition-colors text-text-secondary hover:text-text-main relative group">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-background-light"></span>
          </button>
        </div>
      </header>

      {/* Main Content Scroll Area */}
      <main className="flex-1 overflow-y-auto px-8 pb-12 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">

        {/* Filters */}
        <div className="mb-8 flex items-center gap-3 overflow-x-auto py-2 scrollbar-hide">
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-text-main text-white shadow-lg shadow-text-main/10 transition-transform active:scale-95">
            <span className="text-sm font-semibold">Tümü</span>
          </button>
          {['Mobilya', 'Teknoloji', 'Giyim', 'Aksesuar', 'Kozmetik'].map((cat) => (
            <button key={cat} className="px-6 py-2.5 rounded-full bg-white border border-[#f0f0eb] text-text-secondary hover:text-text-main hover:border-gray-300 transition-all whitespace-nowrap">
              <span className="text-sm font-medium">{cat}</span>
            </button>
          ))}
        </div>

        {/* Content State */}
        {initialLoading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-text-secondary animate-pulse">Ürünler yükleniyor...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="bg-white p-8 rounded-full shadow-sm mb-6">
              <span className="material-symbols-outlined text-6xl text-primary/80">inventory_2</span>
            </div>
            <h3 className="text-2xl font-bold text-text-main mb-2">Listeniz Boş</h3>
            <p className="text-text-secondary max-w-md mx-auto leading-relaxed">
              Henüz koleksiyonunuza bir parça eklemediniz. Yukarıdaki arama çubuğunu kullanarak beğendiğiniz ürünleri buraya taşıyın.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {products.map((product: any) => (
              <div key={product.id} className="break-inside-avoid group relative flex flex-col bg-transparent">

                {/* Image Card */}
                <div className={"relative w-full overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-500 hover:shadow-xl " + (product.aspect || 'aspect-square')}>
                  <img
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src={product.image}
                    onError={handleImageError}
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <a href={product.url || '#'} target="_blank" rel="noopener noreferrer" className="bg-white text-text-main rounded-full p-4 transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 shadow-2xl hover:scale-110 hover:bg-primary z-10">
                      <span className="material-symbols-outlined text-[24px]">arrow_outward</span>
                    </a>
                  </div>

                  {/* Actions (Top Right) */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                    {/* Edit Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setEditingProduct({ ...product });
                      }}
                      className="bg-white/90 backdrop-blur p-2 rounded-full shadow-sm hover:bg-blue-50 hover:text-blue-500 transition-colors"
                      title="Düzenle"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteProduct(product.id, e)}
                      className="bg-white/90 backdrop-blur p-2 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Sil"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>

                  {/* Price Tag (Floating) */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm">
                    <span className="text-sm font-bold text-text-main">{product.price}</span>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="mt-2 px-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold text-primary tracking-wider uppercase bg-text-main/5 px-2 py-0.5 rounded-md">{product.brand}</p>
                    <span className="text-[10px] text-text-secondary">{new Date(product.createdAt?.seconds * 1000).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <h3 className="text-sm font-medium leading-snug text-text-main line-clamp-2 group-hover:text-primary transition-colors">{product.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-background-light">
              <h3 className="text-lg font-bold text-text-main">Ürünü Düzenle</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Ürün Resmi (URL)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  value={editingProduct.image}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Ürün Başlığı</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Fiyat (Raw)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    value={editingProduct.rawPrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, rawPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Ürün Linki</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    value={editingProduct.url || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, url: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-text-main font-medium hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-text-main font-bold shadow-sm hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
