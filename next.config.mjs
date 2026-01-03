/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'pdf-parse',
    'pdfjs-dist',
    '@napi-rs/canvas',
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth'
  ],
};

export default nextConfig;
