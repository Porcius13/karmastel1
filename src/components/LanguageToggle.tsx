"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC = () => {
    const { language, setLanguage } = useLanguage();

    const toggleLanguage = () => {
        setLanguage(language === 'EN' ? 'TR' : 'EN');
    };

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-highlight/50 hover:bg-surface-highlight border border-border/50 text-xs font-bold text-foreground transition-all active:scale-95"
            title={language === 'EN' ? 'Switch to Turkish' : 'İngilizceye Geç'}
        >
            <Globe size={14} className="text-primary" />
            <span className="w-5 text-center">{language}</span>
        </button>
    );
};
