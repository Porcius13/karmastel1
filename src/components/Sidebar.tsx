"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    List,
    Heart,
    Plus,
    Folder,
    Hash,
    PanelLeftClose,
    LogOut,
    Compass,
    MessageSquare,
    Bookmark,
    Users,
    AlertCircle
} from 'lucide-react';
import { chatService } from '@/lib/chat-service';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { UserService } from '@/lib/user-service';
import { CollectionService } from '@/lib/collection-service';

interface SidebarProps {
    className?: string;
    isCollapsed?: boolean;
    collections?: string[];
    activeCollection?: string;
    onSelectCollection?: (collection: string | null) => void;
    onAddCollection?: () => void;
}

import { isUserAdmin } from '@/lib/constants';

export default function Sidebar({
    className,
    isCollapsed,
    collections = [],
    activeCollection,
    onSelectCollection,
    onAddCollection
}: SidebarProps) {
    const pathname = usePathname();
    const { user, profile } = useAuth();
    const { t } = useLanguage();
    const [unreadCount, setUnreadCount] = React.useState(0);

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = chatService.subscribeToChats(user.uid, (chats) => {
            const total = chats.reduce((acc, chat) => acc + (chat.unreadCount?.[user.uid] || 0), 0);
            setUnreadCount(total);
        }, (err) => console.error("Sidebar Chat Listener Error:", err));
        return () => unsubscribe();
    }, [user]);

    const isAdmin = isUserAdmin(profile?.username);

    const menuItems = [
        { name: t('common.discover'), icon: Compass, href: '/discover' },
        { name: t('common.all_items'), icon: List, href: '/dashboard', action: () => onSelectCollection?.(null) },
        { name: t('common.collections'), icon: Folder, href: '/collections' },
        { name: t('common.favorites'), icon: Heart, href: '/favorites' },
        { name: t('common.saved'), icon: Bookmark, href: '/collections/saved' },
        { name: t('common.messages'), icon: MessageSquare, href: '/messages', badge: unreadCount },
        ...(isAdmin ? [{ name: 'Hata Günlükleri', icon: AlertCircle, href: '/admin/errors' }] : []),
    ];

    return (
        <aside
            className={`
            h-full bg-surface border-r border-surfaceHighlight flex flex-col text-foreground flex-shrink-0 transition-all duration-300 ease-in-out
            ${isCollapsed ? 'w-20 items-center' : 'w-72'}
            ${className}
          `}
        >

            {/* Header / Logo */}
            <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'} border-b border-surfaceHighlight/50 transition-all duration-300`}>
                <Link href="/dashboard" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    <img src="/brand-logo-light.png" alt="Kept Logo" className="w-12 h-12 object-contain rounded-xl block dark:hidden" />
                    <img src="/brand-logo-dark.png" alt="Kept Logo" className="w-12 h-12 object-contain rounded-xl hidden dark:block" />
                    {!isCollapsed && (
                        <h1 className="text-3xl animate-in fade-in duration-300 whitespace-nowrap text-foreground" style={{ fontFamily: "'Luckiest Guy', var(--font-luckiest-guy), cursive" }}>FAVDUCK</h1>
                    )}
                </Link>
            </div>

            {/* Main Navigation */}
            <nav className={`flex-1 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent ${isCollapsed ? 'px-2' : 'px-4'}`}>

                <div className="mb-8">
                    <Link
                        href="/collections/create"
                        className={`
                        flex items-center justify-center gap-3 bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-foreground rounded-xl transition-all border border-border group
                        ${isCollapsed ? 'w-12 h-12 p-0' : 'w-full p-3'}
                    `} title={isCollapsed ? t('common.add_collection') : undefined}>
                        <div className={`w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0 ${isCollapsed ? '' : ''}`}>
                            <Plus size={16} />
                        </div>
                        {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{t('common.add_collection')}</span>}
                    </Link>
                </div>

                <div className="space-y-1">
                    {!isCollapsed && <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 whitespace-nowrap">{t('common.menu')}</h3>}

                    {menuItems.map((item) => {
                        const isActive = item.href === '/dashboard' ? (!activeCollection && pathname === '/dashboard') : pathname === item.href;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={(e) => {
                                    if (item.action) {
                                        if (item.href === '/dashboard') {
                                            if (pathname === '/dashboard') {
                                                e.preventDefault();
                                                item.action?.();
                                            }
                                        }
                                    }
                                }}
                                title={isCollapsed ? item.name : undefined}
                                className={`
                                    flex items-center gap-3 rounded-lg transition-all duration-200 group cursor-pointer relative
                                    ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'}
                                    ${isActive
                                        ? 'bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-surfaceHighlight'}
                                `}
                            >
                                <item.icon size={20} className={`shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground transition-colors'}`} />
                                {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                                    <div className="absolute top-2 right-2 w-4 h-4 bg-primary text-primary-foreground text-[8px] font-black rounded-full flex items-center justify-center shadow-sm animate-pulse">
                                        {item.badge}
                                    </div>
                                )}
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 whitespace-nowrap">{item.name}</span>
                                        {item.badge !== undefined && item.badge > 0 && (
                                            <span className="bg-surfaceHighlight text-primary text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                                                {item.badge}
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
                        <span>{t('common.collections')}</span>
                        <Link href="/collections/create" className="hover:text-foreground transition-colors" ><Plus size={14} /></Link>
                    </h3>
                    {collections.map((col) => {
                        const isColActive = activeCollection === col;
                        const handleShare = async (e: React.MouseEvent) => {
                            e.stopPropagation();
                            const username = prompt("Enter username to invite:");
                            if (!username) return;

                            try {
                                const users = await UserService.searchUsers(username);
                                const found = users.find(u => u.username?.toLowerCase() === username.toLowerCase());
                                if (found) {
                                    const safeNameId = btoa(unescape(encodeURIComponent(col))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                                    const colId = `${user?.uid}_${safeNameId}`;
                                    await CollectionService.addCollaborator(colId, found.uid);
                                    alert(`Successfully added ${username} to ${col}!`);
                                } else {
                                    alert("User not found.");
                                }
                            } catch (err) {
                                console.error(err);
                                alert("Failed to add collaborator.");
                            }
                        };

                        return (
                            <div key={col} className="group/item relative">
                                <div
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer
                                    ${isColActive ? 'bg-surfaceHighlight text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-surfaceHighlight'}
                                `}
                                    onClick={() => onSelectCollection?.(col)}
                                >
                                    <Hash size={18} className={`${isColActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'} transition-colors shrink-0`} />
                                    <span className="text-sm flex-1 text-left truncate">{col}</span>
                                    {!isCollapsed && (
                                        <button
                                            onClick={handleShare}
                                            className="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-surfaceHighlight/80 rounded-md transition-all text-muted-foreground hover:text-primary z-10"
                                            title="Share collection"
                                        >
                                            <Users size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </nav>


        </aside>
    );
}
