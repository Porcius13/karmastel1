import { adminDb } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export interface DBStoredSentryIssue {
    id: string;
    title: string;
    culprit: string;
    type: string;
    metadata: any;
    permalink: string;
    count: string;
    userCount: number;
    firstSeen: string;
    lastSeen: string;
    status: 'unresolved' | 'resolved' | 'ignored';
    updatedAt: any;
    syncAt: any;
}

const COLLECTION_NAME = "sentry_issues";

export const SentryDBService = {
    async upsertIssue(issue: any) {
        if (!adminDb) {
            throw new Error("Firebase Admin DB not initialized");
        }

        const docRef = adminDb.collection(COLLECTION_NAME).doc(issue.id);
        const docSnap = await docRef.get();

        const data: any = {
            id: issue.id,
            title: issue.title,
            culprit: issue.culprit,
            type: issue.type,
            metadata: issue.metadata,
            permalink: issue.permalink,
            count: issue.count,
            userCount: issue.userCount,
            firstSeen: issue.firstSeen,
            lastSeen: issue.lastSeen,
            syncAt: FieldValue.serverTimestamp(),
        };

        if (!docSnap.exists) {
            data.status = 'unresolved';
            data.updatedAt = FieldValue.serverTimestamp();
            await docRef.set(data);
        } else {
            await docRef.update(data);
        }
    },

    async getIssues(status?: 'unresolved' | 'resolved' | 'ignored') {
        if (!adminDb) {
            throw new Error("Firebase Admin DB not initialized");
        }

        try {
            console.log(`[SentryDB] Fetching issues with status: ${status || 'all'}`);
            let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION_NAME);

            if (status && (status as string) !== 'all') {
                query = query.where("status", "==", status);
            }

            const snapshot = await query.get();
            const results = snapshot.docs.map(doc => doc.data() as DBStoredSentryIssue);

            // Sort in memory to avoid composite index requirement
            results.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

            return results;
        } catch (error) {
            console.error("[SentryDB] Error in getIssues:", error);
            throw error;
        }
    },

    async updateStatus(issueId: string, status: 'unresolved' | 'resolved' | 'ignored') {
        if (!adminDb) {
            throw new Error("Firebase Admin DB not initialized");
        }

        const docRef = adminDb.collection(COLLECTION_NAME).doc(issueId);
        await docRef.update({
            status,
            updatedAt: FieldValue.serverTimestamp()
        });
    }
};
