"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    Eye,
    EyeOff,
    Loader2,
    Mail,
    Lock,
    ArrowRight
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLanguage } from '@/context/LanguageContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const { login, loginWithGoogle } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await login(email, password, rememberMe);
            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            const msg = err.code === 'auth/invalid-credential' ? t('login.error_invalid')
                : `Error: ${err.message}`;
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            router.push('/dashboard');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans transition-colors duration-300 relative">
            <div className="absolute top-6 right-6 z-10">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md p-8">

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black mb-2 tracking-tight text-foreground">{t('login.title')}</h1>
                    <p className="text-muted-foreground">{t('login.subtitle')}</p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-danger/10 border border-danger/20 text-danger text-sm p-4 rounded-xl mb-6 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    {/* Email */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                            <Mail size={20} />
                        </div>
                        <input
                            type="text"
                            required
                            placeholder={t('login.email_or_username')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-surface border border-transparent focus:border-primary/50 rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                        />
                    </div>

                    {/* Password */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                            <Lock size={20} />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder={t('login.password')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-surface border border-transparent focus:border-primary/50 rounded-2xl py-4 pl-12 pr-12 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${rememberMe ? 'bg-primary border-primary text-black' : 'border-muted-foreground/50 group-hover:border-primary'}`}>
                                {rememberMe && <svg viewBox="0 0 12 12" className="w-3 h-3 fill-current"><path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" /></svg>}
                            </div>
                            <input type="checkbox" className="hidden" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{t('login.remember_me')}</span>
                        </label>
                        <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t('login.forgot_password')}</Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-glow"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <>{t('login.login_btn')} <ArrowRight size={20} /></>}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative py-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="bg-background px-4 text-muted-foreground">{t('common.or_continue_with')}</span></div>
                </div>

                {/* Google Login */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full bg-surface text-foreground font-bold py-4 rounded-2xl border border-border hover:bg-surfaceHighlight transition-all flex items-center justify-center gap-3"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    {t('common.continue_with_google')}
                </button>

                <div className="mt-8 text-center text-sm text-muted-foreground">
                    {t('login.dont_have_account')} <Link href="/signup" className="text-primary hover:underline font-bold">{t('login.signup')}</Link>
                </div>

            </div>
        </div>
    );
}
