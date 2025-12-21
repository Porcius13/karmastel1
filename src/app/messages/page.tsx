"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chatService, Chat } from '@/lib/chat-service';
import { DashboardShell } from '@/components/DashboardShell';
import { MessageSquare, Circle, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MessagesInboxPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userDetails, setUserDetails] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!user) return;

        const unsubscribe = chatService.subscribeToChats(user.uid, async (fetchedChats) => {
            setChats(fetchedChats);

            // Fetch missing user details for participants
            const newDetails = { ...userDetails };
            let updated = false;

            for (const chat of fetchedChats) {
                const otherUid = chat.participants.find((id: string) => id !== user.uid);
                if (otherUid && !newDetails[otherUid]) {
                    const userDoc = await getDoc(doc(db, "users", otherUid));
                    if (userDoc.exists()) {
                        newDetails[otherUid] = userDoc.data();
                        updated = true;
                    }
                }
            }

            if (updated) {
                setUserDetails(newDetails);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <DashboardShell>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-main)] mb-2">Mesajlar</h1>
                    <p className="text-muted-foreground">Diğer kullanıcılarla yaptığın konuşmalar.</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : chats.length === 0 ? (
                    <div className="bg-surface/50 border border-dashed border-surfaceHighlight rounded-3xl p-20 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                            <MessageSquare size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-main)]">Henüz mesajın yok</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                            Arkadaşlarınla iletişime geçmek için profillerindeki "Mesaj Gönder" butonunu kullanabilirsin.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {chats.map((chat) => {
                            const otherUid = chat.participants.find((id: string) => id !== user?.uid);
                            const otherUser = userDetails[otherUid || ''] || {};
                            const unread = chat.unreadCount?.[user?.uid || ''] || 0;

                            return (
                                <button
                                    key={chat.id}
                                    onClick={() => router.push(`/messages/${chat.id}`)}
                                    className="w-full bg-surface hover:bg-surfaceHighlight border border-surfaceHighlight/50 p-5 rounded-2xl flex items-center gap-4 transition-all group text-left"
                                >
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-full bg-background overflow-hidden border border-white/5">
                                            <img
                                                src={otherUser.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUid}`}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {unread > 0 && (
                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary text-black text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-surface animate-bounce">
                                                {unread}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-[var(--text-main)] truncate">
                                                {otherUser.displayName || 'Kullanıcı'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                                {formatTimestamp(chat.lastTimestamp)}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate ${unread > 0 ? 'text-[var(--text-main)] font-semibold' : 'text-muted-foreground'}`}>
                                            {chat.lastMessage}
                                        </p>
                                    </div>

                                    <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
