"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { UserService, UserProfile } from "@/lib/user-service";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SmartProductCard } from "@/components/SmartProductCard";
import { ArrowLeft, User, Heart, Bookmark } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SocialService } from "@/lib/social-service";
import { useAuth } from "@/context/AuthContext";

// Define locally for now to match SmartProductCard expectation
interface Product {
    id: string;
    title: string;
    image: string;
    price: string | number;
    url: string;
    inStock: boolean;
    aspect?: string;
    priceHistory?: any[];
    collection?: string;
    targetPrice?: number;
    isFavorite?: boolean;
}

interface CollectionData {
    id: string;
    name: string;
    userId: string;
    isPublic: boolean;
    image?: string;
    description?: string;
}

export default function PublicCollectionPage() {
    const params = useParams();
    const collectionId = params?.id as string;
    const { user } = useAuth();

    const [collectionData, setCollectionData] = useState<CollectionData | null>(null);
    const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Social State
    const [socialState, setSocialState] = useState({
        isLiked: false,
        isSaved: false,
        likeCount: 0
    });

    useEffect(() => {
        if (!collectionId) return;

        const loadData = async () => {
            try {
                // 1. Fetch Collection Metadata
                const colRef = doc(db, "collection_settings", collectionId);
                const colSnap = await getDoc(colRef);

                if (!colSnap.exists()) {
                    setError("Collection not found.");
                    setLoading(false);
                    return;
                }

                const data = colSnap.data() as CollectionData;
                const colInfo = { ...data, id: colSnap.id };

                if (!colInfo.isPublic) {
                    setError("This collection is private.");
                    setLoading(false);
                    return;
                }

                setCollectionData(colInfo);

                // 2. Fetch Owner Profile
                if (colInfo.userId) {
                    const profile = await UserService.getUserProfile(colInfo.userId);
                    setOwnerProfile(profile);
                }

                // 3. Fetch Products
                const productsRef = collection(db, "products");
                const qP = query(
                    productsRef,
                    where("userId", "==", colInfo.userId),
                    where("collection", "==", colInfo.name),
                    where("isPublic", "==", true)
                );
                const results = await getDocs(qP);
                const fetchedProducts = results.docs.map(d => ({
                    id: d.id,
                    ...(d.data() as any)
                })) as Product[];

                setProducts(fetchedProducts);

                // 4. Fetch Social Status
                if (user) {
                    SocialService.getCollectionSocialStatus(user.uid, collectionId).then(setSocialState);
                }

            } catch (err) {
                console.error("Error loading collection", err);
                setError("Failed to load collection.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [collectionId, user]);

    const handleToggleLike = async () => {
        if (!user || !collectionData) {
            alert("Please sign in to like collections.");
            return;
        }

        const oldState = { ...socialState };
        setSocialState(prev => ({
            ...prev,
            isLiked: !prev.isLiked,
            likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1
        }));

        try {
            await SocialService.toggleCollectionLike(user.uid, collectionData.id, collectionData.userId, collectionData.name);
        } catch (err) {
            console.error(err);
            setSocialState(oldState);
        }
    };

    const handleToggleSave = async () => {
        if (!user || !collectionData) {
            alert("Please sign in to save collections.");
            return;
        }

        const oldState = { ...socialState };
        setSocialState(prev => ({ ...prev, isSaved: !prev.isSaved }));

        try {
            await SocialService.toggleCollectionSave(user.uid, collectionData.id, collectionData.userId, collectionData.name);
        } catch (err) {
            console.error(err);
            setSocialState(oldState);
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

    if (error || !collectionData) {
        return (
            <DashboardShell>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <h1 className="text-2xl font-bold mb-2">Unavailable</h1>
                    <p className="text-muted-foreground mb-6">{error || "Collection not found."}</p>
                    <Link href="/discover" className="text-primary hover:underline flex items-center gap-2">
                        <ArrowLeft size={16} />
                        Back to Discover
                    </Link>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell>
            <div className="max-w-[1200px] mx-auto w-full pb-12">

                {/* Header */}
                <div className="mb-8">
                    <Link href="/discover" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors font-medium text-sm">
                        <ArrowLeft size={16} />
                        Back to Discover
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <span className="inline-block px-3 py-1 mb-3 text-xs font-bold tracking-wider text-primary bg-primary/10 rounded-full uppercase">
                                Collection
                            </span>
                            <h1 className="text-4xl font-black text-foreground mb-2">{collectionData.name}</h1>
                            {collectionData.description && (
                                <p className="text-muted-foreground max-w-2xl">{collectionData.description}</p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 mt-4">
                                <button
                                    onClick={handleToggleLike}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all active:scale-95 ${socialState.isLiked
                                        ? "bg-red-500/10 border-red-500/50 text-red-500"
                                        : "bg-surface border-surfaceHighlight hover:bg-surfaceHighlight text-muted-foreground hover:text-white"
                                        }`}
                                >
                                    <Heart size={18} className={socialState.isLiked ? "fill-current" : ""} />
                                    <span className="font-bold text-sm">{socialState.likeCount > 0 ? socialState.likeCount : "Like"}</span>
                                </button>

                                <button
                                    onClick={handleToggleSave}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all active:scale-95 ${socialState.isSaved
                                        ? "bg-primary/10 border-primary/50 text-primary"
                                        : "bg-surface border-surfaceHighlight hover:bg-surfaceHighlight text-muted-foreground hover:text-white"
                                        }`}
                                >
                                    <Bookmark size={18} className={socialState.isSaved ? "fill-current" : ""} />
                                    <span className="font-bold text-sm">{socialState.isSaved ? "Saved" : "Save"}</span>
                                </button>
                            </div>
                        </div>

                        {ownerProfile && (
                            <Link href={`/user/${ownerProfile.uid}`} className="flex items-center gap-3 bg-surface p-3 pr-6 rounded-full border border-surfaceHighlight hover:border-primary/50 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-surface-secondary overflow-hidden border border-border">
                                    {ownerProfile.photoURL ? (
                                        <Image src={ownerProfile.photoURL} alt={ownerProfile.username || 'User'} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <User size={18} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Curated by</span>
                                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">@{ownerProfile.username || ownerProfile.displayName}</span>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Products Grid */}
                {products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map(product => (
                            <SmartProductCard key={product.id} product={product} viewMode="grid" />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-surface/30 rounded-3xl border border-dashed border-border">
                        <p className="text-muted-foreground mb-4">No items in this collection yet.</p>
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
