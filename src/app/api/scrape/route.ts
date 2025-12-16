import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

// --- INTERFACES ---

interface ScrapedData {
    title: string;
    price: number;
    image: string;
    currency: string;
    description: string;
    source: 'json-ld' | 'regex-scan' | 'visual-scan' | 'dom-selectors' | 'manual';
    error?: string;
}

// --- HELPERS ---

function cleanPrice(text: string | number | undefined | null): number {
    if (text === null || text === undefined) return 0;
    if (typeof text === 'number') return text;

    // Remove currency symbols and whitespace
    let cleaned = text.toString().replace(/\s+/g, "").trim();
    cleaned = cleaned.replace(/tl|try|usd|eur|\$|€|£|₺/gi, "");

    // Handle Turkish number format (1.234,56 -> 1234.56) or standard (1,234.56 -> 1234.56)
    // Heuristic: if comma is after dot, or comma is near end (decimals)

    // Simple approach for TR sites: remove dots (thousands), replace comma with dot
    if (cleaned.includes(",") && cleaned.includes(".")) {
        // Assume 1.250,90 format
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (cleaned.includes(",")) {
        // Assume 12,90 or 1250,90
        cleaned = cleaned.replace(",", ".");
    }

    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
}

// --- MAIN HANDLER ---

export async function POST(request: Request) {
    let url = "";
    let browser = null;

    try {
        const json = await request.json();
        url = json.url;

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Launch Puppeteer
        browser = await puppeteer.launch({
            headless: "new" as any,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Optimizations
        await page.setViewport({ width: 1280, height: 800 }); // Desktop Viewport
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for potential dynamic content (optional but safe)
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) { }

        // --- DEEP SCAN EVALUATION ---
        const rawData = await page.evaluate(() => {
            const result: any = {
                title: "",
                price: "",
                image: "",
                currency: "TRY",
                source: "manual"
            };

            // 1. Basic Metadata (Title/Image)
            const h1 = document.querySelector('h1#product-name') || document.querySelector('h1.product-name') || document.querySelector('h1');
            if (h1 && h1.textContent) result.title = h1.textContent.trim();
            else result.title = document.title;

            const img: any = document.querySelector('img.product-image') || document.querySelector('.product-image-wrapper img');
            if (img && img.src) result.image = img.src;

            // --- METHOD A: DEEP JSON-LD SCAN ---
            try {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    const content = script.innerHTML;
                    if (!content) continue;
                    try {
                        let json = JSON.parse(content);
                        if (!Array.isArray(json)) json = [json];

                        // Recursive search for 'Product' with 'offers'
                        const searchJson = (obj: any): any => {
                            if (!obj || typeof obj !== 'object') return null;

                            if (obj['@type'] === 'Product' || obj['@type'] === 'http://schema.org/Product') {
                                if (obj.offers) {
                                    return obj;
                                }
                            }

                            for (const key in obj) {
                                const found = searchJson(obj[key]);
                                if (found) return found;
                            }
                            return null;
                        };

                        for (const item of json) {
                            const product = searchJson(item);
                            if (product) {
                                // Extract from offers
                                const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
                                for (const offer of offers) {
                                    if (offer.price || offer.lowPrice || offer.highPrice) {
                                        result.price = offer.price || offer.lowPrice || offer.highPrice;
                                        result.currency = offer.priceCurrency || "TRY";
                                        result.source = 'json-ld';

                                        // Update title/image if missing
                                        if (!result.title && product.name) result.title = product.name;
                                        if (!result.image && product.image) {
                                            result.image = Array.isArray(product.image) ? product.image[0] : product.image;
                                        }
                                        return result; // FOUND!
                                    }
                                }
                            }
                        }
                    } catch (e) { }
                }
            } catch (e) { }

            if (result.price) return result;

            // --- METHOD B: REGEX SCRIPT SCAN ---
            // Scan detailed script tags or innerHTML for patterns
            try {
                const html = document.body.innerHTML;
                // Patterns: "price": 1234.56 or "amount": "1234.56"
                // Prioritize 'current price' context if possible, but raw scan is 'dirty' fallback
                const priceRegex = /"(?:price|amount|value)"\s*:\s*["']?(\d+(?:\.\d+)?)["']?/g;
                let match;
                // We want to find a realistic price (e.g. > 10) to avoid "0" or "1" flags
                while ((match = priceRegex.exec(html)) !== null) {
                    const p = parseFloat(match[1]);
                    if (!isNaN(p) && p > 10) {
                        result.price = p;
                        result.source = 'regex-scan';
                        return result; // Greedy: take first plausible number
                    }
                }
            } catch (e) { }

            if (result.price) return result;

            // --- METHOD C: VISUAL / COMPUTED STYLE SCAN ---
            // Find text nodes with currency symbols, check font size
            try {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                let node;
                const candidates = [];

                while (node = walker.nextNode()) {
                    const txt = node.textContent?.trim();
                    if (txt && (txt.includes('TL') || txt.includes('₺')) && /\d/.test(txt)) {
                        if (txt.length < 30) { // Short text only
                            const parent = node.parentElement;
                            if (parent) {
                                const style = window.getComputedStyle(parent);
                                const fontSize = parseFloat(style.fontSize); // e.g. "24px" -> 24
                                candidates.push({ txt, fontSize, parent });
                            }
                        }
                    }
                }

                // Sort by font size descending
                candidates.sort((a, b) => b.fontSize - a.fontSize);

                if (candidates.length > 0) {
                    // Largest font is likely the main price
                    result.price = candidates[0].txt;
                    result.source = 'visual-scan';
                    return result;
                }
            } catch (e) { }

            return result;
        });

        // --- DEBUGGING ---
        if (!rawData.price || rawData.price === 0) {
            console.warn("Deep scan failed to find price. Saving debug files...");
            const html = await page.content();
            fs.writeFileSync(path.resolve(process.cwd(), 'debug-html.txt'), html);
            await page.screenshot({ path: path.resolve(process.cwd(), 'debug-error.png') });
        }

        // Clean Data
        const finalData: ScrapedData = {
            title: rawData.title || "",
            image: rawData.image || "",
            description: "",
            price: cleanPrice(rawData.price),
            currency: rawData.currency || "TRY",
            source: rawData.source as any
        };

        if (finalData.price === 0) {
            finalData.source = 'manual';
        }

        return NextResponse.json({
            ...finalData,
            url
        });

    } catch (error: any) {
        console.warn(`Scraping failed for ${url}:`, error.message);
        return NextResponse.json({
            title: "",
            image: "",
            price: 0,
            currency: "TRY",
            url: url,
            status: "manual",
            error: error.message
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
