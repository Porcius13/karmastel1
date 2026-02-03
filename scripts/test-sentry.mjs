import Sentry from "@sentry/nextjs";
import 'dotenv/config';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "https://321407a4f56560dc1aadd35749741eb1@o4510554827784192.ingest.de.sentry.io/4510554846134352";

console.log("Initializing Sentry in standalone mode...");
console.log("DSN:", DSN);

Sentry.init({
    dsn: DSN,
    debug: true,
});

async function run() {
    console.log("Capturing exception...");

    try {
        throw new Error("Sentry Standalone Script Test Error - " + new Date().toISOString());
    } catch (e) {
        const eventId = Sentry.captureException(e);
        console.log("Captured Event ID:", eventId);
    }

    console.log("Flushing...");
    const result = await Sentry.flush(5000);
    console.log("Flush result (true=success):", result);
}

run().catch(console.error);
