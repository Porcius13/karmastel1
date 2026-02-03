import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: "https://321407a4f56560dc1aadd35749741eb1@o4510554827784192.ingest.de.sentry.io/4510554846134352",

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: true,

    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
});
