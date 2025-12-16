"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Navbar() {
    const router = useRouter(); // For future navigation
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAddProduct = async () => {
        if (!url) return;
        if (!url.startsWith("http")) {
            alert("Lütfen geçerli bir ürün linki girin.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/add-product", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });

            const data = await res.json();

            if (data.success) {
                setUrl("");
                // Refresh page to show new product
                router.refresh();
            } else {
                alert("Hata: " + (data.error || data.message));
            }

        } catch (err: any) {
            console.error(err);
            alert("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddProduct();
        }
    }

    return (
        <header className="header">
            <div className="header-content">
                <Link href="/" className="logo">miayis</Link>

                <div className="header-search">
                    <input
                        type="text"
                        id="header-search-input"
                        placeholder="ÜRÜN LİNKİ YAPIŞTIR..."
                        autoComplete="off"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                    />
                    <button
                        type="button"
                        id="header-search-btn"
                        className="header-search-btn"
                        title="Ürün Ekle"
                        onClick={handleAddProduct}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "➤"}
                    </button>
                    {/* Uploading / Progress Bar - Optional Visual */}
                    <div className={`header-upload-progress ${loading ? 'active' : ''}`} id="header-upload-progress">
                        <div className="header-upload-progress-bar" style={{ width: loading ? '100%' : '0%' }}></div>
                    </div>
                </div>

                <div className="header-actions">
                    <nav className="nav-links">
                        <Link href="/profile/favorites" className="favorites-link" title="Favorilerim">
                            💟
                        </Link>
                        <Link href="#" className="nav-btn nav-icon-link" title="Koleksiyonlar">
                            🗂️
                        </Link>
                        <Link href="#" className="nav-btn nav-icon-link" title="Fiyat Takibi">
                            🏷️
                        </Link>

                        <div className="notification-dropdown">
                            <button id="notification-btn" className="notification-btn" title="Bildirimler">
                                <span className="notification-icon">🔔</span>
                                <span id="notification-badge" className="notification-badge" style={{ display: 'none' }}>0</span>
                            </button>
                        </div>

                        <Link href="#" className="nav-btn nav-icon-link" title="Kullanıcılar">
                            👥
                        </Link>

                        <button id="theme-toggle" className="theme-toggle" title="Tema Değiştir">
                            <span className="theme-icon">🌙</span>
                        </button>
                    </nav>

                    <div className="profile-dropdown group relative">
                        <button className="profile-btn" id="profile-btn">
                            <span className="profile-icon">
                                {/* Placeholder profile icon */}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </span>
                            <span className="profile-name">demo</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        {/* Hover dropdown for simplicity */}
                        <div className="profile-dropdown-content group-hover:block absolute right-0 top-full bg-white border border-gray-200 min-w-[200px] hidden z-50">
                            <Link href="#" className="dropdown-item">👤 Profilim</Link>
                            <Link href="#" className="dropdown-item">💟 Favorilerim</Link>
                            <div className="dropdown-divider"></div>
                            <Link href="#" className="dropdown-item logout-item">🚪 Çıkış Yap</Link>
                        </div>
                    </div>
                </div>
            </div>
        </header >
    );
}
