export interface PricePoint {
    price: number;
    date: string;
}

export interface Product {
    id: string;
    userId: string;
    url: string;
    title: string;
    image: string;
    price: number | string; // Allowing string for compatibility during refactor
    currency: string;
    inStock: boolean;
    source: string;
    collection?: string; // Optional
    category?: string; // Smart Category (e.g. "Gömlek", "Pantolon")
    targetPrice?: number;
    isFavorite?: boolean;
    originalSourceId?: string;
    priceHistory?: PricePoint[];
    createdAt?: any; // Firestore Timestamp
    updatedAt?: any; // Firestore Timestamp
    description?: string;
    aspect?: string; // For aspect ratio classes
}

export interface ScrapedData {
    title: string;
    price: number;
    image: string;
    currency: string;
    description: string;
    inStock: boolean;
    source: 'meta-tag' | 'json-ld' | 'dom-selectors' | 'regex-scan' | 'manual' | 'dom-selectors-isolated' | 'amazon-dom';
    error?: string;
}
