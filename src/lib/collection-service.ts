import { db } from "./firebase";
import {
    collection,
    doc,
    updateDoc,
    getDoc,
    query,
    where,
    getDocs,
    writeBatch,
    arrayUnion
} from "firebase/firestore";

export const CollectionService = {
    // Add a collaborator to a collection
    async addCollaborator(collectionId: string, collaboratorUid: string) {
        try {
            const colRef = doc(db, "collection_settings", collectionId);
            const colSnap = await getDoc(colRef);

            if (!colSnap.exists()) throw new Error("Collection not found");
            const colData = colSnap.data();

            // 1. Update Collection Settings
            await updateDoc(colRef, {
                participants: arrayUnion(collaboratorUid),
                collaborators: arrayUnion(collaboratorUid) // For backward compatibility
            });

            // 2. Update all products in this collection
            const productsRef = collection(db, "products");
            const q = query(
                productsRef,
                where("userId", "==", colData.userId),
                where("collection", "==", colData.name)
            );

            const snapshot = await getDocs(q);
            const batch = writeBatch(db);

            snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, {
                    participants: arrayUnion(collaboratorUid),
                    isPublic: colData.isPublic || false // Sync public status
                });
            });

            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error("Error adding collaborator:", error);
            throw error;
        }
    }
};
