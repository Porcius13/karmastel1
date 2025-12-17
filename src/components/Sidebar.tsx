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
    Hash,
    Settings,
    PanelLeftClose,
    LogOut,
    Infinity as InfinityIcon
} from 'lucide-react';

export default function Sidebar({ className, isCollapsed }: { className?: string, isCollapsed?: boolean }) {
    const pathname = usePathname();

    const menuItems = [
        { name: 'All Items', icon: List, href: '/' },
        { name: 'Favorites', icon: Heart, href: '/favorites' },
        { name: 'Purchased', icon: ShoppingBag, href: '/purchased' },
        { name: 'Archived', icon: Archive, href: '/archived' },
    ];

    const tags = [
        { name: 'Tech', count: 12 },
        { name: 'Clothes', count: 5 },
        { name: 'Home', count: 3 },
    ];

    return (
        <aside
            className={`
            h-full bg-surface border-r border-surfaceHighlight flex flex-col text-white flex-shrink-0 transition-all duration-300 ease-in-out
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
                    <button className="text-muted-foreground hover:text-white transition-colors">
                        <PanelLeftClose size={20} />
                    </button>
                )}
            </div>

            {/* Main Navigation */}
            <nav className={`flex-1 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent ${isCollapsed ? 'px-2' : 'px-4'}`}>

                <div className="mb-8">
                    <button className={`
                        flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5 group
                        ${isCollapsed ? 'w-12 h-12 p-0' : 'w-full p-3'}
                    `} title={isCollapsed ? "Add New Link" : undefined}>
                        <div className={`w-6 h-6 rounded-full bg-primary flex items-center justify-center text-black shrink-0 ${isCollapsed ? '' : ''}`}>
                            <Plus size={16} />
                        </div>
                        {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">Add New Link</span>}
                    </button>
                </div>

                <div className="space-y-1">
                    {!isCollapsed && <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 whitespace-nowrap">Menu</h3>}

                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={isCollapsed ? item.name : undefined}
                                className={`
                                    flex items-center gap-3 rounded-lg transition-all duration-200 group
                                    ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'}
                                    ${isActive
                                        ? 'bg-primary text-black font-medium shadow-lg shadow-primary/20'
                                        : 'text-muted-foreground hover:text-white hover:bg-white/5'}
                                `}
                            >
                                <item.icon size={20} className={`shrink-0 ${isActive ? 'text-black' : 'text-muted-foreground group-hover:text-white transition-colors'}`} />
                                {!isCollapsed && (
                                    <>
                                        <span className="whitespace-nowrap">{item.name}</span>
                                        {item.name === 'All Items' && (
                                            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-black/10 text-black' : 'bg-white/10 text-white'}`}>
                                                24
                                            </span>
                                        )}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className={`mt-8 space-y-1 ${isCollapsed ? 'hidden' : 'block'}`}>
                    <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between whitespace-nowrap">
                        <span>Tags</span>
                        <button className="hover:text-white transition-colors"><Plus size={14} /></button>
                    </h3>
                    {tags.map((tag) => (
                        <Link
                            key={tag.name}
                            href={`/tag/${tag.name.toLowerCase()}`}
                            className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                        >
                            <Hash size={18} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            <span className="text-sm whitespace-nowrap">{tag.name}</span>
                            <span className="ml-auto text-xs opacity-50">{tag.count}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Footer / User Profile */}
            <div className={`border-t border-surfaceHighlight/50 bg-background/20 mt-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center mb-2' : 'mb-3'}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm border-2 border-surface shrink-0">
                        MK
                        {isCollapsed && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-background"></span>}
                    </div>

                    {!isCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">Miayis Kept</p>
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
