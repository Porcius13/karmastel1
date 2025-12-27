import { DefaultScraper } from "./strategies/default";
import { HMScraper } from "./strategies/hm";
import { MaviScraper } from "./strategies/mavi";
import { AmazonScraper } from "./strategies/amazon";
import { ScraperStrategy } from "./types";

export class ScraperFactory {
    static getStrategy(url: string): ScraperStrategy {
        let domainName = "unknown";
        try {
            // Handle cases where URL might not have http/https prefix yet
            const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
            domainName = new URL(cleanUrl).hostname.replace('www.', '');
        } catch (e) {
            // If URL is invalid, let DefaultScraper handle the error or throw
            return new DefaultScraper();
        }

        if (domainName.includes("hm.com")) {
            return new HMScraper();
        }

        if (domainName.includes("mavi.com")) {
            return new MaviScraper();
        }

        if (domainName.includes("amazon.") || domainName.includes("amzn.")) {
            return new AmazonScraper();
        }

        return new DefaultScraper();
    }
}
