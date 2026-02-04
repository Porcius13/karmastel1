export interface ScrapedData {
    title: string;
    price: number;
    image: string;
    currency: string;
    description: string;
    inStock: boolean;
    source: string;
    error?: string;
    rawTitle?: string;
    rawPrice?: string;
}

export interface ScraperContext {
    url: string;
    domain: string;
    browser: any;
    page: any;
}

export type ScraperFunction = (context: ScraperContext) => Promise<ScrapedData>;
