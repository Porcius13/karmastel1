document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const mainView = document.getElementById('mainView');
    const resultCard = document.getElementById('resultCard');
    const settingsView = document.getElementById('settingsView');
    const settingsBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeBtn');
    const backBtn = document.getElementById('backBtn');
    const saveBtn = document.getElementById('saveBtn');
    const viewListBtn = document.getElementById('viewListBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    const collectionSelect = document.getElementById('collectionSelect');
    const productImg = document.getElementById('productImg');
    const productTitle = document.getElementById('productTitle');
    const productPrice = document.getElementById('productPrice');
    const statusDiv = document.getElementById('status');
    const authWarning = document.getElementById('authWarning');
    const userIdInput = document.getElementById('userIdInput');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const notifyBtns = document.querySelectorAll('.notify-btn');

    // State
    let userId = null;
    let collections = [];
    let notifyThreshold = 'any';
    const API_BASE = "https://favduck.com/api";

    // Initial Load
    await init();

    async function init() {
        // 1. Get User ID from storage
        const storage = await chrome.storage.local.get(['userId']);
        userId = storage.userId;

        if (!userId) {
            authWarning.classList.remove('hidden');
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-50');
        } else {
            authWarning.classList.add('hidden');
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-50');
            userIdInput.value = userId;
            await loadCollections();
        }

        // 2. Fetch current tab info immediately for preview
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.url) {
                // Background scrape or meta-tag sniff from potential content script
                // For now, just show placeholders or use a quick scrape if possible
                // Better approach: fetch from current tab DOM if possible
                productTitle.textContent = tab.title.split('-')[0].trim();
            }
        } catch (e) { }
    }

    async function loadCollections() {
        try {
            const response = await fetch(`${API_BASE}/user/collections?userId=${userId}`);
            const data = await response.json();
            if (data.success) {
                collections = data.collections;
                updateCollectionUI();
            }
        } catch (e) {
            console.error("Failed to load collections", e);
        }
    }

    function updateCollectionUI() {
        collectionSelect.innerHTML = '<option value="">My Wishlist</option>';
        collections.forEach(col => {
            if (col === 'Uncategorized') return;
            const opt = document.createElement('option');
            opt.value = col;
            opt.textContent = col;
            collectionSelect.appendChild(opt);
        });
    }

    // Toggle Views
    settingsBtn.addEventListener('click', () => {
        mainView.classList.add('hidden');
        settingsView.classList.remove('hidden');
    });

    backBtn.addEventListener('click', () => {
        settingsView.classList.add('hidden');
        mainView.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => window.close());

    viewListBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://favduck.com/dashboard' });
        window.close();
    });

    // Notify Threshold Selection
    notifyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            notifyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            notifyThreshold = btn.dataset.val;
        });
    });

    // Save Settings
    saveSettingsBtn.addEventListener('click', async () => {
        const newId = userIdInput.value.trim();
        if (newId) {
            await chrome.storage.local.set({ userId: newId });
            userId = newId;
            showStatus("ID Saved Successfully", "success");
            setTimeout(() => {
                settingsView.classList.add('hidden');
                mainView.classList.remove('hidden');
                init();
            }, 800);
        }
    });

    // Save Product
    saveBtn.addEventListener('click', async () => {
        if (!userId) {
            showStatus("Please sign in first", "error");
            return;
        }

        setLoading(true);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.url) throw new Error("No active tab found");

            const selectedCollection = collectionSelect.value;

            const response = await fetch(`${API_BASE}/add-product`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: tab.url,
                    userId: userId,
                    collection: selectedCollection || "Default",
                    threshold: notifyThreshold
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                const serverError = data.error || `Server returned ${response.status}`;
                throw new Error(serverError);
            }

            // Success UI
            mainView.classList.add('hidden');
            resultCard.classList.remove('hidden');

        } catch (error) {
            console.error("FAVDUCK Extension Error:", error);
            showStatus(`Error: ${error.message}`, "error");
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            saveBtn.disabled = true;
            btnText.textContent = "SAVING...";
            spinner.classList.remove('hidden');
            saveBtn.classList.add('opacity-80');
        } else {
            saveBtn.disabled = false;
            btnText.textContent = "SAVE ITEM";
            spinner.classList.add('hidden');
            saveBtn.classList.remove('opacity-80');
        }
    }

    function showStatus(msg, type) {
        statusDiv.textContent = msg;
        statusDiv.classList.remove('hidden', 'bg-green-500', 'text-white', 'bg-red-500', 'bg-slate-800');

        if (type === 'success') {
            statusDiv.classList.add('bg-green-500', 'text-white');
        } else if (type === 'error') {
            statusDiv.classList.add('bg-red-500', 'text-white');
        } else {
            statusDiv.classList.add('bg-slate-800', 'text-white');
        }

        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    }
});
