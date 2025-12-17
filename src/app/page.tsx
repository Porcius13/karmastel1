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

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0F172A] text-white font-[family-name:var(--font-inter)] selection:bg-[#F9F506] selection:text-black overflow-x-hidden">

            {/* 1. NAVBAR (Standalone) */}
            <nav className="fixed top-0 w-full z-50 bg-[#0F172A]/80 backdrop-blur-xl border-b border-[#1E293B]/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#F9F506] rounded-lg flex items-center justify-center text-black">
                            <InfinityIcon size={20} />
                        </div>
                        <span className="text-xl font-bold tracking-tight font-[family-name:Space_Grotesk]">Kept.</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                        <Link href="#features" className="hover:text-white transition-colors">How it works</Link>
                        <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
                        <Link href="/login" className="text-white hover:text-[#F9F506] transition-colors">Sign In</Link>
                        <Link
                            href="/login"
                            className="bg-[#F9F506] text-black px-5 py-2.5 rounded-full font-bold hover:bg-[#F9F506]/90 transition-transform hover:scale-105"
                        >
                            Get Started
                        </Link>
                    </div>

                    <button className="md:hidden text-white">
                        <Menu size={24} />
                    </button>
                </div>
            </nav>

            {/* 2. HERO SECTION */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
                    <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-[#F9F506]/20 rounded-full blur-[120px] opacity-20 mix-blend-screen animate-pulse"></div>
                    <div className="absolute top-40 right-20 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] opacity-20 mix-blend-screen"></div>
                </div>

                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">

                    {/* Text Content */}
                    <div className="space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1E293B] border border-[#1E293B] text-xs font-medium text-[#F9F506] tracking-wide uppercase">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F9F506] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F9F506]"></span>
                            </span>
                            v2.0 is now live
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] font-[family-name:Space_Grotesk]">
                            Stop losing <br />
                            your <span className="text-[#F9F506] decoration-wavy underline decoration-[#F9F506]/50 underline-offset-8">tabs</span>.
                        </h1>

                        <p className="text-xl text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
                            The universal wishlist for the modern web. Save products from any store, track prices automatically, and organize your digital life.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <Link
                                href="/login"
                                className="bg-[#F9F506] text-black px-8 py-4 rounded-full font-bold text-lg hover:shadow-[0_0_30px_-5px_#F9F506] transition-all hover:scale-[1.02]"
                            >
                                Get Extension
                            </Link>
                            <Link
                                href="/login"
                                className="px-8 py-4 rounded-full font-bold text-lg bg-[#1E293B] border border-[#1E293B] hover:bg-[#334155] transition-all flex items-center gap-2"
                            >
                                Open Dashboard <ArrowRight size={18} />
                            </Link>
                        </div>

                        <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-500 pt-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-[#F9F506]" />
                                <span>Free Forever</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-[#F9F506]" />
                                <span>No Credit Card</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Image / Mockup */}
                    <div className="relative group perspective-1000">
                        <div className="relative z-10 transform transition-transform duration-700 hover:rotate-y-6 hover:rotate-x-6">
                            <div className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-[#1E293B]/50 backdrop-blur-xl p-2">
                                <Image
                                    src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop"
                                    alt="Dashboard Preview"
                                    width={800}
                                    height={600}
                                    className="rounded-2xl w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
                                />
                            </div>

                            {/* Floating Cards (Decorations) */}
                            <div className="absolute -left-12 bottom-12 p-4 bg-[#1E293B] border border-white/10 rounded-2xl shadow-xl flex items-center gap-4 animate-bounce duration-[3000ms]">
                                <div className="w-12 h-12 bg-[#F9F506] rounded-lg flex items-center justify-center text-black">
                                    <Puzzle size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-white">Item Added</p>
                                    <p className="text-xs text-slate-400">Just now via Extension</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. FEATURES SECTION */}
            <section id="features" className="py-24 bg-[#1E293B]/30 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 font-[family-name:Space_Grotesk]">
                            How <span className="text-[#F9F506]">Kept</span> works.
                        </h2>
                        <p className="text-slate-400 text-lg">
                            Three simple steps to regain control of your online shopping chaos.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Step 1 */}
                        <div className="group bg-[#1E293B] border border-white/5 rounded-3xl p-8 hover:border-[#F9F506]/50 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(249,245,6,0.15)] hover:-translate-y-2">
                            <div className="w-14 h-14 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-center text-[#F9F506] mb-6 group-hover:scale-110 transition-transform">
                                <Puzzle size={28} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 font-[family-name:Space_Grotesk]">1. Save Items</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Click the browser extension on any product page. We'll extract the image, price, and details automatically.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="group bg-[#1E293B] border border-white/5 rounded-3xl p-8 hover:border-[#F9F506]/50 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(249,245,6,0.15)] hover:-translate-y-2">
                            <div className="w-14 h-14 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                                <FolderOpen size={28} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 font-[family-name:Space_Grotesk]">2. Organize</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Create collections for your Living Room, Summer Wardrobe, or Tech Setup. Tag items for easy filtering.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="group bg-[#1E293B] border border-white/5 rounded-3xl p-8 hover:border-[#F9F506]/50 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(249,245,6,0.15)] hover:-translate-y-2">
                            <div className="w-14 h-14 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-center text-green-400 mb-6 group-hover:scale-110 transition-transform">
                                <Activity size={28} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 font-[family-name:Space_Grotesk]">3. Track & Buy</h3>
                            <p className="text-slate-400 leading-relaxed">
                                We monitor prices 24/7. Get notified instantly when that expensive item goes on sale or comes back in stock.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. CTA SECTION */}
            <section className="py-32 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-20"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter font-[family-name:Space_Grotesk]">
                        Ready to declutter your <br />
                        <span className="text-[#F9F506]">digital life?</span>
                    </h2>
                    <p className="text-xl text-slate-400">
                        Join 10,000+ curators saving time and money with Kept.
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href="/login"
                            className="bg-[#F9F506] text-black px-10 py-5 rounded-full font-bold text-xl hover:shadow-[0_0_40px_-10px_#F9F506] transition-all hover:scale-105"
                        >
                            Get Started for Free
                        </Link>
                        <p className="text-sm text-slate-500 tracking-wide font-medium">
                            NO CREDIT CARD REQUIRED • CANCEL ANYTIME
                        </p>
                    </div>
                </div>
            </section>

            {/* 5. FOOTER */}
            <footer className="border-t border-white/10 bg-[#0F172A] pt-16 pb-8 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#F9F506] rounded flex items-center justify-center text-black">
                                <InfinityIcon size={14} />
                            </div>
                            <span className="text-lg font-bold tracking-tight font-[family-name:Space_Grotesk]">Kept.</span>
                        </div>
                        <p className="text-slate-400 max-w-xs text-sm">
                            The universal wishlist and price tracker for the modern web. Curate your world with ease.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><Link href="#" className="hover:text-[#F9F506] transition-colors">Extension</Link></li>
                            <li><Link href="#" className="hover:text-[#F9F506] transition-colors">Mobile App</Link></li>
                            <li><Link href="#" className="hover:text-[#F9F506] transition-colors">Pricing</Link></li>
                            <li><Link href="#" className="hover:text-[#F9F506] transition-colors">Changelog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><Link href="#" className="hover:text-[#F9F506] transition-colors">About</Link></li>
                            <li><Link href="#" className="hover:text-[#F9F506] transition-colors">Blog</Link></li>
                            <li><Link href="#" className="hover:text-[#F9F506] transition-colors">Careers</Link></li>
                            <li><Link href="#" className="hover:text-[#F9F506] transition-colors">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <p>© 2024 Kept Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
