
import puppeteer from 'puppeteer';
async function run() {
    console.log("Testing Puppeteer evaluate with tsx...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    try {
        const res = await page.evaluate(() => {
            const myFunc = function () { return "ok"; };
            return myFunc();
        });
        console.log("RESULT:", res);
    } catch (e: any) {
        console.error("ERROR:", e.message);
    }
    await browser.close();
}
run();
