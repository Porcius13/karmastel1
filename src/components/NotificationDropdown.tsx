"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Heart, Tag, User, X, Check, MessageSquare } from 'lucide-react';
import { Notification, NotificationService } from "@/lib/notification-service";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface NotificationDropdownProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ userId, isOpen, onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!userId) return;

        const unsubscribe = NotificationService.subscribeToNotifications(userId, (data) => {
            setNotifications(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const handleMarkAsRead = async (e: React.MouseEvent, notifId: string) => {
        e.stopPropagation();
        await NotificationService.markAsRead(userId, notifId);
    };

    const handleMarkAllRead = async () => {
        await NotificationService.markAllAsRead(userId);
    };

    const handleClickNotification = async (notification: Notification) => {
        if (!notification.isRead) {
            await NotificationService.markAsRead(userId, notification.id);
        }
        if (notification.link) {
            router.push(notification.link);
            onClose();
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'FOLLOW': return <User size={16} className="text-white" />;
            case 'PRICE_DROP': return <Tag size={16} className="text-white" />;
            case 'MESSAGE': return <MessageSquare size={16} className="text-white" />;
            default: return <Bell size={16} className="text-white" />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'FOLLOW': return 'bg-blue-500';
            case 'PRICE_DROP': return 'bg-green-500';
            case 'MESSAGE': return 'bg-primary';
            default: return 'bg-gray-500';
        }
    };

    if (!isOpen) return null;

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surfaceHighlight/30">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    Bildirimler
                    {unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                            {unreadCount} yeni
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-primary font-medium hover:underline px-2"
                        >
                            Tümünü Oku
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                    <div className="p-8 flex justify-center text-muted-foreground">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Bell size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Henüz bildirim yok.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleClickNotification(notif)}
                                className={`
                                    relative px-4 py-3 flex gap-3 cursor-pointer transition-colors
                                    ${notif.isRead ? 'bg-surface hover:bg-surfaceHighlight/50' : 'bg-primary/5 hover:bg-primary/10'}
                                `}
                            >
                                {/* Icon / Avatar */}
                                <div className="shrink-0 pt-1">
                                    {notif.senderAvatar ? (
                                        <img src={notif.senderAvatar} alt="User" className="w-9 h-9 rounded-full object-cover border border-border" />
                                    ) : (
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${getColor(notif.type)} shadow-sm`}>
                                            {getIcon(notif.type)}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${notif.isRead ? 'text-muted-foreground' : 'text-foreground font-semibold'}`}>
                                        {notif.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {notif.createdAt ? formatDistanceToNow(notif.createdAt?.toDate(), { addSuffix: true, locale: tr }) : 'Şimdi'}
                                    </p>
                                </div>

                                {/* Read Status Dot */}
                                {!notif.isRead && (
                                    <div className="shrink-0 self-center">
                                        <span className="block w-2.5 h-2.5 bg-primary rounded-full"></span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
