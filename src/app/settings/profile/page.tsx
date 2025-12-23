"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import {
    ArrowLeft,
    User,
    Mail,
    Camera,
    Save,
    Puzzle,
    Copy,
    Check,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { auth } from '@/lib/firebase';

import { AvatarSelector } from '@/components/AvatarSelector';
import Image from 'next/image'; // Added Image import

export default function ProfilePage() {
    const { user, deleteUserAccount } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [isAvatarOpen, setIsAvatarOpen] = useState(false);
    const [formData, setFormData] = useState({
        displayName: user?.displayName || '',
        username: '',
        email: user?.email || '',
        bio: '',
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyId = () => {
        if (!user) return;
        navigator.clipboard.writeText(user.uid);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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

            alert(t('profile.success'));
        } catch (error) {
            console.error("Error saving profile:", error);
            alert(t('profile.error'));
        } finally {
            setSaving(false);
        }
    };

    const handleAccountDelete = async () => {
        if (!user) return;
        setDeleting(true);
        try {
            await deleteUserAccount();
            window.location.href = '/login';
        } catch (error) {
            console.error("Error deleting account:", error);
            alert(t('profile.account_delete_error'));
        } finally {
            setDeleting(false);
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
            alert(t('profile.error'));
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
                        <h1 className="text-2xl font-black text-foreground tracking-tight">{t('profile.title')}</h1>
                        <p className="text-muted-foreground text-sm">{t('profile.subtitle')}</p>
                    </div>
                </div>

                <div className="space-y-8">

                    {/* 1. PUBLIC PROFILE */}
                    <section className="bg-surface rounded-3xl p-6 border border-surface-highlight/50">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <User size={20} />
                            <h2 className="text-lg font-bold text-foreground uppercase tracking-wider">{t('profile.public_profile')}</h2>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Avatar */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative group cursor-pointer w-24 h-24 rounded-full bg-surface-highlight overflow-hidden border-2 border-surface-highlight hover:border-primary transition-colors">
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
                                    <h2 className="text-xl font-bold text-foreground">{t('profile.profile_photo')}</h2>
                                    <p className="text-sm text-muted-foreground">{t('profile.click_to_change')}</p>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="flex-1 w-full space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('profile.display_name')}</label>
                                    <input
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                                        className="w-full bg-background border border-surface-highlight rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30"
                                        placeholder={t('profile.display_name_placeholder')}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1.5">{t('profile.display_name_hint')}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('profile.username')}</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }))}
                                        className="w-full bg-background border border-surface-highlight rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30"
                                        placeholder={t('profile.username_placeholder')}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1.5">{t('profile.username_hint')}{formData.username || '...'}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('profile.biography')}</label>
                                    <textarea
                                        rows={3}
                                        value={formData.bio}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                        className="w-full bg-background border border-surface-highlight rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30 resize-none"
                                        placeholder={t('profile.biography_placeholder')}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. ACCOUNT INFO */}
                    <section className="bg-surface rounded-3xl p-6 border border-surface-highlight/50">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <Mail size={20} />
                            <h2 className="text-lg font-bold text-foreground uppercase tracking-wider">{t('profile.account_info')}</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('profile.email_address')}</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    readOnly
                                    className="w-full bg-background border border-surface-highlight rounded-xl px-4 py-3 text-muted-foreground focus:outline-none cursor-not-allowed"
                                />
                                <p className="text-xs text-muted-foreground mt-1.5">
                                    {t('profile.email_hint')}
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <section className="bg-surface rounded-3xl p-6 border border-surface-highlight/50 mt-8">
                    <div className="flex items-center gap-2 mb-6 text-primary">
                        <Puzzle size={20} />
                        <h2 className="text-lg font-bold text-foreground uppercase tracking-wider">{t('profile.extension_title')}</h2>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {t('profile.extension_desc').replace('{brand}', t('common.brand_name'))}
                        </p>

                        <div className="p-4 bg-background border border-dashed border-surface-highlight rounded-2xl">
                            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">{t('profile.extension_id_label')}</label>
                            <div className="flex items-center gap-3">
                                <code className="flex-1 bg-surfaceHighlight/30 text-primary px-4 py-2 rounded-lg font-mono text-sm overflow-x-auto whitespace-nowrap">
                                    {user?.uid}
                                </code>
                                <button
                                    onClick={handleCopyId}
                                    className="p-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 rounded-lg text-foreground transition-all flex items-center gap-2"
                                >
                                    {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                                    <span className="text-xs font-bold">{copied ? t('profile.copied') : t('profile.copy')}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Puzzle size={16} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold text-foreground">{t('profile.how_to_use')}</h4>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {t('profile.how_to_use_desc').replace('{settings}', t('common.settings'))}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. DANGER ZONE */}
                <section className="bg-red-500/5 rounded-3xl p-6 border border-red-500/20 mt-8 mb-20">
                    <div className="flex items-center gap-2 mb-6 text-red-500">
                        <AlertTriangle size={20} />
                        <h2 className="text-lg font-bold uppercase tracking-wider">{t('profile.danger_zone')}</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-foreground">{t('profile.delete_account')}</h4>
                                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                                    {t('profile.delete_warning')}
                                </p>
                            </div>

                            {isDeleteConfirmOpen ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsDeleteConfirmOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={handleAccountDelete}
                                        disabled={deleting}
                                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 transition-all"
                                    >
                                        {deleting ? (
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : <Trash2 size={14} />}
                                        {t('common.delete')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsDeleteConfirmOpen(true)}
                                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-2.5 rounded-xl text-xs font-bold border border-red-500/20 transition-all"
                                >
                                    <Trash2 size={14} />
                                    {t('profile.delete_account')}
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-0 left-0 lg:left-20 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-surfaceHighlight/50 flex justify-center z-40 animate-in slide-in-from-bottom-5">
                <div className="w-full max-w-3xl flex items-center justify-between">
                    <span className="text-sm text-muted-foreground hidden sm:block">
                        {t('profile.save_hint')}
                    </span>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                        <Link href="/settings" className="px-6 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            {t('common.cancel')}
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-primary text-black font-bold px-8 py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                    <span>{t('common.saving')}</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>{t('common.update')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
