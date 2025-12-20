"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import {
    ArrowLeft,
    Mail,
    BellRing,
    Smartphone,
    ShieldCheck,
    Save,
    Zap,
    Info
} from 'lucide-react';

// Reusable Switch Component
const Toggle = ({ label, description, checked, onChange, disabled, isPro }: any) => (
    <div className={`flex items-start justify-between py-6 border-b border-surfaceHighlight/50 last:border-0 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <div className="flex-1 pr-8">
            <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-white text-base">{label}</h3>
                {isPro && (
                    <span className="bg-gradient-to-r from-yellow-300 to-yellow-600 text-black text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                        PRO
                    </span>
                )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>

        <button
            onClick={() => !disabled && onChange(!checked)}
            className={`
        relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/50
        ${checked ? 'bg-primary' : 'bg-surfaceHighlight'}
      `}
        >
            <span
                className={`
          block w-5 h-5 rounded-full bg-black shadow-lg transform transition-transform duration-200 ease-in-out mt-1 ml-1
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
            />
        </button>
    </div>
);

export default function NotificationSettingsPage() {
    const [settings, setSettings] = useState({
        email_price_drops: true,
        email_back_in_stock: true,
        email_weekly_digest: false,
        push_browser: true,
        push_mobile: true,
        sms_urgent: false,
        security_login: true
    });

    const [saving, setSaving] = useState(false);

    const handleToggle = (key: string) => {
        setSettings(prev => ({ ...prev, [key as keyof typeof settings]: !prev[key as keyof typeof settings] }));
    };

    const handleSave = () => {
        setSaving(true);
        // Simulate API call
        setTimeout(() => {
            setSaving(false);
            alert("Settings saved!");
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
                        <h1 className="text-2xl font-black text-white tracking-tight">Notification Preferences</h1>
                        <p className="text-muted-foreground text-sm">Manage how and when you want to be notified.</p>
                    </div>
                </div>

                <div className="space-y-8">

                    {/* 1. DELIVERY CHANNELS */}
                    <section className="bg-surface rounded-3xl p-6 border border-surfaceHighlight/50 overflow-hidden">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <Mail size={20} />
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Email Notifications</h2>
                        </div>

                        <div className="space-y-0">
                            <Toggle
                                label="Price Drops"
                                description="Get notified immediately when an item in your wishlist drops in price."
                                checked={settings.email_price_drops}
                                onChange={() => handleToggle('email_price_drops')}
                            />
                            <Toggle
                                label="Back In Stock"
                                description="Be the first to know when tracked items are available again."
                                checked={settings.email_back_in_stock}
                                onChange={() => handleToggle('email_back_in_stock')}
                            />
                            <Toggle
                                label="Weekly Digest"
                                description="A summary of market trends and your collection's value changes sent every Monday."
                                checked={settings.email_weekly_digest}
                                onChange={() => handleToggle('email_weekly_digest')}
                            />
                        </div>
                    </section>

                    {/* 2. PUSH & SMS */}
                    <section className="bg-surface rounded-3xl p-6 border border-surfaceHighlight/50">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <BellRing size={20} />
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Push & SMS</h2>
                        </div>

                        <div className="space-y-0">
                            <Toggle
                                label="Browser Notifications"
                                description="Receive rich notifications on your desktop while you browse."
                                checked={settings.push_browser}
                                onChange={() => handleToggle('push_browser')}
                            />
                            <Toggle
                                label="Mobile App Alerts"
                                description="Push notifications sent to your iOS or Android devices."
                                checked={settings.push_mobile}
                                onChange={() => handleToggle('push_mobile')}
                            />
                            <Toggle
                                label="SMS Alerts"
                                description="Instant text messages for critical stock updates (High priority)."
                                checked={settings.sms_urgent}
                                onChange={() => handleToggle('sms_urgent')}
                                disabled={true}
                                isPro={true}
                            />
                            <div className="bg-surfaceHighlight/20 p-4 rounded-xl flex gap-3 items-start mt-2">
                                <Info size={16} className="text-primary mt-0.5" />
                                <p className="text-xs text-muted-foreground">
                                    SMS Alerts are available exclusively on the <span className="text-white font-bold" style={{ fontFamily: "'Luckiest Guy', var(--font-luckiest-guy), cursive" }}>FAVDUCK Pro</span> plan due to carrier costs. Upgrade to enable.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 3. SECURITY */}
                    <section className="bg-surface rounded-3xl p-6 border border-surfaceHighlight/50">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <ShieldCheck size={20} />
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Security</h2>
                        </div>
                        <Toggle
                            label="Unusual Login Activity"
                            description="We'll alert you if your account is accessed from a new device or location."
                            checked={settings.security_login}
                            onChange={() => handleToggle('security_login')}
                        />
                    </section>

                </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-0 left-0 lg:left-20 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-surfaceHighlight/50 flex justify-center z-40 animate-in slide-in-from-bottom-5">
                <div className="w-full max-w-3xl flex items-center justify-between">
                    <span className="text-sm text-muted-foreground hidden sm:block">
                        You have unsaved changes
                    </span>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                        <button className="px-6 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                            Reset
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
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
