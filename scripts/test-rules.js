
const admin = require('firebase-admin');

// 1. Initialize Firebase Admin
// Make sure to replace this with your service account path or use default credentials if set up
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function testUsernameQuery() {
    try {
        console.log("Testing username query...");
        const usersRef = db.collection('users');
        const q = usersRef.where('username', '==', 'testuser'); // Replace with a known username if needed
        const snapshot = await q.get();

        if (snapshot.empty) {
            console.log("Query returned empty (success but no match).");
        } else {
            console.log(`Query success! Found ${snapshot.size} users.`);
            snapshot.forEach(doc => {
                console.log(doc.id, '=>', doc.data());
            });
        }
    } catch (error) { // The critical part: catch the permission error
        console.error("Query failed:", error);
    }
}

// 2. The issue reported is CLIENT SIDE permissions. 
// Admin SDK bypasses rules!
// To verify RULES we need to simulate a client, or use the Rules Test SDK.
// Since I can't easily setup the full test suite here, I will rely on the analysis of the rules file.
// The code above is actually useless for testing rules because Admin SDK > Rules.

console.log("Use this script only to verify NODE environment connectivity. Rules are bypassed here.");
testUsernameQuery();
