import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Polyfill missing browser globals for pdf-parse (pdf.js) in Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {
        constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
    };
}
if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData { };
}

const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

export async function parseResume(buffer, mimeType) {
    try {
        if (mimeType === 'application/pdf') {
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            return result.text;
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword'
        ) {
            const { value } = await mammoth.extractRawText({ buffer });
            return value;
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (error) {
        console.error('Parsing error:', error);
        throw new Error('Failed to parse resume: ' + error.message);
    }
}
