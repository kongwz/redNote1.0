import { GoogleGenAI, Type } from "@google/genai";
import { GenerationSettings, RedNoteOption } from "../types";

// Helper to convert File to Base64 stripped of data header
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const AUDIENCE_MAP: Record<string, string> = {
  general: "大众 (General Audience)",
  students: "00后/学生党 (Gen Z Students)",
  office_workers: "打工人/早八人 (Office Workers)",
  parents: "宝妈/奶爸 (Parents)",
  couples: "情侣/恋爱中 (Couples)",
  photographers: "摄影佬/互勉 (Photographers)",
  young_women: "精致女生/独居 (Young Women)",
};

const TONE_MAP: Record<string, string> = {
  authentic: "口语化/碎碎念 (Casual/Vlogging)",
  emotional: "情绪宣泄/深夜EMO (Emotional/Vibe)",
  informative: "干货/避坑指南 (Tips/Guide)",
  humorous: "搞笑女/发疯文学 (Funny/Meme)",
  news: "吃瓜/震惊体 (Gossip/News)",
};

// --- CORE FUNCTION ---
export const generateRedNoteContent = async (
  files: File[], 
  settings: GenerationSettings
): Promise<RedNoteOption[]> => {
  
  // 1. Prepare Prompt Parts
  const imageParts = await Promise.all(
    files.map(async (file) => ({
      inlineData: {
        data: await fileToGenerativePart(file),
        mimeType: file.type,
      },
    }))
  );

  let styleInstruction = "";
  if (settings.mode === 'imitate' && settings.referenceContent) {
    styleInstruction = `
      **TASK: STYLE TRANSFER (MIMICRY)**
      REFERENCE TEXT: """${settings.referenceContent}"""
      ANALYSIS: Copy structure, tone, slang, emoji usage.
    `;
  } else {
    styleInstruction = `
      CONTEXT: Audience: ${AUDIENCE_MAP[settings.audience]}, Vibe: ${TONE_MAP[settings.tone]}
      RULES: No robotic intro. Use slang. Imperfect grammar. Natural emojis.
    `;
  }

  const prompt = `
    You are a popular Xiaohongshu (RedNote) influencer.
    Write titles and captions for the attached images.
    ${styleInstruction}
    OUTPUT: 3 Variations (Direct Imitation, Emotional, Practical).
    FORMAT: JSON Array.
  `;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        reasoning: { type: Type.STRING }
      },
      required: ["title", "content", "tags", "reasoning"],
    },
  };

  // --- BRANCHING LOGIC: Frontend SDK vs Backend Proxy ---
  
  if (process.env.API_KEY) {
    // Mode A: Frontend Direct (Good for dev with VPN, bad for China production)
    console.log("Using Frontend Gemini SDK");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [...imageParts, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.9,
      },
    });

    if (!response.text) throw new Error("No response text.");
    const jsonResponse = JSON.parse(response.text);
    return jsonResponse.map((item: any, index: number) => ({ ...item, id: `gemini-${Date.now()}-${index}` }));

  } else {
    // Mode B: Backend Proxy (Recommended for Production)
    console.log("Using Backend Proxy (/api/gemini)");
    
    // We need to send pure JSON, so we can't send 'inlineData' binary easily directly via SDK types without conversion
    // For simplicity in proxy mode, we send the prompt and base64 images as a JSON payload to our own server
    
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: "gemini-3-flash-preview",
            contents: { parts: [...imageParts, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.9,
            }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Backend Generation Failed");
    }

    // The backend returns the full Gemini response object
    const data = await response.json();
    
    // Extract text from the raw Gemini response structure
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Backend returned empty response");

    const jsonResponse = JSON.parse(text);
    return jsonResponse.map((item: any, index: number) => ({ ...item, id: `gemini-proxy-${Date.now()}-${index}` }));
  }
};

// --- HELPER FUNCTION: Analyze Images for DeepSeek ---
export const analyzeImagesForDeepSeek = async (files: File[]): Promise<string> => {
  const imageParts = await Promise.all(
    files.map(async (file) => ({
      inlineData: {
        data: await fileToGenerativePart(file),
        mimeType: file.type,
      },
    }))
  );

  const prompt = "Describe these images in extreme detail for a copywriter. Output only description.";

  if (process.env.API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: [...imageParts, { text: prompt }] },
      });
      return response.text || "No description.";
  } else {
      // Proxy Mode
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: "gemini-3-flash-preview",
            contents: { parts: [...imageParts, { text: prompt }] }
        })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No description.";
  }
};