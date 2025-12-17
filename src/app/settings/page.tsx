"use client";

import React from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import {
    Bell,
    User,
    Shield,
    CreditCard,
    ChevronRight,
    Settings as SettingsIcon
} from 'lucide-react';

export default function SettingsPage() {
    const menuItems = [
        {
            title: 'Notification Preferences',
            description: 'Manage email, push, and SMS alerts.',
            icon: Bell,
            href: '/settings/notifications',
            color: 'text-primary'
        },
        {
            title: 'Account & Profile',
            description: 'Update your personal information and profile photo.',
            icon: User,
            href: '/settings/profile',
            color: 'text-blue-400'
        },
        {
            title: 'Privacy & Security',
            description: 'Review sessions and change your password.',
            icon: Shield,
            href: '/settings/security',
            color: 'text-green-400'
        },
        {
            title: 'Billing & Plans',
            description: 'Manage subscriptions and payment methods.',
            icon: CreditCard,
            href: '/settings/billing',
            color: 'text-purple-400'
        }
    ];

    return (
        <DashboardShell>
            <div className="max-w-4xl mx-auto space-y-8">

                <div className="flex items-center gap-4">
                    <div className="p-3 bg-surface rounded-2xl border border-surfaceHighlight/50">
                        <SettingsIcon size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
                        <p className="text-muted-foreground">Manage your account and preferences.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menuItems.map((item) => (
                        <Link
                            key={item.title}
                            href={item.href}
                            className="group flex flex-col p-6 rounded-3xl bg-surface border border-surfaceHighlight hover:border-primary/50 transition-all hover:bg-surfaceHighlight/10"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl bg-white/5 ${item.color}`}>
                                    <item.icon size={24} />
                                </div>
                                <div className="p-2 rounded-full bg-transparent group-hover:bg-white/5 text-muted-foreground group-hover:text-white transition-colors">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{item.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </DashboardShell>
    );
}
