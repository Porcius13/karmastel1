"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Clean up legacy theme preset if present
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('theme-preset');
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 p-3 bg-surface border border-border rounded-full shadow-2xl backdrop-blur-sm">
            {/* Dark/Light Toggle */}
            <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center justify-center p-2 rounded-full bg-muted/20 hover:bg-muted/40 transition-colors text-foreground"
                title="Toggle Dark Mode"
            >
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
        </div>
    );
}
