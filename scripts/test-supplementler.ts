import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFetch() {
    const url = 'https://www.supplementler.com/urun/weider-premium-whey-protein-2300-gr-6510';
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        console.log('Title:', $('title').text());
        console.log('OG Image:', $('meta[property="og:image"]').attr('content'));
        console.log('Twitter Image:', $('meta[name="twitter:image"]').attr('content'));
        console.log('Schema Org Image:', $('script[type="application/ld+json"]').html()?.substring(0, 500));

        // Find potential image selectors
        console.log('Main Image Src:', $('#product-image').attr('src'));
        console.log('Product Image Class Src:', $('.product-image img').attr('src'));
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

testFetch();
