import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Helper to get sanitized private key
const getServiceAccount = () => {
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            return null;
        }
        // Handle both stringified JSON and direct object if configured differently
        const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (key.startsWith('{')) {
            return JSON.parse(key);
        }
        return JSON.parse(Buffer.from(key, 'base64').toString('ascii'));
    } catch (e) {
        console.error('Firebase Admin: Failed to parse service account key', e);
        return null;
    }
};

if (getApps().length === 0) {
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
        try {
            initializeApp({
                credential: cert(serviceAccount)
            });
            console.log("Firebase Admin: Initialized successfully with Service Account");
        } catch (initError) {
            console.error("Firebase Admin: Initialization error:", initError);
        }
    } else {
        console.warn("Firebase Admin: FIREBASE_SERVICE_ACCOUNT_KEY is missing or invalid in environment.");
    }
} else {
    console.log("Firebase Admin: Already initialized");
}

const adminDb = getApps().length > 0 ? getFirestore() : null;

export { adminDb };
