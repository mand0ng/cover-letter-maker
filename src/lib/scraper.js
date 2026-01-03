import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Configure stealth plugin
puppeteer.use(StealthPlugin());

export async function scrapeJobPosting(url) {
    let browser;
    try {
        console.log(`Launching Puppeteer for URL: ${url}`);

        // Launch browser with stealth settings
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();

        // Set a realistic viewport
        await page.setViewport({ width: 1366, height: 768 });

        // Navigate to URL
        console.log("Navigating to page...");
        // Networkidle2 waits until there are no more than 2 network connections for at least 500ms
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Extract content
        const content = await page.evaluate(() => {
            // Priority list of selectors to find the job description part
            const selectors = [
                '#jobDescriptionText', // Indeed
                '.job-description',
                '.description',
                'main',
                'article',
                'body'
            ];

            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el && el.innerText.trim().length > 200) {
                    return el.innerText.trim();
                }
            }
            return document.body.innerText;
        });

        if (!content || content.length < 100) {
            throw new Error("Scraped content too short");
        }

        // Anti-bot check
        const antiBotMarkers = [
            "Just a moment...",
            "Enable JavaScript and cookies",
            "verify you are human",
            "Access denied"
        ];

        if (antiBotMarkers.some(marker => content.includes(marker))) {
            throw new Error("Scraper was blocked by anti-bot protection (Cloudflare/Indeed)");
        }

        return content;

    } catch (error) {
        console.error("Puppeteer Scrape Error:", error);
        if (error.message.includes("anti-bot")) {
            throw error;
        }
        throw new Error("Could not scrape via Puppeteer. " + error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
