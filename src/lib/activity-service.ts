import { db } from "./firebase";
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    Timestamp
} from "firebase/firestore";

export type ActivityType = 'ADD_PRODUCT' | 'LIKE_COLLECTION' | 'FOLLOW_USER' | 'PRICE_DROP';

export interface SocialActivity {
    id?: string;
    type: ActivityType;
    actorId: string;
    actorName: string;
    actorAvatar?: string | null;
    targetId: string;
    targetName: string;
    targetImage?: string | null;
    isPublic: boolean;
    timestamp: any;
    metadata?: Record<string, any>;
}

export const ActivityService = {
    /**
     * Logs a new social activity.
     * Logic: Only logs if isPublic is true.
     */
    async logActivity(activity: Omit<SocialActivity, 'timestamp'>) {
        if (!activity.isPublic && activity.type !== 'FOLLOW_USER') {
            // We don't log private actions (except follows which are inherently social between two people)
            console.log(`[ActivityService] Skipping private activity: ${activity.type}`);
            return;
        }

        try {
            const { doc, setDoc } = await import("firebase/firestore");

            // Generate a unique ID for certain types to prevent duplicates
            // Format: type_actorId_targetId
            // This allows "re-sharing" a product by updating the timestamp of the existing activity
            let activityId = undefined;
            if (activity.type === 'ADD_PRODUCT' || activity.type === 'LIKE_COLLECTION') {
                activityId = `${activity.type}_${activity.actorId}_${activity.targetId}`;
            }

            if (activityId) {
                const activityRef = doc(db, "activities", activityId);
                await setDoc(activityRef, {
                    ...activity,
                    timestamp: serverTimestamp()
                });
            } else {
                const activitiesRef = collection(db, "activities");
                await addDoc(activitiesRef, {
                    ...activity,
                    timestamp: serverTimestamp()
                });
            }

            console.log(`[ActivityService] Logged activity: ${activity.type}`);
        } catch (error) {
            console.error("[ActivityService] Error logging activity:", error);
        }
    },

    /**
     * Fetches activity feed for a specific user based on who they follow.
     */
    async getFollowedActivity(followingIds: string[], limitCount = 20) {
        if (!followingIds || followingIds.length === 0) return [];

        try {
            const activitiesRef = collection(db, "activities");

            // Firestore 'in' query supports max 30 values (v9+)
            const topFollowing = (followingIds || []).filter(id => typeof id === 'string' && id.trim() !== '').slice(0, 30);

            if (topFollowing.length === 0) return [];

            console.log(`[ActivityService] Fetching feed for:`, topFollowing);

            const q = query(
                activitiesRef,
                where("isPublic", "==", true),
                where("actorId", "in", topFollowing),
                orderBy("timestamp", "desc"),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SocialActivity[];
        } catch (error) {
            console.error("[ActivityService] Error fetching feed:", error);
            return [];
        }
    },

    /**
     * Deletes a specific activity.
     */
    async deleteActivity(activityId: string) {
        try {
            const { doc, deleteDoc } = await import("firebase/firestore");
            await deleteDoc(doc(db, "activities", activityId));
            console.log(`[ActivityService] Deleted activity: ${activityId}`);
        } catch (error) {
            console.error("[ActivityService] Error deleting activity:", error);
        }
    }
};
