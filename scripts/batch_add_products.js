// Using native fetch

const urls = [
    "https://tr.uspoloassn.com/erkek-su-yesili-basic-tisort-50305929-vr048/",
    "https://www.jimmykey.com/tr/rahat-kesim-yuvarlak-yaka-kolsuz-mini-elbise_5sw064757/acik-vizon/22",
    "https://www.mavi.com/keten-karisimli-kahverengi-gomlek/p/0211616-82337?_gl=1*1avmh4n*_up*MQ..&gclid=CjwKCAjwy7HEBhBJEiwA5hQNouZhWNJEtU7ihoGNGWao4goy9iCUQ4NiUA4aR-UjngjUy-gVszxk_xoCAaIQAvD_BwE",
    "https://www.twist.com.tr/urun/gri-sort-tr-17716",
    "https://tr.benetton.com/kiz-bebek/kiz-bebek-pembe-mix-kolu-logo-detayli-astarli-kapusonlu-yagmurluk_164594",
    "https://www.reebok.com.tr/urun/reebok-new-id-ovrs-gfx-tee-mavi-erkek-kisa-kol-t-shirt-102055767",
    "https://www.adidas.com.tr/tr/sl-72-rs-ayakkabi/JS0749.html",
    "https://www.newbalance.com.tr/urun/new-balance-mnt3326-1183",
    "https://www.cizgimedikal.com/luks-likrali-uniforma-takimlar-tr-43/",
    "https://www.notusuniform.com/urun/petrol-yesili-klasik-erkek-uniforma-takim",
    "https://ontrailstore.com/products/ahsap-katlanir-masa?variant=42614447702240",
    "https://www.ellesse.com.tr/products/ellesse-erkek-polo-yaka-tisort-em460-bk",
    "https://www.superstep.com.tr/urun/adidas-inter-miami-cf-erkek-pembe-sweatshirt/ji6907/",
    "https://www.instreet.com.tr/urun/us-polo-assn-noah-5fx-beyaz-erkek-sneaker-101947861",
    "https://www.crocs.com.tr/urun/mellow-luxe-recovery-slide-black/",
    "https://www.lufian.com/gage-erkek-deri-sneaker-ayakkabi-siyah-8641"
];

async function addProducts() {
    console.log(`Starting batch add for ${urls.length} products...`);

    for (const [index, url] of urls.entries()) {
        console.log(`[${index + 1}/${urls.length}] Processing: ${url}`);
        try {
            const response = await fetch('http://localhost:3000/api/add-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`✅ Success: ${data.data.title} (${data.data.collection})`);
            } else {
                console.log(`❌ Failed: ${data.error}`);
            }
        } catch (error) {
            console.error(`❌ Error connecting to API: ${error.message}`);
        }

        // Wait a bit to avoid overwhelming the server/scraper
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("Batch processing complete.");
}

addProducts();
