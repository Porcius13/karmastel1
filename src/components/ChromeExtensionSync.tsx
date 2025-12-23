"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * This component handles syncing the Firebase User ID with the Chrome extension.
 * It uses externally_connectable messaging defined in manifest.json.
 */
declare global {
    interface Window {
        chrome: any;
    }
    const chrome: any;
}

export default function ChromeExtensionSync() {
    const { user } = useAuth();

    // The extension ID (replace with your actual Web Store ID after publishing)
    // For local development, this is the ID shown in chrome://extensions
    const EXTENSION_ID = "cnfhfbbjjflpadaangjcfenaffdlbbbj";

    useEffect(() => {
        if (!user || typeof window === "undefined") return;

        const syncWithExtension = async () => {
            const chrome = (window as any).chrome;
            if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
                try {
                    chrome.runtime.sendMessage(EXTENSION_ID, {
                        type: "SYNC_USER_ID",
                        userId: user.uid
                    }, (response: any) => {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                        if (response?.success) {
                            console.log("FAVDUCK: Session synced with extension");
                        }
                    });
                } catch (e) {
                    // Ignore errors if extension doesn't exist
                }
            }
        };

        // Sync on mount and when user changes
        syncWithExtension();

        // Also sync periodically or on window focus to ensure consistency
        window.addEventListener('focus', syncWithExtension);
        return () => window.removeEventListener('focus', syncWithExtension);
    }, [user]);

    return null; // Side-effect only component
}
