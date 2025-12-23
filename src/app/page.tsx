"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Puzzle,
    FolderOpen,
    BarChart3,
    CheckCircle2,
    Infinity as InfinityIcon,
    ArrowRight,
    Menu,
    Activity
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/context/LanguageContext';

export default function LandingPage() {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground overflow-x-hidden transition-colors duration-300">

            {/* 1. NAVBAR (Standalone) */}
            <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/brand-logo-light.png" alt="FAVDUCK Logo" className="w-10 h-10 object-contain block dark:hidden" />
                        <img src="/brand-logo-dark.png" alt="FAVDUCK Logo" className="w-10 h-10 object-contain hidden dark:block" />
                        <span className="text-2xl animate-in fade-in duration-300 whitespace-nowrap text-foreground font-display font-black tracking-tighter">FAVDUCK</span>
                    </div>

                    <div className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
                        <Link href="/login" className="text-foreground hover:text-primary transition-colors">{t('landing.signIn')}</Link>
                        <Link
                            href="/signup"
                            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-bold hover:shadow-glow transition-all hover:scale-105"
                        >
                            {t('landing.getStarted')}
                        </Link>
                        <LanguageToggle />
                        <ThemeToggle />
                    </div>

                    <div className="md:hidden flex items-center gap-4">
                        <LanguageToggle />
                        <ThemeToggle />
                        <button className="text-foreground">
                            <Menu size={24} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* 2. HERO SECTION */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
                    <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-40 mix-blend-multiply dark:mix-blend-screen animate-pulse"></div>
                    <div className="absolute top-40 right-20 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] opacity-30 mix-blend-multiply dark:mix-blend-screen"></div>
                </div>

                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">

                    {/* Text Content */}
                    <div className="space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-xs font-medium text-primary tracking-wide uppercase shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            {t('landing.v2live')}
                        </div>

                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[1.1] font-display text-foreground whitespace-pre-line">
                            {t('landing.heroTitle').split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line.includes('tabs') || line.includes('kaybolmayın') ? (
                                        <span className="text-primary decoration-wavy underline decoration-primary/50 underline-offset-8">{line}</span>
                                    ) : (
                                        line
                                    )}
                                    {i === 0 && <br />}
                                </React.Fragment>
                            ))}
                        </h1>

                        <p className="text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
                            {t('landing.heroSubtitle')}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <Link
                                href="/signup"
                                className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-lg hover:shadow-glow transition-all hover:scale-[1.02]"
                            >
                                {t('landing.getExtension')}
                            </Link>
                            <Link
                                href="/login"
                                className="px-8 py-4 rounded-full font-bold text-lg bg-surface border border-border text-foreground hover:bg-surfaceHighlight transition-all flex items-center gap-2"
                            >
                                {t('landing.openDashboard')} <ArrowRight size={18} />
                            </Link>
                        </div>

                        <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground pt-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-primary" />
                                <span>{t('landing.freeForever')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-primary" />
                                <span>{t('landing.noCreditCard')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Image / Mockup */}
                    <div className="relative group perspective-1000">
                        <div className="relative z-10 transform transition-transform duration-700 hover:rotate-y-1 hover:rotate-x-1">
                            <div className="rounded-3xl border border-border/20 overflow-hidden shadow-2xl glass p-2">
                                <Image
                                    src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop"
                                    alt={t('landing.dashboardPreview')}
                                    width={800}
                                    height={600}
                                    className="rounded-2xl w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
                                />
                            </div>

                            {/* Floating Cards (Decorations) */}
                            <div className="absolute -left-12 bottom-12 p-4 bg-surface border border-border rounded-2xl shadow-xl flex items-center gap-4 animate-bounce duration-[3000ms]">
                                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                                    <Puzzle size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-foreground">{t('landing.itemAdded')}</p>
                                    <p className="text-xs text-muted-foreground">{t('landing.justNow')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. FEATURES SECTION */}
            <section id="features" className="py-24 bg-surfaceHighlight/30 border-y border-border">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-6xl font-black tracking-tight mb-4 font-display text-foreground">
                            {t('landing.howItWorks').split('FAVDUCK').map((part, i, arr) => (
                                <React.Fragment key={i}>
                                    {part}
                                    {i < arr.length - 1 && <span className="text-primary">FAVDUCK</span>}
                                </React.Fragment>
                            ))}
                        </h2>
                        <p className="text-muted-foreground text-lg">
                            {t('landing.howItWorksSubtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Step 1 */}
                        <div className="group bg-surface border border-border rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-glow hover:-translate-y-2">
                            <div className="w-14 h-14 bg-surface-highlight border border-border rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                <Puzzle size={28} />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground mb-3 font-display">{t('landing.step1Title')}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('landing.step1Desc')}
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="group bg-surface border border-border rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-glow hover:-translate-y-2">
                            <div className="w-14 h-14 bg-surface-highlight border border-border rounded-2xl flex items-center justify-center text-secondary mb-6 group-hover:scale-110 transition-transform">
                                <FolderOpen size={28} />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground mb-3 font-display">{t('landing.step2Title')}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('landing.step2Desc')}
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="group bg-surface border border-border rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-glow hover:-translate-y-2">
                            <div className="w-14 h-14 bg-surface-highlight border border-border rounded-2xl flex items-center justify-center text-success mb-6 group-hover:scale-110 transition-transform">
                                <Activity size={28} />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground mb-3 font-display">{t('landing.step3Title')}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('landing.step3Desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. CTA SECTION */}
            <section className="py-32 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(var(--muted)_1px,transparent_1px)] [background-size:20px_20px] opacity-20"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
                    <h2 className="text-4xl md:text-7xl font-black tracking-tighter font-display text-foreground leading-tight whitespace-pre-line">
                        {t('landing.readyToDeclutter').split('\n').map((line, i) => (
                            <React.Fragment key={i}>
                                {line.includes('digital life') || line.includes('düzenlemeye') ? (
                                    <span className="text-primary italic">{line}</span>
                                ) : (
                                    line
                                )}
                                {i === 0 && <br />}
                            </React.Fragment>
                        ))}
                    </h2>
                    <p className="text-xl text-muted-foreground">
                        {t('landing.joinCurators')}
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href="/signup"
                            className="bg-primary text-primary-foreground px-10 py-5 rounded-full font-bold text-xl hover:shadow-glow transition-all hover:scale-105"
                        >
                            {t('landing.getStartedFree')}
                        </Link>
                        <p className="text-sm text-muted-foreground tracking-wide font-medium uppercase">
                            {t('landing.noCardRequired')}
                        </p>
                    </div>
                </div>
            </section>

            {/* 5. FOOTER */}
            <footer className="border-t border-border bg-surface pt-16 pb-8 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2">
                            <img src="/brand-logo-light.png" alt="FAVDUCK Logo" className="w-12 h-12 object-contain block dark:hidden" />
                            <img src="/brand-logo-dark.png" alt="FAVDUCK Logo" className="w-12 h-12 object-contain hidden dark:block" />
                            <span className="text-3xl animate-in fade-in duration-300 whitespace-nowrap text-[#412234] dark:text-[#FAF0E7]" style={{ fontFamily: "'Luckiest Guy', var(--font-luckiest-guy), cursive" }}>FAVDUCK</span>
                        </div>
                        <p className="text-muted-foreground max-w-xs text-sm">
                            {t('landing.footerDesc')}
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-foreground mb-4">{t('landing.product')}</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.extension')}</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.mobileApp')}</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.pricing')}</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.changelog')}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-foreground mb-4">{t('landing.company')}</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.about')}</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.blog')}</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.careers')}</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.contact')}</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                    <p>© 2024 FAVDUCK Inc. {t('landing.rights')}</p>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-foreground transition-colors">{t('landing.privacy')}</Link>
                        <Link href="#" className="hover:text-foreground transition-colors">{t('landing.terms')}</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
