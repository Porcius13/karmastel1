import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    getDocs,
    writeBatch
} from "firebase/firestore";

export interface Notification {
    id: string;
    userId: string; // The recipient
    type: 'FOLLOW' | 'PRICE_DROP' | 'STOCK_ALERT' | 'SYSTEM' | 'COLLECTION_LIKE' | 'COLLECTION_SAVE' | 'MESSAGE';
    title: string;
    message: string;
    link?: string; // Where to go on click
    senderId?: string; // If triggered by another user
    senderName?: string;
    senderAvatar?: string;
    image?: string; // Product image etc.
    isRead: boolean;
    createdAt: any;
}

export const NotificationService = {
    // collection ref: users/{userId}/notifications

    // Create a notification
    async createNotification(notification: Omit<Notification, "id" | "createdAt" | "isRead">) {
        try {
            const notifRef = collection(db, "users", notification.userId, "notifications");
            await addDoc(notifRef, {
                ...notification,
                isRead: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error creating notification", error);
        }
    },

    // Get notifications (Real-time listener helper)
    subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
        if (!userId) return () => { };

        const notifRef = collection(db, "users", userId, "notifications");
        const q = query(
            notifRef,
            orderBy("createdAt", "desc"),
            limit(20)
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notification[];
            callback(notifications);
        });
    },

    // Mark single as read
    async markAsRead(userId: string, notificationId: string) {
        try {
            const ref = doc(db, "users", userId, "notifications", notificationId);
            await updateDoc(ref, { isRead: true });
        } catch (error) {
            console.error("Error marking notification as read", error);
        }
    },

    // Mark all as read
    async markAllAsRead(userId: string) {
        try {
            const notifRef = collection(db, "users", userId, "notifications");
            const q = query(notifRef, where("isRead", "==", false));
            const snapshot = await getDocs(q);

            if (snapshot.empty) return;

            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, { isRead: true });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all notifications as read", error);
        }
    },
    // Mark all notifications for a specific link as read
    async markNotificationsAsReadByLink(userId: string, link: string) {
        try {
            const notifRef = collection(db, "users", userId, "notifications");
            const q = query(notifRef, where("link", "==", link), where("isRead", "==", false));
            const snapshot = await getDocs(q);

            if (snapshot.empty) return;

            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, { isRead: true });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking link notifications as read", error);
        }
    }
};
