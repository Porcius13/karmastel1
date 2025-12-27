import { db } from "./firebase";
import {
    collection,
    doc,
    setDoc,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    where,
    increment,
    updateDoc,
    getDoc,
    limit
} from "firebase/firestore";

export interface Message {
    id?: string;
    senderId: string;
    text: string;
    timestamp: any;
    isRead: boolean;
}

export interface Chat {
    id: string;
    participants: string[];
    lastMessage: string;
    lastTimestamp: any;
    unreadCount: Record<string, number>;
}

export const chatService = {
    // Generate a consistent chat ID for two users
    getChatId: (uid1: string, uid2: string) => {
        return [uid1, uid2].sort().join("_");
    },

    // Send a message
    sendMessage: async (senderId: string, recipientId: string, text: string) => {
        try {
            const { writeBatch, serverTimestamp, increment } = await import("firebase/firestore");
            const chatId = chatService.getChatId(senderId, recipientId);
            const chatRef = doc(db, "chats", chatId);
            const messagesRef = collection(db, "chats", chatId, "messages");
            const newMessageRef = doc(messagesRef);

            const batch = writeBatch(db);

            // 1. Add message
            batch.set(newMessageRef, {
                senderId,
                text,
                timestamp: serverTimestamp(),
                isRead: false
            });

            // 2. Update/Create chat metadata
            batch.set(chatRef, {
                participants: [senderId, recipientId],
                lastMessage: text,
                lastTimestamp: serverTimestamp(),
                [`unreadCount.${recipientId}`]: increment(1)
            }, { merge: true });

            console.log("DEBUG - Sending message with Batch...", { senderId, recipientId, chatId });
            await batch.commit();
            console.log("DEBUG - Message Sent Successfully!");

            // 3. Trigger Notification
            try {
                const userDoc = await getDoc(doc(db, "users", senderId));
                const userData = userDoc.data();
                const senderName = userData?.username || userData?.displayName || "Birisi";
                const senderAvatar = userData?.photoURL || null;

                const { NotificationService } = await import("./notification-service");
                await NotificationService.createNotification({
                    userId: recipientId,
                    type: 'MESSAGE',
                    title: 'Yeni Mesaj',
                    message: `${senderName}: ${text.length > 50 ? text.substring(0, 50) + '...' : text}`,
                    link: `/messages/${chatId}`,
                    senderId: senderId,
                    senderName: senderName,
                    senderAvatar: senderAvatar
                });
            } catch (err) {
                console.error("Failed to send message notification", err);
            }
        } catch (error) {
            console.error("CRITICAL - SendMessage failed:", error);
            throw error;
        }
    },

    // Listen for chats (Inbox)
    subscribeToChats: (userId: string, callback: (chats: Chat[]) => void, onError?: (err: any) => void) => {
        if (!userId) return () => { };
        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", userId),
            orderBy("lastTimestamp", "desc")
        );

        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
            callback(chats);
        }, (error) => {
            console.error("Chat subscription error:", error);
            if (onError) onError(error);
        });
    },

    // Listen for messages in a chat
    subscribeToMessages: (chatId: string, callback: (messages: Message[]) => void) => {
        const q = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("timestamp", "asc")
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            callback(messages);
        }, (error) => {
            console.warn("Message subscription denied (Chat may not exist yet):", error);
            callback([]); // Return empty rather than crashing
        });
    },

    // Mark chat as read
    markAsRead: async (chatId: string, userId: string) => {
        const chatRef = doc(db, "chats", chatId);
        await updateDoc(chatRef, {
            [`unreadCount.${userId}`]: 0
        });
    }
};
