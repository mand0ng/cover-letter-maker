
import { NextResponse } from 'next/server';
import { scrapeJobPosting } from '@/lib/scraper';

export async function POST(req) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        console.log(`Testing scraper for URL: ${url}`);
        const content = await scrapeJobPosting(url);

        return NextResponse.json({
            success: true,
            url,
            contentLength: content.length,
            contentPreview: content.substring(0, 500) + "...",
            fullContent: content
        });

    } catch (error) {
        console.error('Test Scrape Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
