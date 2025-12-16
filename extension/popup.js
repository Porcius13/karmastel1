document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    function showStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = `mt-4 p-3 rounded-lg text-sm font-medium block ${type === 'success' ? 'bg-green-50 text-green-700' :
                type === 'error' ? 'bg-red-50 text-red-700' :
                    'bg-blue-50 text-blue-700'
            }`;
        statusDiv.classList.remove('hidden');
    }

    saveBtn.addEventListener('click', async () => {
        // Disable button
        saveBtn.disabled = true;
        saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
        saveBtn.textContent = 'Saving...';
        showStatus('Proccessing...', 'info');

        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab?.url) {
                throw new Error("Cannot get current page URL.");
            }

            // Send to Next.js API
            const response = await fetch('http://localhost:3000/api/add-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: tab.url })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Server error");
            }

            // Success
            showStatus('Saved successfully!', 'success');
            setTimeout(() => {
                window.close();
            }, 1000);

        } catch (error) {
            console.error(error);
            showStatus(error.message, 'error');

            // Re-enable button
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            saveBtn.textContent = 'Save Current Page';
        }
    });
});
