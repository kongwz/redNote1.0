import fetch from 'node-fetch';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    // Basic fetch implementation. 
    // On Vercel, you have limited execution time (10s on free tier), so complex scraping might timeout.
    // For basic text extraction, this is usually fine.
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    
    const text = await response.text();
    
    // Simple meta description extraction
    const contentMatch = text.match(/<meta name="description" content="([^"]*)"/);
    const content = contentMatch ? contentMatch[1] : "未提取到内容，由于小红书反爬策略严格，建议直接复制文字粘贴。";

    res.status(200).json({ content });
  } catch (error) {
    console.error("Scrape Error:", error);
    res.status(500).json({ error: "Failed to scrape URL" });
  }
}