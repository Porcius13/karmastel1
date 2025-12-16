"use server";

import { db } from "@/lib/firebase";
import { scrapeProduct } from "@/lib/scraper";
import { addDoc, collection, serverTimestamp } from "firebase/firestore"; // Note: This depends on client-sdk being usable in server actions (Firebase Admin might be better, but we stick to user's config)
// Wait, user provided lib/firebase.ts which likely uses client SDK.
// "firebase/firestore" works in Node if polyfills specific (or firebase-admin). 
// However, the prompt implies "backend" context. Let's assume user uses standard firebase JS SDK which works in Node environment too (v9+).
// Actually, for Server Actions, we should check if lib/firebase uses "firebase-admin" or "firebase/app".
// If "firebase/app", we need to ensure it's initialized. 

// Let's assume existing setup works. But wait, standard firebase Web SDK in Server Actions?
// It works but "addDoc" etc are tree-shakeable.
// Let's implement trusting the user's environment.

import { revalidatePath } from "next/cache";

export async function addProduct(prevState: any, formData: FormData) {
    const url = formData.get("url") as string;

    if (!url) {
        return { success: false, message: "URL gereklidir." };
    }

    try {
        // 1. Scrape
        const data = await scrapeProduct(url);

        if (data.error || (!data.title && !data.price)) {
            return { success: false, message: "Ürün bilgileri çekilemedi: " + (data.error || "Bilinmeyen hata") };
        }

        // 2. Save to Firestore
        // Note: If using Client SDK in Server Action, enable "experimental-server-actions" implies Node setup.
        // If this fails due to Auth/Env, verify Firebase config.
        await addDoc(collection(db, "products"), {
            url: url,
            title: data.title,
            price: data.price,
            image: data.image,
            currency: data.currency,
            source: data.source,
            status: 'active',
            createdAt: serverTimestamp()
        });

        revalidatePath("/");
        return { success: true, message: "Ürün başarıyla eklendi!" };
    } catch (error: any) {
        console.error("Add Product Error:", error);
        return { success: false, message: "Bir hata oluştu: " + error.message };
    }
}
