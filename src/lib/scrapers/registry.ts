import { ScraperFunction } from "./types";
import { hmScraper } from "./hm";
import { maviScraper } from "./mavi";
import { zaraScraper } from "./zara";
import { mangoScraper } from "./mango";
import { beymenScraper } from "./beymen";
import { amazonScraper } from "./amazon";
import { trendyolScraper } from "./trendyol";
import { genericScraper } from "./generic";
import { lcwScraper } from "./lcw";
import { defactoScraper } from "./defacto";

export function getScraper(domain: string): ScraperFunction {
    if (domain.includes("beymen.com")) return beymenScraper;
    if (domain.includes("mango.com")) return mangoScraper;
    if (domain.includes("hm.com")) return hmScraper;
    if (domain.includes("mavi.com")) return maviScraper;
    if (domain.includes("zara.com")) return zaraScraper;
    if (domain.includes("amazon.")) return amazonScraper;
    if (domain.includes("trendyol.com")) return trendyolScraper;
    if (domain.includes("lcw.com") || domain.includes("lcwaikiki.com")) return lcwScraper;
    if (domain.includes("defacto.com")) return defactoScraper;

    // Default to generic (which handles Shopify, Meta, JSON-LD)
    return genericScraper;
}
