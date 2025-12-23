"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { UserService, UserProfile } from "@/lib/user-service";
import { DiscoverService, PublicCollection } from "@/lib/discover-service";
import { MessageSquare, User, MapPin, Calendar, Link as LinkIcon, Lock, UserPlus, UserCheck, X, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getFirestore, collection, query, where, getDocs, getCountFromServer, doc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { chatService } from "@/lib/chat-service";
import { SocialService } from "@/lib/social-service";
import { Bookmark } from "lucide-react";

// Simple User List Modal Component
const UserListModal = ({ title, users, onClose, currentUserId, onAction, actionLoading }: {
    title: string,
    users: UserProfile[],
    onClose: () => void,
    currentUserId?: string,
    onAction?: (targetId: string) => Promise<void>,
    actionLoading?: string | null
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-surface border border-surfaceHighlight rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-surfaceHighlight">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-surfaceHighlight rounded-full">
                        <X size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto p-2">
                    {users.length > 0 ? (
                        <div className="flex flex-col gap-1">
                            {users.map(user => (
                                <div key={user.uid} className="flex items-center justify-between p-2 hover:bg-surfaceHighlight/50 rounded-xl transition-colors group">
                                    <Link
                                        href={`/user/${user.uid}`}
                                        onClick={onClose}
                                        className="flex items-center gap-3 flex-1"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-surface-secondary overflow-hidden border border-border shrink-0">
                                            {user.photoURL ? (
                                                <Image src={user.photoURL} alt={user.username || "User"} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground"><User size={20} /></div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{user.displayName}</span>
                                            {user.username && <span className="text-xs text-muted-foreground">@{user.username}</span>}
                                        </div>
                                    </Link>

                                    {onAction && currentUserId && user.uid !== currentUserId && (
                                        <button
                                            onClick={() => onAction(user.uid)}
                                            disabled={actionLoading === user.uid}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 border ${(user as any).isFollowing
                                                ? "bg-surfaceHighlight text-foreground border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20"
                                                : "bg-primary text-black border-primary"
                                                }`}
                                        >
                                            {actionLoading === user.uid ? "..." : ((user as any).isFollowing ? "Takip Ediliyor" : "Takip Et")}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">None found.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const userId = params?.userId as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [collections, setCollections] = useState<PublicCollection[]>([]);
    const [savedCollections, setSavedCollections] = useState<any[]>([]);
    const [likedCollections, setLikedCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my' | 'saved' | 'liked'>('my');

    // Social State
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    // Modal State
    const [modalOpen, setModalOpen] = useState<'followers' | 'following' | null>(null);
    const [modalList, setModalList] = useState<UserProfile[]>([]);
    const [modalActionLoading, setModalActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;

        const loadData = async () => {
            // 1. Fetch User Profile
            const userProfile = await UserService.getUserProfile(userId);
            setProfile(userProfile);

            // 2. Check Follow Status
            if (currentUser && currentUser.uid !== userId) {
                const following = await UserService.isFollowing(currentUser.uid, userId);
                setIsFollowing(following);
            }

            // 3. Fetch Counts
            try {
                // Followers Count
                const followersColl = collection(db, "users", userId, "followers");
                const followersSnap = await getCountFromServer(followersColl);
                setFollowersCount(followersSnap.data().count);

                // Following Count
                const followingColl = collection(db, "users", userId, "following");
                const followingSnap = await getCountFromServer(followingColl);
                setFollowingCount(followingSnap.data().count);
            } catch (e) {
                console.error("Error fetching counts", e);
            }

            // 4. Fetch User's Public Collections
            try {
                const q = query(
                    collection(db, "collection_settings"),
                    where("userId", "==", userId),
                    where("isPublic", "==", true)
                );
                const snapshot = await getDocs(q);

                // Process collections in parallel to fetch cover images if needed
                const userColsPromise = snapshot.docs.map(async (colDoc) => {
                    const data = colDoc.data();
                    let imageUrl = data.image;

                    // If no explicit cover image, try to find the first product's image
                    if (!imageUrl) {
                        try {
                            const productsRef = collection(db, "products");
                            const prodQ = query(
                                productsRef,
                                where("userId", "==", userId),
                                where("collection", "==", data.name),
                                limit(1) // Just need one
                            );
                            const prodSnap = await getDocs(prodQ);
                            if (!prodSnap.empty) {
                                imageUrl = prodSnap.docs[0].data().image;
                            }
                        } catch (e) {
                            console.error("Error fetching cover for", data.name, e);
                        }
                    }

                    return {
                        id: colDoc.id,
                        name: data.name,
                        userId: data.userId, // Fixed: Interface expects userId
                        ownerId: data.userId, // Keep ownerId if needed for other components, or remove if not in interface
                        ownerName: userProfile?.displayName || "User",
                        itemCount: 0, // Todo: Count
                        previewImages: imageUrl ? [imageUrl] : []
                    } as PublicCollection;
                });

                const userCols = await Promise.all(userColsPromise);
                setCollections(userCols);
            } catch (err) {
                console.error("Error fetching user collections", err);
            }

            // 5. Fetch Saved Collections if it's currentUser's profile
            if (currentUser && currentUser.uid === userId) {
                try {
                    const saved = await SocialService.getSavedCollections(userId);
                    // Minimal hydration for preview
                    const hydratedSaved = await Promise.all(saved.map(async (item: any) => {
                        try {
                            const productsRef = collection(db, "products");
                            const q = query(
                                productsRef,
                                where("userId", "==", item.ownerId),
                                where("collection", "==", item.collectionName),
                                limit(1)
                            );
                            const snap = await getDocs(q);
                            return {
                                ...item,
                                previewImage: snap.empty ? null : snap.docs[0].data().image
                            };
                        } catch (e) { return item; }
                    }));
                    setSavedCollections(hydratedSaved);
                } catch (e) {
                    console.error("Error fetching saved collections", e);
                }

                // Fetch Liked Collections
                try {
                    const liked = await SocialService.getLikedCollections(userId);
                    const hydratedLiked = await Promise.all(liked.map(async (item: any) => {
                        try {
                            const productsRef = collection(db, "products");
                            const q = query(
                                productsRef,
                                where("userId", "==", item.ownerId),
                                where("collection", "==", item.collectionName),
                                limit(1)
                            );
                            const snap = await getDocs(q);
                            return {
                                ...item,
                                previewImage: snap.empty ? null : snap.docs[0].data().image
                            };
                        } catch (e) { return item; }
                    }));
                    setLikedCollections(hydratedLiked);
                } catch (e) {
                    console.error("Error fetching liked collections", e);
                }
            }

            setLoading(false);
        };
        loadData();
    }, [userId, currentUser]);

    const handleFollow = async () => {
        if (!currentUser) {
            alert("Please sign in to follow users.");
            return;
        }
        if (followLoading) return;

        setFollowLoading(true);
        // Optimistic update
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        setFollowersCount(prev => wasFollowing ? prev - 1 : prev + 1);

        try {
            if (wasFollowing) {
                await UserService.unfollowUser(currentUser.uid, userId);
            } else {
                await UserService.followUser(currentUser.uid, userId);
            }
        } catch (error) {
            console.error("Follow action failed:", error);
            // Revert
            setIsFollowing(wasFollowing);
            setFollowersCount(prev => wasFollowing ? prev + 1 : prev - 1);
        } finally {
            setFollowLoading(false);
        }
    };

    const openModal = async (type: 'followers' | 'following') => {
        setModalOpen(type);
        setModalList([]); // Clear previous

        try {
            let list: UserProfile[] = [];
            if (type === 'followers') {
                list = await UserService.getFollowers(userId);
            } else {
                list = await UserService.getFollowing(userId);
            }

            // Hydrate with follow status for current user
            if (currentUser) {
                const hydratedList = await Promise.all(list.map(async (u) => {
                    const following = await UserService.isFollowing(currentUser.uid, u.uid);
                    return { ...u, isFollowing: following };
                }));
                setModalList(hydratedList as any);
            } else {
                setModalList(list);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleModalAction = async (targetId: string) => {
        if (!currentUser) return;
        if (modalActionLoading) return;

        setModalActionLoading(targetId);
        try {
            const userInList = modalList.find(u => u.uid === targetId);
            const isCurrentlyFollowing = (userInList as any)?.isFollowing;

            if (isCurrentlyFollowing) {
                // Unfollow
                await UserService.unfollowUser(currentUser.uid, targetId);

                // Update local list state
                setModalList(prev => prev.map(u =>
                    u.uid === targetId ? { ...u, isFollowing: false } : u
                ));

                // If looking at own following list, decrement count
                if (modalOpen === 'following' && userId === currentUser.uid) {
                    setFollowingCount(prev => prev - 1);
                }
            } else {
                // Follow
                await UserService.followUser(currentUser.uid, targetId);

                // Update local list state
                setModalList(prev => prev.map(u =>
                    u.uid === targetId ? { ...u, isFollowing: true } : u
                ));

                // If looking at own following list, increment count
                if (modalOpen === 'following' && userId === currentUser.uid) {
                    setFollowingCount(prev => prev + 1);
                }
            }
        } catch (e) {
            console.error("Modal action failed", e);
        } finally {
            setModalActionLoading(null);
        }
    };

    if (loading) {
        return (
            <DashboardShell>
                <div className="flex items-center justify-center h-screen">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            </DashboardShell>
        );
    }

    if (!profile) {
        return (
            <DashboardShell>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <h1 className="text-2xl font-bold mb-2">User not found</h1>
                    <p className="text-muted-foreground mb-6">The user you are looking for does not exist.</p>
                    <Link href="/discover" className="text-primary hover:underline">Return to Discover</Link>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell>
            {modalOpen && (
                <UserListModal
                    title={modalOpen === 'followers' ? 'Followers' : 'Following'}
                    users={modalList}
                    onClose={() => setModalOpen(null)}
                    currentUserId={currentUser?.uid}
                    onAction={currentUser?.uid === userId ? handleModalAction : undefined}
                    actionLoading={modalActionLoading}
                />
            )}

            <div className="max-w-4xl mx-auto pb-20">
                {/* Profile Header */}
                <div className="bg-surface rounded-3xl p-8 mb-8 border border-surfaceHighlight flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-surfaceHighlight/30 to-transparent -z-10 pointer-events-none" />

                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surfaceHighlight bg-surface-secondary shrink-0 shadow-xl">
                        {profile.photoURL ? (
                            <Image
                                src={profile.photoURL}
                                alt={profile.username || "User"}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <User size={48} />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-foreground">{profile.displayName}</h1>
                                <p className="text-lg text-muted-foreground font-medium">@{profile.username}</p>
                            </div>

                            {/* Follow Stats */}
                            <div className="flex items-center gap-6 bg-surface-secondary/50 px-6 py-3 rounded-2xl border border-surfaceHighlight/50 backdrop-blur-sm">
                                <button onClick={() => openModal('following')} className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                                    <span className="font-black text-xl text-foreground">{followingCount}</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Following</span>
                                </button>
                                <div className="w-px h-8 bg-border" />
                                <button onClick={() => openModal('followers')} className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                                    <span className="font-black text-xl text-foreground">{followersCount}</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Followers</span>
                                </button>
                            </div>
                        </div>

                        {profile.bio && (
                            <p className="text-muted-foreground max-w-lg mx-auto md:mx-0 pt-2">{profile.bio}</p>
                        )}

                        <div className="flex items-center justify-center md:justify-start gap-4 pt-4">
                            {currentUser && currentUser.uid === userId ? (
                                <Link href="/settings/profile" className="bg-surfaceHighlight text-foreground font-bold px-8 py-2.5 rounded-xl hover:bg-surfaceHighlight/80 transition-colors border border-border">
                                    Edit Profile
                                </Link>
                            ) : (
                                <button
                                    onClick={handleFollow}
                                    disabled={followLoading}
                                    className={`flex items-center gap-2 font-bold px-8 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg ${isFollowing
                                        ? "bg-surfaceHighlight text-foreground border border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20"
                                        : "bg-primary text-black hover:bg-primary/90 hover:shadow-primary/20"
                                        }`}
                                >
                                    {isFollowing ? (
                                        <>
                                            <UserCheck size={20} />
                                            <span>Following</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={20} />
                                            <span>Follow</span>
                                        </>
                                    )}
                                </button>
                            )}
                            <button className="bg-surfaceHighlight text-foreground font-bold px-6 py-2.5 rounded-xl hover:bg-surfaceHighlight/80 transition-colors border border-border">
                                Share Profile
                            </button>

                            {currentUser && currentUser.uid !== userId && (
                                <button
                                    onClick={() => router.push(`/messages/${chatService.getChatId(currentUser.uid, userId)}`)}
                                    className="bg-primary text-black font-bold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition-all border border-primary active:scale-95 flex items-center gap-2 shadow-lg shadow-primary/20"
                                >
                                    <MessageSquare size={20} />
                                    <span>Mesaj Gönder</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Collections Section */}
                <div>
                    <div className="flex items-center justify-between border-b border-surfaceHighlight mb-8">
                        <div className="flex gap-8">
                            <button
                                onClick={() => setActiveTab('my')}
                                className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'my' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Public Collections
                                {activeTab === 'my' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full transition-all" />}
                            </button>
                            {currentUser && currentUser.uid === userId && (
                                <button
                                    onClick={() => setActiveTab('saved')}
                                    className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'saved' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Saved Collections
                                    {activeTab === 'saved' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full transition-all" />}
                                </button>
                            )}
                            {currentUser && currentUser.uid === userId && (
                                <button
                                    onClick={() => setActiveTab('liked')}
                                    className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'liked' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Liked Collections
                                    {activeTab === 'liked' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full transition-all" />}
                                </button>
                            )}
                        </div>
                    </div>

                    {activeTab === 'my' ? (
                        collections.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {collections.map(col => (
                                    <Link href={`/collection/${col.id}`} key={col.id}>
                                        <div className="group cursor-pointer flex flex-col gap-3">
                                            <div className="relative overflow-hidden rounded-xl aspect-[4/3] bg-surface-secondary border border-border/50 shadow-md group-hover:shadow-xl transition-all duration-300">
                                                {col.previewImages?.[0] ? (
                                                    <Image
                                                        src={col.previewImages[0]}
                                                        alt={col.name}
                                                        width={400}
                                                        height={300}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                                        <Lock size={32} />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
                                                    <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{col.name}</h3>
                                                    <p className="text-xs text-white/70">{col.itemCount > 0 ? `${col.itemCount} items` : 'Collection'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center bg-surface/30 rounded-2xl border border-dashed border-border text-muted-foreground">
                                <p className="text-lg mb-2">No public collections yet.</p>
                                <p className="text-sm">This user hasn't shared any collections publicly.</p>
                            </div>
                        )
                    ) : activeTab === 'saved' ? (
                        savedCollections.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {savedCollections.map(col => (
                                    <Link href={`/collection/${col.collectionId}`} key={col.id}>
                                        <div className="group cursor-pointer flex flex-col gap-3">
                                            <div className="relative overflow-hidden rounded-xl aspect-[4/3] bg-surface-secondary border border-border/50 shadow-md group-hover:shadow-xl transition-all duration-300">
                                                {col.previewImage ? (
                                                    <Image
                                                        src={col.previewImage}
                                                        alt={col.collectionName}
                                                        width={400}
                                                        height={300}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                                        <Bookmark size={32} />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
                                                    <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{col.collectionName}</h3>
                                                    <p className="text-xs text-white/70">Saved Collection</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center bg-surface/30 rounded-2xl border border-dashed border-border text-muted-foreground">
                                <p className="text-lg mb-2">No saved collections yet.</p>
                                <p className="text-sm">Collections you save from others will appear here.</p>
                            </div>
                        )
                    ) : (
                        likedCollections.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {likedCollections.map(col => (
                                    <Link href={`/collection/${col.collectionId}`} key={col.id}>
                                        <div className="group cursor-pointer flex flex-col gap-3">
                                            <div className="relative overflow-hidden rounded-xl aspect-[4/3] bg-surface-secondary border border-border/50 shadow-md group-hover:shadow-xl transition-all duration-300">
                                                {col.previewImage ? (
                                                    <Image
                                                        src={col.previewImage}
                                                        alt={col.collectionName}
                                                        width={400}
                                                        height={300}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                                        <Heart size={32} />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
                                                    <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{col.collectionName}</h3>
                                                    <p className="text-xs text-white/70">Liked Collection</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center bg-surface/30 rounded-2xl border border-dashed border-border text-muted-foreground">
                                <p className="text-lg mb-2">No liked collections yet.</p>
                                <p className="text-sm">Collections you like from others will appear here.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </DashboardShell>
    );
}
