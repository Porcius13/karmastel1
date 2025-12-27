import { ScrapedData } from "../../types";

export type { ScrapedData };

export interface ScraperStrategy {
    scrape(url: string): Promise<ScrapedData>;
}
