
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as crypto from 'crypto';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Dynamic imports
const { adminDb } = await import("../src/lib/firebase-admin");
import { FieldValue } from 'firebase-admin/firestore';

function generateLinkHash(url: string): string {
    const cleanUrl = url.trim();
    return crypto.createHash('md5').update(cleanUrl).digest('hex');
}

async function main() {
    console.log("Starting Migration to Link Pool...");

    if (!adminDb) {
        console.error("Firebase Admin DB not initialized. Check env vars.");
        process.exit(1);
    }

    try {
        const productsRef = adminDb.collection("products");
        const linksRef = adminDb.collection("monitored_links");

        console.log("Fetching all products...");
        const snapshot = await productsRef.get();
        console.log(`Found ${snapshot.size} products.`);

        let processed = 0;
        let linksCreated = 0;
        const batchSize = 500;
        let batch = adminDb.batch();
        let opsCount = 0;

        for (const doc of snapshot.docs) {
            const product = doc.data();
            const productId = doc.id;
            const url = product.url;

            if (!url || url === "MOCK") {
                console.log(`Skipping invalid/mock product: ${productId}`);
                continue;
            }

            const linkHash = generateLinkHash(url);
            const linkRef = linksRef.doc(linkHash);

            // Prepare update data
            // We use set with merge: true to avoid overwriting existing data if multiple products share URL
            // But for arrayUnion we need to be careful. Firestore batch set with merge works with FieldValue.
            const linkData = {
                url: url,
                title: product.title || "",
                image: product.image || "",
                description: product.description || "",
                source: product.source || "unknown",
                price: product.price || 0,
                currency: product.currency || 'TRY',
                inStock: product.inStock ?? true,
                lastChecked: product.lastStockCheck || product.createdAt || new Date(),
                productIds: FieldValue.arrayUnion(productId)
            };

            batch.set(linkRef, linkData, { merge: true });
            opsCount++;
            processed++;

            if (opsCount >= batchSize) {
                await batch.commit();
                console.log(`Committed batch of ${opsCount} operations.`);
                batch = adminDb.batch();
                opsCount = 0;
                linksCreated += opsCount; // Roughly
            }
        }

        if (opsCount > 0) {
            await batch.commit();
            console.log(`Committed final batch of ${opsCount} operations.`);
        }

        console.log(`Migration Complete. Processed ${processed} products.`);

    } catch (error) {
        console.error("Migration failed:", error);
    }
}

main();
