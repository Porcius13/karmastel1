(function () {
    if (window.self !== window.top) return;

    const createButton = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'favduck-side-wrapper';
        wrapper.innerHTML = `
            <button class="favduck-logo-btn" title="Go to FAVDUCK Dashboard">
                <img src="${chrome.runtime.getURL('icon.png')}" style="width: 28px; height: 28px; object-fit: contain;">
            </button>
            <button class="favduck-save-btn" title="Quick Save to FAVDUCK">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                </svg>
                <div class="favduck-spinner"></div>
            </button>
        `;

        document.body.appendChild(wrapper);

        const logoBtn = wrapper.querySelector('.favduck-logo-btn');
        const saveBtn = wrapper.querySelector('.favduck-save-btn');

        // Logo redirects to Dashboard
        logoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open('https://favduck.com/dashboard', '_blank');
        });

        // Save button scrapes and saves
        saveBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (saveBtn.classList.contains('saved')) return; // Already saved

            saveBtn.classList.add('loading');

            try {
                const storage = await chrome.storage.local.get(['userId']);
                const userId = storage.userId;

                if (!userId) {
                    showToast("Please sign in to FAVDUCK extension first!", "error");
                    saveBtn.classList.remove('loading');
                    return;
                }

                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        type: 'SAVE_PRODUCT',
                        url: window.location.href,
                        userId: userId,
                        collection: 'Default'
                    }, resolve);
                });

                if (response && response.success) {
                    saveBtn.classList.add('saved');
                    showToast("Product saved to FAVDUCK!", "success");
                } else {
                    const errorMsg = response?.error || (response?.data?.error) || "Save failed";
                    throw new Error(errorMsg);
                }

            } catch (err) {
                console.error("FAVDUCK Save Error:", err);
                showToast("Failed to save product", "error");
            } finally {
                saveBtn.classList.remove('loading');
            }
        });
    };

    const showToast = (message, type) => {
        let toast = document.querySelector('.favduck-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'favduck-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.className = `favduck-toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    };

    if (document.body) {
        createButton();
    } else {
        document.addEventListener('DOMContentLoaded', createButton);
    }
})();
