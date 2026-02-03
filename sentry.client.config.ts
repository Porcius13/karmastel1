import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: "https://321407a4f56560dc1aadd35749741eb1@o4510554827784192.ingest.de.sentry.io/4510554846134352",

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: true,

    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions

    // Filter out transient, unfixable browser errors to reduce noise
    ignoreErrors: [
        "Connection to Indexed Database server lost",
        "QuotaExceededError",
        "NS_ERROR_FAILURE",
        "The operation is insecure",
        "Loading chunk", // Network errors during JS chunk loading
        "Load failed",
        "NotFoundError: The object can not be found here.",
        // Regex patterns for network/cancellation noise
        /AbortError/i,
        /Fetch is aborted/i,
        /network request failed/i,
        /Failed to fetch/i,
        /INTERNET_DISCONNECTED/i,
        // React/DOM interaction errors (usually external extensions/translation)
        /removeChild/i,
        /The node to be removed is not a child of this node/i
    ],
});
