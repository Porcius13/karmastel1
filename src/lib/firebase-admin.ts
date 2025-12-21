import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Helper to get sanitized private key
const getServiceAccount = () => {
    try {
        // Option 1: Full JSON string
        const jsonKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (jsonKey) {
            console.log("Firebase Admin: Found FIREBASE_SERVICE_ACCOUNT_KEY string");
            const trimmed = jsonKey.trim();
            if (trimmed.startsWith('{')) {
                return JSON.parse(trimmed);
            }
            // Try base64 fallback
            try {
                return JSON.parse(Buffer.of(...Buffer.from(trimmed, 'base64')).toString());
            } catch (e) {
                return JSON.parse(trimmed); // Last ditch effort
            }
        }

        // Option 2: Individual variables (Safer for Vercel)
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKey) {
            console.log("Firebase Admin: Found individual service account variables");
            return {
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            };
        }

        return null;
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
