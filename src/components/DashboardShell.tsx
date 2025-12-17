"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FolderHeart,
    Star,
    Settings,
    Menu,
    Search,
    Bell,
    User,
    PanelLeft,
    PanelLeftClose
} from 'lucide-react';

import Sidebar from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/context/AuthContext';

interface DashboardShellProps {
    children: React.ReactNode;
    onSearch?: (query: string) => void;
    collections?: string[];
    activeCollection?: string;
    onSelectCollection?: (collection: string | null) => void;
    onAddCollection?: () => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
    children,
    onSearch,
    collections,
    activeCollection,
    onSelectCollection,
    onAddCollection
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [productUrl, setProductUrl] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const pathname = usePathname();
    const { user } = useAuth();

    const handleUrlSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && productUrl.trim()) {
            if (!user) {
                alert("Please log in to add products.");
                return;
            }

            setIsAdding(true);
            try {
                const res = await fetch('/api/add-product', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: productUrl, userId: user.uid })
                });
                const data = await res.json();
                if (data.success) {
                    setProductUrl('');
                    // Optional: Show success toast
                } else {
                    alert(data.error || "Failed to add product");
                }
            } catch (err) {
                console.error(err);
                alert("An error occurred");
            } finally {
                setIsAdding(false);
            }
        }
    };

    return (
        <div className="h-screen w-full bg-background font-sans text-[var(--text-main)] flex overflow-hidden selection:bg-primary selection:text-primary-foreground">

            {/* 1. SIDEBAR (Desktop: Visible, Mobile: Hidden) */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                collections={collections}
                activeCollection={activeCollection}
                onSelectCollection={onSelectCollection}
                onAddCollection={onAddCollection}
                className={`
            fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
         `}
            />

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                {/* 2. NAVBAR (Sticky Top) */}
                <header className="sticky top-0 z-30 h-20 w-full bg-background/80 backdrop-blur-xl border-b border-surfaceHighlight/50 px-4 md:px-8 flex items-center justify-between gap-4">

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-[var(--text-main)] md:hidden hover:bg-surface rounded-lg transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="hidden md:flex p-2 text-muted-foreground hover:text-[var(--text-main)] hover:bg-surface rounded-lg transition-colors"
                            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isSidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search size={18} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search your items..."
                            onChange={(e) => onSearch && onSearch(e.target.value)}
                            className="w-full bg-surface border-none rounded-full py-2.5 pl-11 pr-4 text-sm text-[var(--text-main)] placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm"
                        />
                    </div>


                    {/* Add Product Field */}
                    <div className="flex-1 max-w-2xl mx-auto hidden md:block group relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-muted-foreground group-focus-within:text-primary transition-colors text-[18px]">add_link</span>
                        </div>
                        <div className='relative'>
                            <input
                                type="text"
                                placeholder="Paste a product link to track..."
                                value={productUrl}
                                onChange={(e) => setProductUrl(e.target.value)}
                                onKeyDown={handleUrlSubmit}
                                disabled={isAdding}
                                className="w-full bg-surface border-none rounded-full py-2.5 pl-11 pr-16 text-sm text-[var(--text-main)] placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm disabled:opacity-50"
                            />
                            {isAdding && (
                                <div className="absolute top-1/2 right-14 -translate-y-1/2 flex items-center">
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            <kbd className="absolute top-1/2 right-2 -translate-y-1/2 pr-2 flex items-center pointer-events-none">
                                <span className="text-[10px] font-mono text-muted-foreground bg-surfaceHighlight px-1.5 py-0.5 rounded border border-surfaceHighlight">Enter</span>
                            </kbd>
                        </div>
                    </div>


                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 md:gap-4 ml-auto">
                        <ThemeToggle />
                        <button className="relative p-2 text-muted-foreground hover:text-[var(--text-main)] transition-colors rounded-full hover:bg-surface">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background"></span>
                        </button>
                        <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center text-muted-foreground md:hidden">
                            <User size={16} />
                        </div>
                    </div>
                </header>

                {/* Main Content Wrapper */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
