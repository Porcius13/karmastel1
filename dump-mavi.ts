import { getBrowser } from "./src/lib/scrapers/utils";
import * as fs from "fs";

async function dump() {
    const url = "https://www.mavi.com/suni-kurk-detayli-yesil-ceket/p/0110627-87538";
    console.log("Fetching Mavi URL:", url);

    const browser = await getBrowser();
    const page = await browser.newPage();

    // Mavi often requires similar headers to standard browsers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        const content = await page.content();
        fs.writeFileSync("mavi_dump.html", content);
        console.log("Dumped to mavi_dump.html");
    } catch (e) {
        console.error("Puppeteer failed:", e);
    } finally {
        await browser.close();
    }
}

dump();
