import { NextResponse } from 'next/server';
import { parseResume } from '@/lib/parser';
import { scrapeJobPosting } from '@/lib/scraper';
import { generateCoverLetter } from '@/lib/ai';

export const runtime = 'nodejs'; // Force Node.js runtime for Puppeteer

export async function POST(req) {
    // 1. Parse Request Body outside the stream
    let formData;
    try {
        formData = await req.formData();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const url = formData.get('url');
    const resumeFile = formData.get('resume');
    const manualDescription = formData.get('manualDescription');
    const apiKey = formData.get('apiKey');

    if (!resumeFile) {
        return NextResponse.json({ error: 'Resume file is required' }, { status: 400 });
    }
    if (!apiKey) {
        return NextResponse.json({ error: 'Gemini API Key is required' }, { status: 400 });
    }
    if (!url && !manualDescription) {
        return NextResponse.json({ error: 'Job description or URL is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();

    // 2. Return Streaming Response
    const stream = new ReadableStream({
        async start(controller) {
            const sendUpdate = (step, message) => {
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', step, message }) + '\n'));
            };

            const sendError = (message) => {
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message }) + '\n'));
            };

            try {
                // Step 1: Analyze Job URL (Scraping)
                let jobDescription = manualDescription || '';

                if (url && !jobDescription) {
                    sendUpdate(1, 'Analyzing Job URL & Description...');
                    try {
                        jobDescription = await scrapeJobPosting(url);
                    } catch (scrapeError) {
                        // If scrape fails, we'll try to proceed if they provided manual text, 
                        // otherwise we might need to error out or ask user. 
                        // For now, if scraped failed and no manual, we error.
                        console.warn("Scraping failed:", scrapeError);
                        if (!manualDescription) {
                            throw new Error(scrapeError.message || "Failed to scrape job. Please paste description manually.");
                        }
                    }
                } else {
                    sendUpdate(1, 'Processing Job Description...');
                    // Small artificial delay if manual so the step is visible
                    await new Promise(r => setTimeout(r, 800));
                }

                // Step 2: Parse Resume
                sendUpdate(2, 'Analyzing Resume Content...');
                const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
                const resumeText = await parseResume(resumeBuffer, resumeFile.type);

                // Step 3: Generate
                sendUpdate(3, 'Drafting Your Cover Letter...');
                const coverLetter = await generateCoverLetter(resumeText, jobDescription, apiKey);

                // Final Result
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'result', data: coverLetter }) + '\n'));
                controller.close();

            } catch (error) {
                console.error('Generation Error:', error);
                sendError(error.message);
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
        }
    });
}
