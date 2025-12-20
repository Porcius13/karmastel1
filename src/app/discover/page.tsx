"use client";

import Image from "next/image";
import { DashboardShell } from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import { DiscoverService, PublicUser, PublicCollection } from '@/lib/discover-service';
import { UserService, UserProfile } from '@/lib/user-service';
import { Compass, Search, User, Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";

export default function DiscoverPage() {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'featured' | 'following'>('featured');

    // Data States
    const [featuredUsers, setFeaturedUsers] = useState<PublicUser[]>([]);
    const [publicCollections, setPublicCollections] = useState<PublicCollection[]>([]);
    const [followedCollections, setFollowedCollections] = useState<PublicCollection[]>([]);

    // Loading States
    const [loading, setLoading] = useState(true);
    const [followingLoading, setFollowingLoading] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Initial Fetch (Featured)
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const users = await DiscoverService.getFeaturedUsers();
                setFeaturedUsers(users);
                const collections = await DiscoverService.getPublicCollections();
                setPublicCollections(collections);
            } catch (error) {
                console.error("Error fetching discover data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Fetch Followed Collections when tab changes
    useEffect(() => {
        if (activeTab === 'following' && currentUser && followedCollections.length === 0) {
            const fetchFollowing = async () => {
                try {
                    setFollowingLoading(true);
                    const cols = await DiscoverService.getFollowedCollections(currentUser.uid);
                    setFollowedCollections(cols);
                } catch (error) {
                    console.error("Error fetching followed collections:", error);
                } finally {
                    setFollowingLoading(false);
                }
            };
            fetchFollowing();
        }
    }, [activeTab, currentUser, followedCollections.length]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await UserService.searchUsers(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error("Search error:", error);
        }
        setIsSearching(false);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
    };

    const renderCollectionGrid = (collections: PublicCollection[], isLoading: boolean, emptyMessage: string) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl aspect-[4/3] bg-surface-secondary animate-pulse" />
                ))
            ) : collections.length > 0 ? (
                collections.map((col) => (
                    <Link href={`/collection/${col.id}`} key={col.id}>
                        <article className="flex flex-col gap-3 group cursor-pointer">
                            <div className="relative overflow-hidden rounded-xl aspect-[4/3] bg-surface-secondary border border-border/50">
                                {col.previewImages[0] ? (
                                    <Image
                                        alt={col.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        src={col.previewImages[0]}
                                        width={400}
                                        height={300}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <span className="material-symbols-outlined text-4xl">folder_off</span>
                                    </div>
                                )}

                                {/* Overlay Info */}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                                    <h3 className="font-bold text-lg text-white group-hover:text-primary-foreground transition-colors">
                                        {col.name}
                                    </h3>
                                    <p className="text-xs text-gray-300">{col.itemCount} items</p>
                                </div>
                            </div>
                        </article>
                    </Link>
                ))
            ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground bg-surface rounded-xl border border-dashed border-border flex flex-col items-center gap-2">
                    <p>{emptyMessage}</p>
                </div>
            )}
        </div>
    );

    return (
        <DashboardShell>
            <div className="layout-content-container flex flex-col max-w-[1200px] mx-auto w-full gap-8 pb-12">

                {/* Hero / Header */}
                <header className="flex flex-col gap-6 relative">
                    <div className="relative overflow-hidden rounded-2xl min-h-[280px] bg-gray-900 group">
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{
                                backgroundImage:
                                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBON-NUEASw4n1JY1wa-iF6sefbY6qatthGR6EhPQ7K4wrjks8F4-lJJ0suuhlKxKsee6bVF8NxkOccNAGTJuRwfpDc7lDquAIi5FZwTqlaS5hOj0yq6Osb54O3Y-s3su6Y0OvszOEniquZykIbnz8m1796sVsVh-sbt_hoQH6DRURpMtZypIFkvIjM4Nk4aqZ2VjaPHV5KkSEXgQkQybSJRfBisCMsu1QhdItY_HKBt0ZipoUx8AqBLjBAEJm6vp8ohpoPZDESIO3f")',
                            }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-8 max-w-2xl">
                            <span className="inline-block px-3 py-1 mb-3 text-xs font-bold tracking-wider text-black uppercase bg-primary rounded-full">
                                Editor's Pick
                            </span>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                                Discover what the world is keeping.
                            </h1>
                        </div>
                    </div>
                </header>

                <div className="text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4 text-primary">
                        <Compass size={32} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                        Discover & Connect
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                        Find inspiration, follow curators, and explore trending collections from the community.
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="max-w-md mx-auto relative flex items-center mb-8">
                        <Search className="absolute left-4 text-muted-foreground" size={20} />
                        <input
                            type="text"
                            placeholder="Search users by username..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (e.target.value === '') clearSearch();
                            }}
                            className="w-full bg-surface border border-surfaceHighlight rounded-full py-3.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                        />
                        {searchQuery && (
                            <button
                                type="submit"
                                className="absolute right-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
                            >
                                Search
                            </button>
                        )}
                    </form>
                </div>

                {/* Tabs Navigation */}
                {!searchQuery && (
                    <div className="flex justify-center border-b border-border/50 mb-4">
                        <button
                            onClick={() => setActiveTab('featured')}
                            className={`px-8 py-3 text-lg font-bold border-b-4 transition-all ${activeTab === 'featured'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Featured
                        </button>
                        <button
                            onClick={() => setActiveTab('following')}
                            className={`px-8 py-3 text-lg font-bold border-b-4 transition-all flex items-center gap-2 ${activeTab === 'following'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Following
                        </button>
                    </div>
                )}

                {/* Search Results (Conditional) */}
                {searchQuery && searchResults.length > 0 ? (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold text-foreground mb-6">Search Results</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {searchResults.map((user) => (
                                <Link href={`/user/${user.uid}`} key={user.uid} className="flex items-center gap-4 p-4 bg-surface border border-surfaceHighlight rounded-2xl hover:border-primary/50 transition-all group">
                                    <div className="w-12 h-12 rounded-full bg-surface-secondary overflow-hidden flex-shrink-0">
                                        {user.photoURL ? (
                                            <Image src={user.photoURL} alt={user.username || 'User'} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <User size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{user.displayName}</h3>
                                        <p className="text-sm text-muted-foreground">@{user.username || 'user'}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : !searchQuery && (
                    <>
                        {/* Tab Content */}
                        {activeTab === 'featured' ? (
                            <>
                                {/* Featured Curators */}
                                <section className="mb-12">
                                    <h2 className="text-2xl font-bold text-foreground mb-4">Featured Curators</h2>
                                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                        {loading ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <div key={i} className="w-16 h-16 rounded-full bg-surface-secondary animate-pulse shrink-0" />
                                            ))
                                        ) : (
                                            featuredUsers.map((user) => (
                                                <Link href={`/user/${user.id}`} key={user.id} className="flex flex-col items-center gap-2 cursor-pointer group shrink-0 w-20">
                                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all p-0.5">
                                                        {user.photoURL ? (
                                                            <Image
                                                                src={user.photoURL}
                                                                alt={user.username}
                                                                width={64}
                                                                height={64}
                                                                className="rounded-full w-full h-full object-cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-surface-secondary flex items-center justify-center rounded-full text-muted-foreground">
                                                                <User size={24} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-medium text-muted-foreground truncate w-full text-center group-hover:text-foreground">
                                                        @{user.username}
                                                    </p>
                                                </Link>
                                            ))
                                        )}
                                    </div>
                                </section>

                                {/* Trending Collections Grid */}
                                <section>
                                    <h2 className="text-2xl font-bold text-foreground mb-4">Trending Collections</h2>
                                    {renderCollectionGrid(publicCollections, loading, "No public collections found yet.")}
                                </section>
                            </>
                        ) : (
                            /* Following Tab Content */
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold text-foreground">From People You Follow</h2>
                                    <Link href="/discover" className="text-sm text-primary hover:underline" onClick={() => setActiveTab('featured')}>Find more people</Link>
                                </div>

                                {currentUser ? (
                                    renderCollectionGrid(followedCollections, followingLoading, "The people you follow haven't shared any public collections yet (or you aren't following anyone!).")
                                ) : (
                                    <div className="py-20 text-center bg-surface/30 rounded-3xl border border-dashed border-border">
                                        <Users size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                                        <h3 className="text-xl font-bold text-foreground mb-2">Sign in to follow curators</h3>
                                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">Create an account to follow your favorite curators and see their collections here.</p>
                                        <Link href="/login" className="bg-primary text-black font-bold px-8 py-3 rounded-full hover:bg-primary/90 transition-colors inline-block">
                                            Sign In / Register
                                        </Link>
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                )}
            </div>
        </DashboardShell>
    );
}
