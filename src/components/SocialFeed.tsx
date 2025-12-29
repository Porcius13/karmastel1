"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ActivityService, SocialActivity } from '@/lib/activity-service';
import { useAuth } from '@/context/AuthContext';
import { User, Package, Heart, Users, ExternalLink, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';

interface SocialFeedProps {
    followingIds: string[];
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ followingIds }) => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<SocialActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const cleanedIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const fetchFeed = async () => {
            if (!followingIds || followingIds.length === 0) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const feed = await ActivityService.getFollowedActivity(followingIds);

                // HYDRATION: Fetch missing prices for products to show them on older feed items
                const productActivitiesMissingPrice = feed.filter(a =>
                    a.type === 'ADD_PRODUCT' && (!a.metadata || !a.metadata.price)
                );

                if (productActivitiesMissingPrice.length > 0) {
                    const productIds = Array.from(new Set(productActivitiesMissingPrice.map(a => a.targetId))).filter(Boolean);

                    if (productIds.length > 0) {
                        // Max 30 IDs per 'in' query
                        const chunks = [];
                        for (let i = 0; i < productIds.length; i += 30) {
                            chunks.push(productIds.slice(i, i + 30));
                        }

                        const priceMap: Record<string, { price: any, currency: string }> = {};

                        await Promise.all(chunks.map(async (chunk) => {
                            const q = query(
                                collection(db, "products"),
                                where(documentId(), "in", chunk),
                                where("isPublic", "==", true)
                            );
                            const snap = await getDocs(q);
                            snap.docs.forEach(doc => {
                                const data = doc.data();
                                priceMap[doc.id] = {
                                    price: data.price,
                                    currency: data.currency || 'TRY'
                                };
                            });
                        }));

                        // Enrich the feed items with fetched prices
                        feed.forEach(a => {
                            if (a.type === 'ADD_PRODUCT' && (!a.metadata || !a.metadata.price) && priceMap[a.targetId]) {
                                a.metadata = {
                                    ...a.metadata,
                                    price: priceMap[a.targetId].price,
                                    currency: priceMap[a.targetId].currency
                                };
                            }
                        });
                    }
                }

                setActivities(feed);

                // Auto-cleanup own legacy activities in background
                if (user && user.uid) {
                    const myLegacyActivities = feed.filter(a =>
                        a.actorId === user.uid &&
                        (a.actorName === 'User' || a.actorName === 'Someone' || !a.id?.includes('_'))
                    );

                    if (myLegacyActivities.length > 0) {
                        const idsToClean = myLegacyActivities
                            .map(a => a.id!)
                            .filter(id => !cleanedIds.current.has(id));

                        if (idsToClean.length > 0) {
                            console.log(`[SocialFeed] Cleaning up ${idsToClean.length} legacy activities...`);
                            idsToClean.forEach(id => {
                                cleanedIds.current.add(id);
                                ActivityService.deleteActivity(id);
                            });
                            // Remove from local state immediately for better UI
                            setActivities(prev => prev.filter(a => !idsToClean.includes(a.id!)));
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching social feed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
    }, [followingIds.join(','), user?.uid]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-surface border border-surfaceHighlight rounded-2xl p-4 animate-pulse">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-surfaceHighlight shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-surfaceHighlight rounded w-1/3" />
                                <div className="h-3 bg-surfaceHighlight rounded w-1/4" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="py-20 text-center bg-surface/30 rounded-3xl border border-dashed border-border">
                <Users size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-foreground mb-2">Henüz hareket yok</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Takip ettiğin kişiler henüz bir şey paylaşmadı. Daha fazla kişiyi takip ederek akışını canlandırabilirsin!
                </p>
                <Link href="/discover" className="text-primary font-bold hover:underline">
                    Yeni Küratörler Keşfet
                </Link>
            </div>
        );
    }

    const formatActivityPrice = (activity: SocialActivity) => {
        const metadata = activity.metadata;
        if (!metadata || !metadata.price) return null;

        const price = metadata.price;
        const currency = metadata.currency || 'TRY';

        // Parse price if it's a string (e.g. "1.250 TL")
        const numericPrice = typeof price === 'string'
            ? parseFloat(price.replace(/[^0-9,.-]/g, '').replace(',', '.'))
            : price;

        if (isNaN(numericPrice)) return price; // Fallback to raw string if parsing fails

        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(numericPrice);
    };

    const renderActivityIcon = (type: string) => {
        switch (type) {
            case 'ADD_PRODUCT': return <Package size={14} className="text-primary" />;
            case 'LIKE_COLLECTION': return <Heart size={14} className="text-danger" fill="currentColor" />;
            case 'FOLLOW_USER': return <Users size={14} className="text-secondary" />;
            default: return <Clock size={14} />;
        }
    };

    const getActivityText = (activity: SocialActivity) => {
        switch (activity.type) {
            case 'ADD_PRODUCT': return 'yeni bir ürün ekledi';
            case 'LIKE_COLLECTION': return `'${activity.targetName}' koleksiyonunu beğendi`;
            case 'FOLLOW_USER': return 'yeni birini takip etmeye başladı';
            default: return 'bir işlem yaptı';
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => (
                <div key={activity.id} className="group relative bg-surface border border-surfaceHighlight rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 flex flex-col h-full">

                    {/* Activity Header - Social Context */}
                    <div className="p-4 flex items-center justify-between border-b border-surfaceHighlight/50">
                        <div className="flex items-center gap-2">
                            <Link href={`/user/${activity.actorId}`} className="shrink-0">
                                <div className="w-8 h-8 rounded-xl bg-surface-secondary overflow-hidden border border-border/50 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                    {activity.actorAvatar ? (
                                        <Image src={activity.actorAvatar} alt={activity.actorName} width={32} height={32} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <User size={16} />
                                        </div>
                                    )}
                                </div>
                            </Link>
                            <div className="min-w-0">
                                <p className="text-xs font-bold truncate">
                                    <Link href={`/user/${activity.actorId}`} className="text-foreground hover:text-primary transition-colors">
                                        {activity.actorName}
                                    </Link>
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {getActivityText(activity)}
                                </p>
                            </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap ml-2">
                            {activity.timestamp?.seconds ? formatDistanceToNow(new Date(activity.timestamp.seconds * 1000), { addSuffix: true, locale: tr }) : 'az önce'}
                        </span>
                    </div>

                    {/* Activity Content */}
                    <div className="flex flex-col flex-1">
                        {(activity.type === 'ADD_PRODUCT' || activity.type === 'LIKE_COLLECTION') ? (
                            <Link
                                href={activity.type === 'ADD_PRODUCT' ? `/product/${activity.targetId}` : `/collection/${activity.targetId}`}
                                className="block h-full flex flex-col"
                            >
                                {/* Media Block */}
                                <div className="relative aspect-square overflow-hidden bg-background">
                                    {activity.targetImage ? (
                                        <Image
                                            src={activity.targetImage}
                                            alt={activity.targetName}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-surface-secondary">
                                            <Package size={32} className="text-muted-foreground/20" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                                    {/* Action Type Badge */}
                                    <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md border border-white/10 px-2 py-1 rounded-xl flex items-center gap-1.5 text-white">
                                        <div className="scale-75 origin-center">{renderActivityIcon(activity.type)}</div>
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                            {activity.type === 'ADD_PRODUCT' ? 'Ürün' : 'Koleksiyon'}
                                        </span>
                                    </div>

                                    {/* Price Overlay */}
                                    {formatActivityPrice(activity) && (
                                        <div className="absolute bottom-3 right-3 bg-primary text-primary-foreground px-3 py-1.5 rounded-xl shadow-xl z-20 font-black border border-white/20">
                                            <span className="text-sm scale-110 origin-right inline-block">
                                                {formatActivityPrice(activity)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Info Block */}
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <h3 className="text-sm font-black text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-3">
                                        {activity.targetName}
                                    </h3>

                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest bg-surfaceHighlight/50 px-2 py-1 rounded-lg">
                                            Gör
                                            <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            /* Simple Activity (Follow etc) */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-secondary/30">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                    {renderActivityIcon(activity.type)}
                                </div>
                                <p className="text-xs text-muted-foreground font-medium">Bu işlem için görsel bulunmuyor.</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
