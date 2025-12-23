"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle, RefreshCw, ArrowRight, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function VerifyEmailPage() {
    const { user, sendVerification, logout } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        if (!user) {
            router.push('/login');
        } else if (user.emailVerified) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleResend = async () => {
        setLoading(true);
        try {
            await sendVerification();
            setMessage('Verification email resent! Don\'t forget to check your spam folder.');
        } catch (error: any) {
            console.error(error);
            if (error?.code === 'auth/too-many-requests') {
                setMessage('Too many requests. Please wait a moment.');
            } else {
                setMessage('Could not send email. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCheckVerification = async () => {
        setVerifying(true);
        // Force reload user to get fresh token claim
        try {
            await user?.reload();
            if (user?.emailVerified) {
                router.push('/dashboard');
            } else {
                setMessage('Not verified yet. Make sure you clicked the link.');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setVerifying(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 relative">
            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>

            <div className="max-w-md w-full bg-surface border border-border/50 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-4">
                    <Mail size={40} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-foreground">Check Your Email</h1>
                    <p className="text-muted-foreground text-lg">
                        We've sent a verification link to <span className="font-bold text-foreground">{user.email}</span>.
                    </p>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('resent') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {message}
                    </div>
                )}

                <div className="space-y-3 pt-4">
                    <button
                        onClick={handleCheckVerification}
                        disabled={verifying}
                        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    >
                        {verifying ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                        I Verified, Continue
                    </button>

                    <button
                        onClick={handleResend}
                        disabled={loading}
                        className="w-full bg-surfaceHighlight text-foreground font-bold py-4 rounded-xl hover:bg-surfaceHighlight/80 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <Mail size={20} />}
                        Resend Verification
                    </button>

                    <button
                        onClick={() => logout()}
                        className="text-muted-foreground hover:text-foreground text-sm font-medium flex items-center justify-center gap-2 pt-4 mx-auto"
                    >
                        <LogOut size={16} />
                        Sign in with a different account
                    </button>
                </div>
            </div>
        </div>
    );
}
