export interface SentryIssue {
    id: string;
    title: string;
    culprit: string;
    permalink: string;
    lastSeen: string;
    firstSeen: string;
    count: string;
    userCount: number;
    metadata: {
        value?: string;
        type?: string;
        filename?: string;
        function?: string;
    };
    status: string;
}

export const SentryService = {
    async getIssues(): Promise<SentryIssue[]> {
        const token = process.env.SENTRY_API_TOKEN;
        const orgSlug = "porcidev";
        const projectSlug = "miayis-tracker";

        if (!token) {
            console.error("SENTRY_API_TOKEN is missing");
            return [];
        }

        try {
            const response = await fetch(
                `https://sentry.io/api/0/projects/${orgSlug}/${projectSlug}/issues/`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Sentry API Error:", errorData);
                throw new Error(`Sentry API returned ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error fetching Sentry issues:", error);
            return [];
        }
    },

    async getIssueDetails(issueId: string) {
        const token = process.env.SENTRY_API_TOKEN;
        if (!token) return null;

        try {
            const response = await fetch(
                `https://sentry.io/api/0/issues/${issueId}/`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Error fetching Sentry issue details:", error);
            return null;
        }
    },

    async syncWithFirestore() {
        try {
            const issues = await this.getIssues();
            const { SentryDBService } = await import("./sentry-db");

            let syncCount = 0;
            for (const issue of issues) {
                try {
                    const sanitizedIssue = JSON.parse(JSON.stringify(issue));
                    await SentryDBService.upsertIssue(sanitizedIssue);
                    syncCount++;
                } catch (err) {
                    console.error(`[SentryService] Failed to upsert issue ${issue.id}:`, err);
                }
            }

            return { success: true, count: syncCount };
        } catch (error: any) {
            console.error("Error syncing Sentry with Firestore:", error);
            return { success: false, error: error.message };
        }
    }
};
