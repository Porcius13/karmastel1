chrome.runtime.onMessageExternal.addListener(
    (request, sender, sendResponse) => {
        if (request.type === "SYNC_USER_ID") {
            chrome.storage.local.set({ userId: request.userId }, () => {
                console.log("User ID synced from web app:", request.userId);
                sendResponse({ success: true });
            });
            return true; // Keep channel open for async response
        }
    }
);
