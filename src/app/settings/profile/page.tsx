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

export default function ProfileSettingsPage() {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [email, setEmail] = useState(user?.email || '');

    const handleSave = () => {
        setSaving(true);
        // Simulate API call
        setTimeout(() => {
            setSaving(false);
            alert("Profile updated successfully!");
        }, 1000);
    };

    return (
        <DashboardShell>
            <div className="max-w-3xl mx-auto pb-32">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/settings" className="p-2 rounded-full bg-surface hover:bg-surfaceHighlight text-muted-foreground hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Account & Profile</h1>
                        <p className="text-muted-foreground text-sm">Update your personal information and public profile.</p>
                    </div>
                </div>

                <div className="space-y-8">

                    {/* 1. PUBLIC PROFILE */}
                    <section className="bg-surface rounded-3xl p-6 border border-surfaceHighlight/50">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <User size={20} />
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Public Profile</h2>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Avatar */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative group cursor-pointer w-24 h-24 rounded-full bg-surfaceHighlight overflow-hidden border-2 border-surfaceHighlight hover:border-primary transition-colors">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <User size={32} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={20} className="text-white" />
                                    </div>
                                </div>
                                <button className="text-xs font-bold text-primary hover:text-primary-foreground transition-colors">
                                    Change Photo
                                </button>
                            </div>

                            {/* Form */}
                            <div className="flex-1 w-full space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Display Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full bg-background border border-surfaceHighlight rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30"
                                        placeholder="Enter your name"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1.5">This is how you'll appear to others.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Bio / Description</label>
                                    <textarea
                                        rows={3}
                                        className="w-full bg-background border border-surfaceHighlight rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30 resize-none"
                                        placeholder="Tell us a bit about yourself..."
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. ACCOUNT INFO */}
                    <section className="bg-surface rounded-3xl p-6 border border-surfaceHighlight/50">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <Mail size={20} />
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Account Information</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-background border border-surfaceHighlight rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="your@email.com"
                                />
                                <p className="text-xs text-muted-foreground mt-1.5">
                                    We'll send notifications to this address.
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
                        Review your changes before saving.
                    </span>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                        <button className="px-6 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-primary text-black font-bold px-8 py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Save Profile</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
