"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    List,
    Heart,
    ShoppingBag,
    Archive,
    Plus,
    Folder,
    Hash,
    Settings,
    PanelLeftClose,
    LogOut,
    Infinity as InfinityIcon
} from 'lucide-react';

interface SidebarProps {
    className?: string;
    isCollapsed?: boolean;
    collections?: string[];
    activeCollection?: string;
    onSelectCollection?: (collection: string | null) => void;
    onAddCollection?: () => void;
}

export default function Sidebar({
    className,
    isCollapsed,
    collections = [],
    activeCollection,
    onSelectCollection,
    onAddCollection
}: SidebarProps) {
    const pathname = usePathname();

    const menuItems = [
        { name: 'All Items', icon: List, href: '/dashboard', action: () => onSelectCollection?.(null) },
        { name: 'Collections', icon: Folder, href: '/collections' },
        { name: 'Favorites', icon: Heart, href: '/favorites' },
        { name: 'Purchased', icon: ShoppingBag, href: '/purchased' },
        { name: 'Archived', icon: Archive, href: '/archived' },
    ];

    return (
        <aside
            className={`
            h-full bg-surface border-r border-surfaceHighlight flex flex-col text-[var(--text-main)] flex-shrink-0 transition-all duration-300 ease-in-out
            ${isCollapsed ? 'w-20 items-center' : 'w-72'}
            ${className}
          `}
        >

            {/* Header / Logo */}
            <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'} border-b border-surfaceHighlight/50 transition-all duration-300`}>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black shrink-0">
                        <InfinityIcon size={20} />
                    </div>
                    {!isCollapsed && (
                        <h1 className="text-xl font-bold tracking-tight animate-in fade-in duration-300 whitespace-nowrap">Kept.</h1>
                    )}
                </div>
                {!isCollapsed && (
                    <></>
                )}
            </div>

            {/* Main Navigation */}
            <nav className={`flex-1 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent ${isCollapsed ? 'px-2' : 'px-4'}`}>

                <div className="mb-8">
                    <button
                        onClick={onAddCollection}
                        className={`
                        flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-[var(--text-main)] rounded-xl transition-all border border-white/5 group
                        ${isCollapsed ? 'w-12 h-12 p-0' : 'w-full p-3'}
                    `} title={isCollapsed ? "Add New Collection" : undefined}>
                        <div className={`w-6 h-6 rounded-full bg-primary flex items-center justify-center text-black shrink-0 ${isCollapsed ? '' : ''}`}>
                            <Plus size={16} />
                        </div>
                        {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">Add Collection</span>}
                    </button>
                </div>

                <div className="space-y-1">
                    {!isCollapsed && <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 whitespace-nowrap">Menu</h3>}

                    {menuItems.map((item) => {
                        const isActive = item.name === 'All Items' ? (!activeCollection && pathname === '/dashboard') : pathname === item.href;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={(e) => {
                                    if (item.action) {
                                        if (item.name === 'All Items') {
                                            if (pathname === '/dashboard') {
                                                e.preventDefault();
                                                item.action?.();
                                            }
                                        }
                                    }
                                }}
                                title={isCollapsed ? item.name : undefined}
                                className={`
                                    flex items-center gap-3 rounded-lg transition-all duration-200 group cursor-pointer
                                    ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'}
                                    ${isActive
                                        ? 'bg-primary text-black font-medium shadow-lg shadow-primary/20'
                                        : 'text-muted-foreground hover:text-[var(--text-main)] hover:bg-white/5'}
                                `}
                            >
                                <item.icon size={20} className={`shrink-0 ${isActive ? 'text-black' : 'text-muted-foreground group-hover:text-[var(--text-main)] transition-colors'}`} />
                                {!isCollapsed && (
                                    <>
                                        <span className="whitespace-nowrap">{item.name}</span>
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className={`mt-8 space-y-1 ${isCollapsed ? 'hidden' : 'block'}`}>
                    <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between whitespace-nowrap">
                        <span>Collections</span>
                        <button onClick={onAddCollection} className="hover:text-[var(--text-main)] transition-colors"><Plus size={14} /></button>
                    </h3>
                    {collections.map((col) => {
                        const isColActive = activeCollection === col;
                        return (
                            <button
                                key={col}
                                onClick={() => onSelectCollection?.(col)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group
                                ${isColActive ? 'bg-white/10 text-[var(--text-main)]' : 'text-muted-foreground hover:text-[var(--text-main)] hover:bg-white/5'}
                            `}
                            >
                                <Hash size={18} className={`${isColActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'} transition-colors shrink-0`} />
                                <span className="text-sm whitespace-nowrap">{col}</span>
                            </button>
                        )
                    })}
                </div>
            </nav>

            {/* Footer / User Profile */}
            <div className={`border-t border-surfaceHighlight/50 bg-background/20 mt-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center mb-2' : 'mb-3'}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-[var(--text-main)] font-bold text-sm border-2 border-surface shrink-0">
                        MK
                        {isCollapsed && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-background"></span>}
                    </div>

                    {!isCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--text-main)] truncate">Miayis Kept</p>
                                <p className="text-xs text-muted-foreground truncate">Free Plan</p>
                            </div>
                            <Link href="/settings" className="text-muted-foreground hover:text-primary transition-colors">
                                <Settings size={20} />
                            </Link>
                        </>
                    )}
                </div>

                {!isCollapsed && (
                    <button className="w-full flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-danger hover:bg-danger/10 p-2 rounded-lg transition-colors">
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                )}
            </div>
        </aside>
    );
}
