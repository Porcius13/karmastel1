"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { SentryIssue } from "@/lib/sentry-service";
import { AlertCircle, Brain, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

import { useAuth } from "@/context/AuthContext";
import { isUserAdmin } from "@/lib/constants";
import { useRouter } from "next/navigation";

export default function AdminErrorsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [issues, setIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'unresolved' | 'resolved' | 'ignored' | 'all'>('unresolved');
    const [explaining, setExplaining] = useState<string | null>(null);
    const [explanations, setExplanations] = useState<Record<string, string>>({});
    const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

    // Navigation guard
    useEffect(() => {
        if (!authLoading && (!user || !isUserAdmin(profile?.username))) {
            router.push("/dashboard");
        }
    }, [user, profile, authLoading, router]);

    const fetchIssues = async (statusOverride?: string) => {
        setLoading(true);
        try {
            const currentStatus = statusOverride || statusFilter;
            const url = currentStatus === 'all' ? "/api/admin/errors" : `/api/admin/errors?status=${currentStatus}`;

            // Get ID Token for auth
            const token = await user?.getIdToken();

            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setIssues(data.issues);
            }
        } catch (error) {
            console.error("Failed to fetch issues", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/errors/sync", {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                fetchIssues();
            }
        } catch (error) {
            console.error("Sync failed", error);
        } finally {
            setSyncing(false);
        }
    };

    const updateStatus = async (issueId: string, newStatus: string) => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/errors/status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ issueId, status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                setIssues(prev => prev.map(issue =>
                    issue.id === issueId ? { ...issue, status: newStatus } : issue
                ));
            }
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const explainIssue = async (issue: any) => {
        if (explanations[issue.id]) return;

        setExplaining(issue.id);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/errors/explain", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    issueId: issue.id,
                    title: issue.title,
                    metadata: issue.metadata
                })
            });
            const data = await res.json();
            if (data.success) {
                setExplanations(prev => ({ ...prev, [issue.id]: data.explanation }));
                setExpandedIssue(issue.id);
            }
        } catch (error) {
            console.error("Failed to explain issue", error);
        } finally {
            setExplaining(null);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [statusFilter]);

    return (
        <DashboardShell>
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black font-display text-foreground tracking-tight">Hata Günlükleri</h1>
                        <p className="text-muted-foreground">Sentry'den gelen gerçek zamanlı hatalar ve AI analizleri.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSync}
                            disabled={syncing || loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border hover:bg-surfaceHighlight transition-colors disabled:opacity-50 text-sm font-bold"
                        >
                            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                            {syncing ? 'Eşitleniyor...' : 'Sentry ile Eşitle'}
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-surface p-1 rounded-2xl border border-border w-fit">
                    {(['unresolved', 'resolved', 'ignored', 'all'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {s === 'unresolved' ? 'Çözülmeyenler' : s === 'resolved' ? 'Çözülenler' : s === 'ignored' ? 'Yoksayılanlar' : 'Tümü'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted-foreground font-medium">Hatalar yükleniyor...</p>
                    </div>
                ) : issues.length === 0 ? (
                    <div className="bg-surface border border-border rounded-3xl p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle size={32} />
                        </div>
                        <h2 className="text-xl font-bold">Harika! Hiç hata bulunamadı.</h2>
                        <p className="text-muted-foreground">Bu kategoride şu anda kayıtlı hata yok.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {issues.map((issue) => (
                            <div
                                key={issue.id}
                                className={`group bg-surface border rounded-3xl overflow-hidden transition-all duration-300 ${expandedIssue === issue.id ? 'border-primary/50 shadow-glow' : 'border-border hover:border-border/80'} ${issue.status === 'resolved' ? 'opacity-75 grayscale-[0.5]' : ''}`}
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${issue.status === 'unresolved' ? 'bg-error/10 text-error' : issue.status === 'resolved' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                                    {issue.status === 'unresolved' ? 'Aktif' : issue.status === 'resolved' ? 'Çözüldü' : 'Yoksayıldı'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(issue.lastSeen), { addSuffix: true, locale: tr })}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground line-clamp-1">{issue.title}</h3>
                                            <p className="text-sm text-muted-foreground font-mono bg-surfaceHighlight/50 p-2 rounded-lg break-all">
                                                {issue.culprit}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 items-end">
                                            <div className="text-right">
                                                <p className="text-xs font-bold">{issue.count} Kez</p>
                                                <p className="text-[10px] text-muted-foreground">{issue.userCount} Kullanıcı</p>
                                            </div>

                                            {issue.status === 'unresolved' ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateStatus(issue.id, 'resolved'); }}
                                                    className="text-[10px] font-bold text-success hover:underline"
                                                >
                                                    Çözüldü Olarak İşaretle
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateStatus(issue.id, 'unresolved'); }}
                                                    className="text-[10px] font-bold text-error hover:underline"
                                                >
                                                    Tekrar Aç
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-6">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => explainIssue(issue)}
                                                disabled={explaining === issue.id}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${explanations[issue.id] ? 'bg-primary text-primary-foreground' : 'bg-surfaceHighlight hover:bg-border text-foreground border border-border'} ${explaining === issue.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            >
                                                {explaining === issue.id ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        <span>Analiz Ediliyor...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Brain size={16} />
                                                        <span>{explanations[issue.id] ? 'AI Analizini Gör' : 'AI ile Açıkla'}</span>
                                                    </>
                                                )}
                                            </button>
                                            <a
                                                href={issue.permalink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-xl bg-surface border border-border hover:bg-surfaceHighlight text-muted-foreground transition-colors"
                                                title="Sentry'de Görüntüle"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                        </div>

                                        <button
                                            onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {expandedIssue === issue.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                        </button>
                                    </div>

                                    {expandedIssue === issue.id && (
                                        <div className="mt-6 pt-6 border-t border-border animate-in slide-in-from-top-4 duration-300">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                                    <Brain size={16} />
                                                </div>
                                                <h4 className="font-bold text-foreground">AI Analizi (Gemini)</h4>
                                            </div>
                                            {explanations[issue.id] ? (
                                                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:bg-surfaceHighlight prose-code:px-1.5 prose-code:rounded">
                                                    {explanations[issue.id].split('\n').map((line, i) => (
                                                        <p key={i}>{line}</p>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Analiz başlatılmadı veya bulunamadı.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
