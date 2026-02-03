import { SentryService } from "./src/lib/sentry-service.js"; // Note: might need adjustment for path/types
import dotenv from "dotenv";
dotenv.config({ path: '.env.local' });

async function runSync() {
    console.log("Triggering manual Sentry sync...");
    const result = await SentryService.syncWithFirestore();
    console.log("Result:", result);
}

runSync();
