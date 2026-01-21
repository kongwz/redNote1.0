import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve Static Frontend Files (Assuming you build React to 'dist' folder)
app.use(express.static(path.join(__dirname, 'dist')));

// --- 1. GEMINI PROXY ENDPOINT ---
app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("Server missing API_KEY");

    const { model, contents, config } = req.body;
    
    // Initialize SDK on server side
    const ai = new GoogleGenAI({ apiKey });
    
    // Call Google
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: config
    });

    res.json(response);
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// --- 2. DEEPSEEK PROXY ENDPOINT ---
app.post('/api/deepseek', async (req, res) => {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("Server missing DEEPSEEK_API_KEY");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "DeepSeek API Error");
    
    res.json(data);
  } catch (error) {
    console.error("DeepSeek Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- 3. SCRAPER ENDPOINT ---
// Simple implementation to fetch text from a URL (Basic Scraping)
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    // Note: For production Xiaohongshu scraping, you typically need 
    // Puppeteer/Playwright because XHS is heavy SP/Client-rendered.
    // This is a basic fetch placeholder.
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    
    // In a real implementation, you would use Cheerio or Puppeteer here
    // to extract the specific <div class="desc"> content.
    // For now, we return a mock success or basic body text for demonstration.
    const text = await response.text();
    
    // Simple regex to try and find meta description or title as fallback
    // You should enhance this logic with Cheerio
    const contentMatch = text.match(/<meta name="description" content="([^"]*)"/);
    const content = contentMatch ? contentMatch[1] : "无法直接读取动态内容，请尝试手动复制文案。";

    res.json({ content });
  } catch (error) {
    console.error("Scrape Error:", error);
    res.status(500).json({ error: "Failed to scrape URL" });
  }
});

// Handle React Routing (return index.html for all other routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Region Check: Ensure this server can access Google APIs.`);
});