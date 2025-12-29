import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    limit,
    startAt,
    endAt,
    orderBy,
    setDoc,
    deleteDoc,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";

export interface UserProfile {
    uid: string;
    username?: string;
    displayName?: string;
    photoURL?: string;
    bio?: string;
}

export const UserService = {
    // Search users by username or display name (Simple prefix match)
    // Note: Firestore text search is limited. Use Algolia for advanced search in production.
    async searchUsers(searchTerm: string): Promise<UserProfile[]> {
        if (!searchTerm || searchTerm.length < 2) return [];

        const term = searchTerm.toLowerCase();
        const usersRef = collection(db, "users");

        // Strategy: We can't do "OR" queries with range filters easily in Firestore.
        // For MVP, we'll search by 'username' if it starts with @, else 'displayName'.
        // Ideally, store a lowercase 'searchKey' field.

        // Falling back to a simpler approach: fetch by username prefix
        // (Assuming usernames are stored)

        try {
            // Try searching by username first
            const q = query(
                usersRef,
                orderBy("username"),
                startAt(term),
                endAt(term + "\uf8ff"),
                limit(5)
            );

            const snapshot = await getDocs(q);
            const users: UserProfile[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                users.push({
                    uid: doc.id,
                    username: data.username,
                    displayName: data.displayName || data.firstName + " " + data.lastName,
                    photoURL: data.photoURL,
                    bio: data.bio
                });
            });

            return users;
        } catch (error) {
            console.error("Error searching users:", error);
            return [];
        }
    },

    async getUserProfile(userId: string): Promise<UserProfile | null> {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    uid: userDoc.id,
                    username: data.username,
                    displayName: data.displayName || (data.firstName ? `${data.firstName} ${data.lastName}` : "User"),
                    photoURL: data.photoURL,
                    bio: data.bio
                };
            }
            return null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    },

    // Follow System
    async followUser(currentUserId: string, targetUserId: string) {
        if (!currentUserId || !targetUserId) return;

        const followingRef = doc(db, "users", currentUserId, "following", targetUserId);
        const followerRef = doc(db, "users", targetUserId, "followers", currentUserId);

        const batch = writeBatch(db);

        batch.set(followingRef, {
            uid: targetUserId,
            timestamp: serverTimestamp()
        });

        batch.set(followerRef, {
            uid: currentUserId,
            timestamp: serverTimestamp()
        });

        await batch.commit();

        // Trigger Notification
        try {
            // Get current user details to show in notification
            const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
            const currentUserData = currentUserDoc.data();
            const senderName = currentUserData?.displayName || currentUserData?.username || "Kullanıcı";
            const senderAvatar = currentUserData?.photoURL || null;

            // Dynamically import to avoid circular dependencies if any (though lib to lib is fine usually)
            const { NotificationService } = await import("./notification-service");

            // Log Social Activity
            const { ActivityService } = await import("./activity-service");
            await ActivityService.logActivity({
                type: 'FOLLOW_USER',
                actorId: currentUserId,
                actorName: senderName,
                actorAvatar: senderAvatar,
                targetId: targetUserId,
                targetName: "User", // We'd need to fetch target profile if we want their name here
                isPublic: true // Follows are social
            });

        } catch (err) {
            console.error("Failed to send follow notification", err);
        }
    },

    async unfollowUser(currentUserId: string, targetUserId: string) {
        if (!currentUserId || !targetUserId) return;

        const followingRef = doc(db, "users", currentUserId, "following", targetUserId);
        const followerRef = doc(db, "users", targetUserId, "followers", currentUserId);

        await deleteDoc(followingRef);
        await deleteDoc(followerRef);
    },

    async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
        if (!currentUserId || !targetUserId) return false;

        try {
            const docRef = doc(db, "users", currentUserId, "following", targetUserId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists();
        } catch (error) {
            console.error("Error checking follow status:", error);
            return false;
        }
    },

    // Fetch Followers List
    async getFollowers(userId: string): Promise<UserProfile[]> {
        try {
            const followersRef = collection(db, "users", userId, "followers");
            const q = query(followersRef, orderBy("timestamp", "desc"), limit(50)); // Limit for MVP
            const snapshot = await getDocs(q);

            if (snapshot.empty) return [];

            const userIds = snapshot.docs.map(doc => doc.id);
            // In a real app we'd use a batched specific query or duplicating data.
            // For MVP, we fetch profiles individually (careful with reads).
            // Or ideally, duplicate basics (name/photo) into the follower document when following.
            // For now, let's just fetch the first 20 profiles to be safe on reads.

            const profiles: UserProfile[] = [];
            for (const id of userIds.slice(0, 20)) {
                const p = await this.getUserProfile(id);
                if (p) profiles.push(p);
            }
            return profiles;
        } catch (error) {
            console.error("Error getting followers:", error);
            return [];
        }
    },

    // Fetch Following List
    async getFollowing(userId: string): Promise<UserProfile[]> {
        try {
            const followingRef = collection(db, "users", userId, "following");
            const q = query(followingRef, orderBy("timestamp", "desc"), limit(50));
            const snapshot = await getDocs(q);

            if (snapshot.empty) return [];

            const userIds = snapshot.docs.map(doc => doc.id);
            const profiles: UserProfile[] = [];
            for (const id of userIds.slice(0, 20)) {
                const p = await this.getUserProfile(id);
                if (p) profiles.push(p);
            }
            return profiles;
        } catch (error) {
            console.error("Error getting following:", error);
            return [];
        }
    }
};
