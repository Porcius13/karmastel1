"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";

export default function Navbar() {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    return (
        <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/20">
            <div className="px-4 md:px-8 xl:px-12 py-3 mx-auto max-w-[1600px]">
                <div className="flex items-center justify-between gap-4">

                    {/* Logo */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="size-8 text-foreground">
                                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z"
                                        fill="currentColor"
                                    ></path>
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Miayis</h1>
                        </Link>
                    </div>

                    {/* Centered Input Field */}
                    <div className="flex-1 max-w-[600px] mx-4 hidden md:block">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-gray-400">link</span>
                            </div>
                            <input
                                className="block w-full pl-12 pr-14 py-3 bg-surface border-none rounded-full text-sm font-medium placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:bg-surface transition-all shadow-sm outline-none"
                                placeholder={t('common.paste_link')}
                                type="text"
                            />
                            <div className="absolute inset-y-0 right-1.5 flex items-center">
                                <button className="bg-background hover:bg-primary text-foreground hover:text-primary-foreground p-1.5 rounded-full shadow-sm transition-colors duration-200 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px]">add</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button className="hidden lg:flex h-10 px-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:brightness-95 transition-all">
                            {t('common.upgradePro')}
                        </button>
                        <button className="flex size-10 items-center justify-center rounded-full bg-surface hover:bg-muted/10 transition-colors text-foreground">
                            <span className="material-symbols-outlined text-[22px]">notifications</span>
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex size-10 items-center justify-center rounded-full bg-surface hover:bg-muted/10 transition-colors overflow-hidden border border-border"
                            >
                                {user?.photoURL && !imageError ? (
                                    <Image
                                        alt="User Avatar"
                                        className="object-cover"
                                        src={user.photoURL}
                                        fill
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <User size={20} className="text-muted-foreground" />
                                )}
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-border bg-muted/50">
                                        <p className="text-sm font-bold text-foreground truncate">{user?.displayName || t('common.user')}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                    </div>
                                    <div className="p-2">
                                        <Link
                                            href="/settings/profile"
                                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <Settings size={16} />
                                            {t('common.settings')}
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                                        >
                                            <LogOut size={16} />
                                            {t('common.logout')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
