"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import {
    ArrowLeft,
    User,
    Mail,
    Camera,
    Save
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase'; // Added auth import

import { AvatarSelector } from '@/components/AvatarSelector';
import Image from 'next/image'; // Added Image import

export default function ProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isAvatarOpen, setIsAvatarOpen] = useState(false);
    const [formData, setFormData] = useState({
        displayName: user?.displayName || '',
        username: '',
        email: user?.email || '',
        bio: '',
    });
    const [saving, setSaving] = useState(false);

    // Fetch existing extended profile data from Firestore
    React.useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            try {
                const { doc, getDoc, getFirestore } = await import("firebase/firestore");
                const db = getFirestore();
                const docRef = doc(db, "users", user.uid);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setFormData(prev => ({
                        ...prev,
                        displayName: user.displayName || data.displayName || '',
                        username: data.username || '',
                        bio: data.bio || '',
                        email: user.email || ''
                    }));
                }
            } catch (err) {
                console.error("Error fetching profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const { doc, setDoc, getFirestore } = await import("firebase/firestore");
            const { updateProfile } = await import("firebase/auth");
            const db = getFirestore();

            // 1. Update Firebase Auth (DisplayName)
            if (auth.currentUser && formData.displayName !== user.displayName) {
                await updateProfile(auth.currentUser, {
                    displayName: formData.displayName
                });
            }

            // 2. Update Firestore (Extended Data)
            await setDoc(doc(db, "users", user.uid), {
                displayName: formData.displayName,
                username: formData.username,
                bio: formData.bio,
                searchKeywords: [
                    ...formData.displayName.toLowerCase().split(" "),
                    formData.username.toLowerCase()
                ]
            }, { merge: true });

            alert("Kullanıcı bilgileri başarıyla güncellendi! ✅");
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Kaydederken bir hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarSelect = async (url: string) => {
        if (!user) return;
        try {
            const { doc, setDoc, getFirestore } = await import("firebase/firestore");
            const { updateProfile } = await import("firebase/auth");
            const db = getFirestore();

            if (auth.currentUser) {
                await updateProfile(auth.currentUser, {
                    photoURL: url
                });
            }

            await setDoc(doc(db, "users", user.uid), {
                photoURL: url
            }, { merge: true });

            window.location.reload();
        } catch (error) {
            console.error("Error updating avatar:", error);
            alert("Failed to update avatar");
        }
        setIsAvatarOpen(false);
    };

    return (
        <DashboardShell>
            <AvatarSelector
                isOpen={isAvatarOpen}
                onClose={() => setIsAvatarOpen(false)}
                onSelect={handleAvatarSelect}
                currentAvatar={user?.photoURL}
            />
            <div className="max-w-2xl mx-auto space-y-8 pb-20">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/settings" className="p-2 rounded-full bg-surface hover:bg-surfaceHighlight text-muted-foreground hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Hesap & Profil</h1>
                        <p className="text-muted-foreground text-sm">Profil bilgilerini buradan güncelleyebilirsin.</p>
                    </div>
                </div>

                <div className="space-y-8">

                    {/* 1. PUBLIC PROFILE */}
                    <section className="bg-surface rounded-3xl p-6 border border-surfaceHighlight/50">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <User size={20} />
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Halka Açık Profil</h2>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Avatar */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative group cursor-pointer w-24 h-24 rounded-full bg-surfaceHighlight overflow-hidden border-2 border-surfaceHighlight hover:border-primary transition-colors">
                                    <Image
                                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${formData.displayName}&background=random`}
                                        alt="Profile"
                                        width={100}
                                        height={100}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsAvatarOpen(true)}
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Camera className="text-white" size={24} />
                                    </button>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Profil Fotoğrafı</h2>
                                    <p className="text-sm text-muted-foreground">Değiştirmek için tıkla.</p>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="flex-1 w-full space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Görünen Ad</label>
                                    <input
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                                        className="w-full bg-background border border-surfaceHighlight rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30"
                                        placeholder="Adın Soyadın"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1.5">Diğer kullanıcılar seni bu isimle görecek.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Kullanıcı Adı (@)</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }))}
                                        className="w-full bg-background border border-surfaceHighlight rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30"
                                        placeholder="kullanici_adi"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1.5">Özel profil linkin: favduck.com/user/{formData.username || '...'}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Biyografi</label>
                                    <textarea
                                        rows={3}
                                        value={formData.bio}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                        className="w-full bg-background border border-surfaceHighlight rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30 resize-none"
                                        placeholder="Kendinden bahset..."
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. ACCOUNT INFO */}
                    <section className="bg-surface rounded-3xl p-6 border border-surfaceHighlight/50">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <Mail size={20} />
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Hesap Bilgileri</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">E-posta Adresi</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    readOnly
                                    className="w-full bg-background border border-surfaceHighlight rounded-xl px-4 py-3 text-gray-400 focus:outline-none cursor-not-allowed"
                                />
                                <p className="text-xs text-muted-foreground mt-1.5">
                                    E-posta adresini değiştirmek için destekle iletişime geç.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-0 left-0 lg:left-20 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-surfaceHighlight/50 flex justify-center z-40 animate-in slide-in-from-bottom-5">
                <div className="w-full max-w-3xl flex items-center justify-between">
                    <span className="text-sm text-muted-foreground hidden sm:block">
                        Değişiklikleri kaydetmeyi unutma.
                    </span>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                        <Link href="/settings" className="px-6 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                            İptal
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-primary text-black font-bold px-8 py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                    <span>Kaydediliyor...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Güncelle</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
