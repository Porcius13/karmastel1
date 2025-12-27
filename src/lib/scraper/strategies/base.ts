import { ScrapedData, ScraperStrategy } from "../types";

export function smartPriceParse(raw: any): number {
    if (!raw) return 0;
    if (typeof raw === 'number') return raw;

    let str = raw.toString().trim();

    // Detect malformed Shopify-style TRY prices like "8.920.00"
    const dots = (str.match(/\./g) || []).length;
    if (dots > 1) {
        const parts = str.split('.');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length === 2 && /^\d+$/.test(lastPart)) {
            str = parts.slice(0, -1).join('') + '.' + lastPart;
        }
    }

    // Remove currency and other non-numeric chars, but keep . and ,
    str = str.replace(/[^\d.,]/g, "");

    if (!str) return 0;

    if (str.includes(',') && str.includes('.')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            str = str.replace(/\./g, "").replace(",", ".");
        } else {
            str = str.replace(/,/g, "");
        }
    } else if (str.includes(',')) {
        const parts = str.split(',');
        if (parts[parts.length - 1].length === 3 && str.length > 4) {
            str = str.replace(",", "");
        } else {
            str = str.replace(",", ".");
        }
    } else if (str.includes('.')) {
        const parts = str.split('.');
        if (parts[parts.length - 1].length === 3 && str.length > 4) {
            str = str.replace(".", "");
        }
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

export abstract class BaseScraper implements ScraperStrategy {
    abstract scrape(url: string): Promise<ScrapedData>;

    protected getFailResult(message: string = "Unknown error"): ScrapedData {
        return {
            title: "",
            price: 0,
            image: "https://placehold.co/600x600?text=No+Image",
            currency: "TRY",
            description: "",
            inStock: true,
            source: 'manual',
            error: message
        };
    }
}
