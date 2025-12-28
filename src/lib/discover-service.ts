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

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return [];
            }

            const collections: PublicCollection[] = [];
            const { getCountFromServer } = await import("firebase/firestore");

            for (const colDoc of snapshot.docs) {
                const data = colDoc.data();

                const productsRef = collection(db, "products");

                // 1. Query for Preview Images
                const productsQuery = query(
                    productsRef,
                    where("userId", "==", data.userId),
                    where("collection", "==", data.name),
                    where("isPublic", "==", true),
                    limit(3)
                );
                const productsSnap = await getDocs(productsQuery);
                let images = productsSnap.docs.map(d => d.data().image).filter(Boolean);

                // Use manually set cover image if available
                if (data.image) {
                    // Remove duplicate if it exists in the fetched images to avoid showing it twice
                    images = images.filter(img => img !== data.image);
                    // Add to the front
                    images.unshift(data.image);
                }

                // 2. Query for Total Count (Separate to avoid fetching all docs)
                const countQuery = query(
                    productsRef,
                    where("userId", "==", data.userId),
                    where("collection", "==", data.name),
                    where("isPublic", "==", true)
                );

                let totalCount = 0;
                try {
                    const countSnapshot = await getCountFromServer(countQuery);
                    totalCount = countSnapshot.data().count;
                } catch (err) {
                    console.warn("Could not get count from server", err);
                    totalCount = productsSnap.size; // Fallback
                }

                collections.push({
                    id: colDoc.id,
                    name: data.name,
                    userId: data.userId,
                    previewImages: images.slice(0, 3), // Keep top 3 for preview
                    itemCount: totalCount
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
            const topFollowedIds = followedUserIds.slice(0, 10);

            // 2. Query collections where userId is in this list from Firestore directly
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
            const { getCountFromServer } = await import("firebase/firestore");

            for (const colDoc of snapshot.docs) {
                const data = colDoc.data();

                const productsRef = collection(db, "products");

                // 1. Preview Images
                const productsQuery = query(
                    productsRef,
                    where("userId", "==", data.userId),
                    where("collection", "==", data.name),
                    where("isPublic", "==", true),
                    limit(3)
                );
                const productsSnap = await getDocs(productsQuery);
                let images = productsSnap.docs.map(d => d.data().image).filter(Boolean);

                // Use manually set cover image if available
                if (data.image) {
                    images = images.filter(img => img !== data.image);
                    images.unshift(data.image);
                }

                // 2. Total Count
                const countQuery = query(
                    productsRef,
                    where("userId", "==", data.userId),
                    where("collection", "==", data.name),
                    where("isPublic", "==", true)
                );

                let totalCount = 0;
                try {
                    const countSnapshot = await getCountFromServer(countQuery);
                    totalCount = countSnapshot.data().count;
                } catch (err) {
                    console.warn("Could not get count from server", err);
                    totalCount = productsSnap.size;
                }

                collections.push({
                    id: colDoc.id,
                    name: data.name,
                    userId: data.userId,
                    previewImages: images.slice(0, 3),
                    itemCount: totalCount
                });
            }

            return collections;

        } catch (error) {
            console.error("Error fetching followed collections:", error);
            return [];
        }
    },

    // NEW: Global Price Drops
    getGlobalPriceDrops: async (limitCount = 10) => {
        try {
            const productsRef = collection(db, "products");
            const q = query(
                productsRef,
                where("isPublic", "==", true),
                where("priceDropPercentage", ">", 0),
                orderBy("priceDropPercentage", "desc"),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching global price drops:", error);
            return [];
        }
    }
};
