
import { scrapeProduct } from "../src/lib/scraper";

// Renkli konsol çıktıları için
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    bold: "\x1b[1m"
};

const testUrls = [
    {
        name: "US Polo Assn",
        url: "https://tr.uspoloassn.com/erkek-su-yesili-basic-tisort-50305929-vr048/"
    },
    {
        name: "Jimmy Key",
        url: "https://www.jimmykey.com/tr/rahat-kesim-yuvarlak-yaka-kolsuz-mini-elbise_5sw064757/acik-vizon/22"
    },
    {
        name: "Mavi",
        url: "https://www.mavi.com/keten-karisimli-kahverengi-gomlek/p/0211616-82337"
    },
    {
        name: "Twist",
        url: "https://www.twist.com.tr/urun/gri-sort-tr-17716"
    },
    {
        name: "Benetton",
        url: "https://tr.benetton.com/kiz-bebek/kiz-bebek-pembe-mix-kolu-logo-detayli-astarli-kapusonlu-yagmurluk_164594"
    },
    {
        name: "Reebok",
        url: "https://www.reebok.com.tr/urun/reebok-new-id-ovrs-gfx-tee-mavi-erkek-kisa-kol-t-shirt-102055767"
    }
];

async function runTests() {
    console.log(`${colors.bold}🚀 Starting Universal Scraper Benchmark...${colors.reset}\n`);

    for (const site of testUrls) {
        process.stdout.write(`Testing ${colors.blue}${site.name}${colors.reset}... `);

        const start = Date.now();
        try {
            const data = await scrapeProduct(site.url);
            const duration = Date.now() - start;

            if (data.price > 0) {
                console.log(`${colors.green}✅ [SUCCESS]${colors.reset} in ${duration}ms`);
                console.log(`   📝 Title: ${data.title.substring(0, 50)}...`);
                console.log(`   💰 Price: ${data.price} ${data.currency}`);
                console.log(`   🔍 Source: ${data.source}`);
            } else {
                // Manual status / Price 0
                console.log(`${colors.yellow}⚠️ [PARTIAL]${colors.reset} in ${duration}ms`);
                console.log(`   📝 Title: ${data.title.substring(0, 50)}...`);
                console.log(`   💰 Price: 0 (Manual Check Needed)`);
                console.log(`   ❌ Reason: ${data.error || "Price not found"}`);
            }

        } catch (e: any) {
            const duration = Date.now() - start;
            console.log(`${colors.red}❌ [FAIL]${colors.reset} in ${duration}ms`);
            console.log(`   🐛 Error: ${e.message}`);
            console.error("CRASH:", e.message);
        }

        console.log("-".repeat(50));
        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n${colors.bold}🏁 Benchmark Complete.${colors.reset}`);
    process.exit(0);
}

runTests();
