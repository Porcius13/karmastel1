import { BaseScraper } from "./base";
import { ScrapedData } from "../types";
import { getBrowser } from "../browser";

export class HMScraper extends BaseScraper {
    async scrape(url: string): Promise<ScrapedData> {
        const cleanUrlStr = url;
        const regionMatch = cleanUrlStr.match(/hm\.com\/([^\/]+)\//);
        let region = regionMatch ? regionMatch[1] : "tr_tr";
        const idMatch = cleanUrlStr.match(/productpage\.(\d+)\.html/) ||
            cleanUrlStr.match(/productpage\/(\d+)/) ||
            cleanUrlStr.match(/product\.(\d+)\.html/);
        const productId = idMatch ? idMatch[1] : null;

        if (productId) {
            console.log(`[H&M Scraper] Starting Search Strategy for ID: ${productId} (${region})`);

            let hmBrowser = null;
            try {
                hmBrowser = await getBrowser();
                const hmPage = await hmBrowser.newPage();
                await hmPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/122.0.0.0 Safari/537.36');
                await hmPage.setViewport({ width: 1366, height: 768 });

                // Try URL region first, then fallback to tr_tr or en_gb
                const regionsToTry = [region, 'tr_tr', 'en_gb', 'en_us'].filter((v, i, a) => a.indexOf(v) === i);

                for (const r of regionsToTry) {
                    const searchUrl = `https://www2.hm.com/${r}/search-results.html?q=${productId}`;
                    console.log(`[H&M Scraper] Trying Region ${r}...`);

                    try {
                        await hmPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

                        const result = await hmPage.evaluate(function (pid) {
                            const article = document.querySelector(`article[data-articlecode="${pid}"]`) ||
                                document.querySelector(`article[data-articlecode^="${pid.substring(0, 10)}"]`);
                            if (!article) return null;

                            const title = article.querySelector('h3')?.textContent?.trim() || "";
                            const spans = Array.from(article.querySelectorAll('span'));
                            const priceTexts = spans.map(s => s.textContent || "").filter(t => t.includes('TL') || t.includes('TRY') || t.includes('£') || t.includes('$')).join(' ');
                            const img = article.querySelector('img');
                            const image = img?.getAttribute('data-src') || img?.getAttribute('src') || "";

                            return { title, priceTexts, image };
                        }, productId);

                        if (result && result.title) {
                            const finalResult: ScrapedData = {
                                title: result.title,
                                price: 0,
                                image: result.image,
                                currency: r.includes("tr") ? "TRY" : (r.includes("gb") ? "GBP" : "USD"),
                                description: "",
                                inStock: true,
                                source: 'dom-selectors'
                            };

                            const matches = result.priceTexts.match(/(\d+[\d.,]*)/g);
                            if (matches && matches.length > 0) {
                                const parsedPrices = matches.map(m => {
                                    let s = m.replace(/[^\d.,]/g, "");
                                    if (s.includes(',') && s.includes('.')) {
                                        if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, "").replace(",", ".");
                                        else s = s.replace(/,/g, "");
                                    } else if (s.includes(',')) {
                                        const pts = s.split(',');
                                        if (pts[pts.length - 1].length === 3 && s.length > 4) s = s.replace(",", "");
                                        else s = s.replace(",", ".");
                                    } else if (s.includes('.')) {
                                        const pts = s.split('.');
                                        if (pts[pts.length - 1].length === 3 && s.length > 4) s = s.replace(".", "");
                                    }
                                    return parseFloat(s);
                                }).filter(p => !isNaN(p) && p > 0);

                                if (parsedPrices.length > 0) finalResult.price = Math.min(...parsedPrices);
                            }

                            if (finalResult.image && !finalResult.image.startsWith('http')) finalResult.image = 'https:' + finalResult.image;
                            if (finalResult.title && !finalResult.title.toLowerCase().includes("access denied")) {
                                console.log(`[H&M Scraper] Success in ${r}: ${finalResult.title}`);
                                return finalResult;
                            }
                        }
                    } catch (navErr) {
                        console.warn(`[H&M Scraper] Region ${r} failed navigation.`);
                    }
                }
            } finally {
                if (hmBrowser) await hmBrowser.close();
            }
        }

        return {
            title: productId ? `H&M Ürün (${productId})` : "H&M Ürün",
            price: 0,
            image: "https://placehold.co/600x600?text=H%26M+Product",
            currency: "TRY",
            description: "H&M koruması nedeniyle detaylar tam alınamadı. Manuel düzenleyebilirsiniz.",
            inStock: true,
            source: 'manual',
            error: "H&M restricted access (Search bypass failed)."
        };
    }
}
