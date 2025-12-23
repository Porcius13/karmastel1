chrome.runtime.onMessageExternal.addListener(
    (request, sender, sendResponse) => {
        if (request.type === "SYNC_USER_ID") {
            chrome.storage.local.set({ userId: request.userId }, () => {
                console.log("User ID synced from web app:", request.userId);
                sendResponse({ success: true });
            });
            return true;
        }
    }
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SAVE_PRODUCT") {
        const { url, userId, collection, threshold } = request;

        fetch('https://favduck.com/api/add-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                userId,
                collection: collection || "Default",
                threshold: threshold || "any"
            })
        })
            .then(response => response.json().then(data => ({ status: response.status, ok: response.ok, data })))
            .then(res => {
                sendResponse({ success: res.ok, data: res.data, status: res.status });
            })
            .catch(error => {
                console.error("Background Save Error:", error);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keep channel open
    }
});
