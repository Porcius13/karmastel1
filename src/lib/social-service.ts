import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    increment,
    updateDoc,
    runTransaction
} from "firebase/firestore";
import { NotificationService } from "./notification-service";

export const SocialService = {
    // Like a collection
    // Path: collection_settings/{collectionId}/likes/{userId}
    async toggleCollectionLike(currentUserId: string, collectionId: string, ownerId: string, collectionName: string) {
        if (!currentUserId || !collectionId) return;

        const likeRef = doc(db, "collection_settings", collectionId, "likes", currentUserId);
        const likeSnap = await getDoc(likeRef);
        const isLiked = likeSnap.exists();

        if (isLiked) {
            // Unlike
            await deleteDoc(likeRef);
            // Optional: Decrement like count on collection doc if we store it
        } else {
            // Like
            await setDoc(likeRef, {
                uid: currentUserId,
                timestamp: serverTimestamp()
            });

            // Trigger Notification (only if not liking own collection)
            if (currentUserId !== ownerId) {
                // Get sender details
                const senderDoc = await getDoc(doc(db, "users", currentUserId));
                const senderName = senderDoc.data()?.username || "Someone";
                const senderAvatar = senderDoc.data()?.photoURL;

                await NotificationService.createNotification({
                    userId: ownerId,
                    type: 'COLLECTION_LIKE',
                    title: 'Yeni Beğeni',
                    message: `${senderName}, '${collectionName}' koleksiyonunu beğendi.`,
                    link: `/collection/${collectionId}`,
                    senderId: currentUserId,
                    senderName: senderName,
                    senderAvatar: senderAvatar
                });
            }
        }
        return !isLiked;
    },

    // Save a collection
    // Path: users/{currentUserId}/saved_collections/{collectionId}
    async toggleCollectionSave(currentUserId: string, collectionId: string, ownerId: string, collectionName: string) {
        if (!currentUserId || !collectionId) return;

        const saveRef = doc(db, "users", currentUserId, "saved_collections", collectionId);
        const saveSnap = await getDoc(saveRef);
        const isSaved = saveSnap.exists();

        if (isSaved) {
            // Unsave
            await deleteDoc(saveRef);
        } else {
            // Save
            await setDoc(saveRef, {
                collectionId: collectionId,
                ownerId: ownerId,
                collectionName: collectionName, // Cache name for easy display
                timestamp: serverTimestamp()
            });

            // Trigger Notification (Optional: "Someone saved your collection")
            if (currentUserId !== ownerId) {
                const senderDoc = await getDoc(doc(db, "users", currentUserId));
                const senderName = senderDoc.data()?.username || "Someone";
                const senderAvatar = senderDoc.data()?.photoURL;

                await NotificationService.createNotification({
                    userId: ownerId,
                    type: 'COLLECTION_SAVE',
                    title: 'Koleksiyon Kaydedildi',
                    message: `${senderName}, '${collectionName}' koleksiyonunu kaydetti.`,
                    link: `/collection/${collectionId}`,
                    senderId: currentUserId,
                    senderName: senderName,
                    senderAvatar: senderAvatar
                });
            }
        }
        return !isSaved;
    },

    // Check status
    async getCollectionSocialStatus(currentUserId: string, collectionId: string) {
        if (!currentUserId || !collectionId) return { isLiked: false, isSaved: false, likeCount: 0 };

        const likeRef = doc(db, "collection_settings", collectionId, "likes", currentUserId);
        const saveRef = doc(db, "users", currentUserId, "saved_collections", collectionId);

        // Get total likes for this collection
        // Note: For high scale, store count in parent doc. For now, count documents.
        const likesCollection = collection(db, "collection_settings", collectionId, "likes");

        const [likeSnap, saveSnap, likesQuerySnap] = await Promise.all([
            getDoc(likeRef),
            getDoc(saveRef),
            getDocs(likesCollection)
        ]);

        return {
            isLiked: likeSnap.exists(),
            isSaved: saveSnap.exists(),
            likeCount: likesQuerySnap.size
        };
    }
};
