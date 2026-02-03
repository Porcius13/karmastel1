import { adminAuth, adminDb } from './firebase-admin';
import { isUserAdmin } from './constants';

export async function verifyAdmin(request: Request) {
    if (!adminAuth || !adminDb) {
        throw new Error("Firebase Admin not initialized");
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { isAdmin: false, error: "Missing or invalid authorization header" };
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Fetch username from Firestore
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return { isAdmin: false, error: "User profile not found" };
        }

        const userData = userDoc.data();
        const username = userData?.username;

        if (isUserAdmin(username)) {
            return { isAdmin: true, uid, username };
        } else {
            return { isAdmin: false, error: "Access denied: Not an administrator" };
        }
    } catch (error) {
        console.error("Admin verification failed:", error);
        return { isAdmin: false, error: "Authentication failed" };
    }
}
