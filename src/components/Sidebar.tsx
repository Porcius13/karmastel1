"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const navItems = [
        { name: 'Ana Sayfa', href: '/', icon: 'home' },
        { name: 'Koleksiyonlar', href: '/collections', icon: 'category' },
        { name: 'İstatistikler', href: '/stats', icon: 'bar_chart' },
        { name: 'Ayarlar', href: '/settings', icon: 'settings' },
    ];

    return (
        <aside
            className={`relative h-screen bg-background-light border-r border-[#f0f0eb] transition-all duration-300 ease-in-out flex flex-col ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-8 bg-white border border-[#f0f0eb] rounded-full p-1 shadow-sm hover:scale-110 transition-transform z-50 text-text-secondary"
            >
                <span className="material-symbols-outlined text-[18px]">
                    {isCollapsed ? 'chevron_right' : 'chevron_left'}
                </span>
            </button>

            {/* Logo */}
            <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                {isCollapsed ? (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-text-main text-xs">M</div>
                ) : (
                    <h1 className="text-2xl font-bold tracking-tighter text-text-main">Miayis</h1>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-white shadow-sm text-text-main font-medium'
                                    : 'text-text-secondary hover:bg-white/50 hover:text-text-main'
                                } ${isCollapsed ? 'justify-center' : ''}`}
                        >
                            <span className={`material-symbols-outlined transition-colors ${isActive ? 'text-text-main' : 'text-text-secondary group-hover:text-text-main'}`}>
                                {item.icon}
                            </span>

                            {!isCollapsed && (
                                <span className="text-sm">{item.name}</span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {isCollapsed && (
                                <div className="absolute left-16 bg-text-main text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                    {item.name}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User / Bottom Section */}
            <div className="p-4 border-t border-[#f0f0eb]">
                <button className={`flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-surface-dark overflow-hidden flex items-center justify-center text-white shrink-0">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col items-start overflow-hidden">
                            <span className="text-sm font-medium text-text-main truncate w-full text-left">Kullanıcı</span>
                            <span className="text-xs text-text-secondary truncate w-full text-left">Ücretsiz Plan</span>
                        </div>
                    )}
                </button>
            </div>
        </aside>
    );
}
