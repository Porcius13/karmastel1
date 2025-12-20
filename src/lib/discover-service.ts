import { db } from "./firebase";
import { collection, query, where, limit, getDocs, orderBy } from "firebase/firestore";

export interface PublicUser {
    id: string;
    username: string;
    photoURL: string | null;
    firstName?: string;
    lastName?: string;
}

export interface PublicCollection {
    id: string;
    name: string;
    userId: string;
    username?: string; // Hydrated later
    previewImages: string[];
    itemCount: number;
}

export const DiscoverService = {
    // Fetch recent users for the "Featured Curators" section
    getFeaturedUsers: async (limitCount = 10): Promise<PublicUser[]> => {
        try {
            const usersRef = collection(db, "users");
            // Ideally order by 'createdAt' desc, but needs index. 
            // For MVP, just limit.
            const q = query(usersRef, limit(limitCount));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    username: data.username || "User",
                    photoURL: data.photoURL || null,
                    firstName: data.firstName,
                    lastName: data.lastName
                };
            });
        } catch (error) {
            console.error("Error fetching featured users:", error);
            return [];
        }
    },

    // Fetch collections marked as public
    getPublicCollections: async (limitCount = 6): Promise<PublicCollection[]> => {
        try {
            const colsRef = collection(db, "collection_settings");
            const q = query(
                colsRef,
                where("isPublic", "==", true),
                limit(limitCount)
            );

            // Note: This query requires a Firestore Index (isPublic ASC). 
            // If it fails, it usually logs a link to create the index.
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return [];
            }

            const collections: PublicCollection[] = [];

            for (const colDoc of snapshot.docs) {
                const data = colDoc.data();

                // Fetch preview images from products in this collection
                const productsRef = collection(db, "products");
                const productsQuery = query(
                    productsRef,
                    where("userId", "==", data.userId),
                    where("collection", "==", data.name),
                    limit(3)
                );
                const productsSnap = await getDocs(productsQuery);
                const images = productsSnap.docs.map(d => d.data().image).filter(Boolean);

                collections.push({
                    id: colDoc.id,
                    name: data.name,
                    userId: data.userId,
                    previewImages: images,
                    itemCount: productsSnap.size // Approximate for preview
                });
            }

            return collections;

        } catch (error) {
            console.error("Error fetching public collections:", error);
            return [];
        }
    },
    // Fetch collections from users the current user follows
    getFollowedCollections: async (currentUserId: string, limitCount = 10): Promise<PublicCollection[]> => {
        try {
            // 1. Get list of followed user IDs
            const followingRef = collection(db, "users", currentUserId, "following");
            const followingSnap = await getDocs(followingRef);

            if (followingSnap.empty) return [];

            const followedUserIds = followingSnap.docs.map(doc => doc.id);

            // Firestore 'in' query supports max 10 values. 
            // For MVP, we'll take top 10 followed users. 
            // In production, we'd batch this or duplicate feed data.
            const topFollowedIds = followedUserIds.slice(0, 10);

            // 2. Query collections where userId is in this list from Firestore directly
            // Security Rules require 'isPublic == true' to be part of the query info for non-owners.
            const colsRef = collection(db, "collection_settings");
            const q = query(
                colsRef,
                where("userId", "in", topFollowedIds),
                where("isPublic", "==", true),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) return [];

            const collections: PublicCollection[] = [];

            for (const colDoc of snapshot.docs) {
                const data = colDoc.data();

                // Fetch preview images
                const productsRef = collection(db, "products");
                const productsQuery = query(
                    productsRef,
                    where("userId", "==", data.userId),
                    where("collection", "==", data.name),
                    limit(3)
                );
                const productsSnap = await getDocs(productsQuery);
                const images = productsSnap.docs.map(d => d.data().image).filter(Boolean);

                collections.push({
                    id: colDoc.id,
                    name: data.name,
                    userId: data.userId,
                    previewImages: images,
                    itemCount: productsSnap.size
                });
            }

            return collections;

        } catch (error) {
            console.error("Error fetching followed collections:", error);
            return [];
        }
    }
};
