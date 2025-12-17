"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // UseEffect to prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="w-10 h-10 p-2 rounded-full border border-surfaceHighlight bg-surface flex items-center justify-center text-muted">
                <div className="w-5 h-5 bg-surfaceHighlight rounded-full animate-pulse"></div>
            </div>
        );
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative w-10 h-10 p-2 rounded-full border border-surfaceHighlight bg-surface text-muted hover:text-[var(--text-main)] hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            <div className="relative w-full h-full flex items-center justify-center">
                <Sun
                    size={20}
                    className={`absolute transition-all duration-300 transform ${theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                        }`}
                />
                <Moon
                    size={20}
                    className={`absolute transition-all duration-300 transform ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                        }`}
                />
            </div>
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}
