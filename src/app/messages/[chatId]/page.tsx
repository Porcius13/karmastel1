"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { chatService, Message } from '@/lib/chat-service';
import { DashboardShell } from '@/components/DashboardShell';
import { Send, ArrowLeft, MoreVertical, Smartphone } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ChatRoomPage() {
    const { chatId } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);

    const otherUid = (chatId as string)?.split('_').find(id => id !== user?.uid);

    useEffect(() => {
        if (!chatId || !user) return;

        // 1. Fetch other user details
        const fetchOtherUser = async () => {
            if (otherUid) {
                const docSnap = await getDoc(doc(db, "users", otherUid));
                if (docSnap.exists()) setOtherUser(docSnap.data());
            }
        };
        fetchOtherUser();

        // 2. Subscribe to messages
        const unsubscribe = chatService.subscribeToMessages(chatId as string, (fetched) => {
            setMessages(fetched);
            setLoading(false);

            // Mark as read only if there are messages (likely chat exists)
            if (fetched.length > 0) {
                chatService.markAsRead(chatId as string, user.uid);

                // Also clear bell notifications for this chat
                import("@/lib/notification-service").then(({ NotificationService }) => {
                    NotificationService.markNotificationsAsReadByLink(user.uid, `/messages/${chatId}`);
                });
            }
        });

        return () => unsubscribe();
    }, [chatId, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !otherUid) return;

        const text = newMessage;
        setNewMessage('');

        try {
            await chatService.sendMessage(user.uid, otherUid, text);
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    return (
        <DashboardShell>
            <div className="max-w-4xl mx-auto h-[calc(100vh-180px)] flex flex-col bg-surface border border-surfaceHighlight/50 rounded-3xl overflow-hidden shadow-2xl">

                {/* Chat Header */}
                <div className="p-4 md:p-6 border-b border-surfaceHighlight flex items-center justify-between bg-surface">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/messages')} className="p-2 hover:bg-surfaceHighlight rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-background overflow-hidden border border-white/5">
                                <img
                                    src={otherUser?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUid}`}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-main)]">{otherUser?.displayName || 'Kullanıcı'}</h3>
                                <p className="text-[10px] text-success font-bold uppercase tracking-widest">Çevrimiçi</p>
                            </div>
                        </div>
                    </div>
                    <button className="p-2 text-muted-foreground hover:text-[var(--text-main)]">
                        <MoreVertical size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                            <Smartphone size={48} />
                            <p className="text-sm font-medium">Sohbeti başlatmak için bir şeyler yaz!</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.senderId === user?.uid;
                            return (
                                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] md:max-w-[60%] p-4 rounded-2xl shadow-sm ${isMe
                                        ? 'bg-primary text-black rounded-tr-none font-medium'
                                        : 'bg-surfaceHighlight text-[var(--text-main)] rounded-tl-none border border-white/5'
                                        }`}>
                                        <p className="text-sm leading-relaxed">{msg.text}</p>
                                        <p className={`text-[9px] mt-2 opacity-50 text-right font-black`}>
                                            {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-surface/80 backdrop-blur-xl border-t border-surfaceHighlight">
                    <form onSubmit={handleSendMessage} className="flex gap-4">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Mesajını buraya yaz..."
                            className="flex-1 bg-background border border-surfaceHighlight rounded-2xl px-6 py-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="bg-primary text-black p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:scale-100"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </DashboardShell>
    );
}
