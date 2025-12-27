import { fetchStaticHtml } from "./src/lib/scrapers/utils";
import * as fs from "fs";
import { getBrowser } from "./src/lib/scrapers/utils";

async function dump() {
    const url = "https://www.defacto.com.tr/regular-fit-normal-kesim-cepli-duz-paca-chino-pantolon-3277181";
    console.log("Fetching DeFacto URL:", url);

    // Try Puppeteer first since we suspect static might be blocked or incomplete
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        const content = await page.content();
        fs.writeFileSync("defacto_dump.html", content);
        console.log("Dumped to defacto_dump.html");
    } catch (e) {
        console.error("Puppeteer failed:", e);
    } finally {
        await browser.close();
    }
}

dump();
