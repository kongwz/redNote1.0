import { GenerationSettings, RedNoteOption } from "../types";

// If using backend proxy, we point to our own server
// If using frontend key, we point to DeepSeek
const DEEPSEEK_DIRECT_URL = "https://api.deepseek.com/chat/completions";

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

export const generateDeepSeekContent = async (
  imageDescription: string,
  settings: GenerationSettings,
  userApiKey?: string
): Promise<RedNoteOption[]> => {
  
  // Decision: Proxy or Direct?
  // If user provided a key in UI, we use Direct (Frontend).
  // If no user key, we try Backend Proxy.
  const useProxy = !userApiKey && !process.env.DEEPSEEK_API_KEY;

  const systemPrompt = `
    You are a top-tier Xiaohongshu (RedNote) content creator.
    You will receive a description of images and must generate viral titles and captions.
    STRICT FORMAT: Return ONLY a valid JSON array.
  `;

  let taskInstruction = "";
  if (settings.mode === 'imitate' && settings.referenceContent) {
    taskInstruction = `
      **TASK: HIGH-FIDELITY STYLE TRANSFER**
      REFERENCE TEXT: """${settings.referenceContent}"""
      INSTRUCTIONS: Mimic the style, rhythm, and emoji usage exactly.
    `;
  } else {
    taskInstruction = `
      SETTINGS: Audience: ${AUDIENCE_MAP[settings.audience]}, Tone: ${TONE_MAP[settings.tone]}
      GUIDELINES: Colloquial, Anti-Structure, Emoji Flow.
    `;
  }

  const userPrompt = `
    IMAGE CONTEXT: ${imageDescription}
    ${taskInstruction}
    JSON STRUCTURE: [{"title": "...", "content": "...", "tags": [], "reasoning": "..."}]
  `;

  const payload = {
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    stream: false,
    response_format: { type: "json_object" },
    temperature: 1.1
  };

  try {
    let response;
    
    if (useProxy) {
        // --- PROXY MODE ---
        console.log("Using Backend Proxy for DeepSeek");
        response = await fetch('/api/deepseek', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } else {
        // --- DIRECT MODE ---
        const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY;
        console.log("Using Direct DeepSeek API");
        response = await fetch(DEEPSEEK_DIRECT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek Error: ${response.status} ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    let contentStr = data.choices[0].message.content;

    // Clean markdown
    contentStr = contentStr.replace(/```json/g, "").replace(/```/g, "").trim();

    // Parse Logic
    let jsonResponse;
    try {
        const parsed = JSON.parse(contentStr);
        if (Array.isArray(parsed)) jsonResponse = parsed;
        else if (parsed.items && Array.isArray(parsed.items)) jsonResponse = parsed.items;
        else if (Object.values(parsed).some(val => Array.isArray(val))) jsonResponse = Object.values(parsed).find(val => Array.isArray(val));
        else jsonResponse = [parsed]; 
    } catch (e) {
        throw new Error("Failed to parse DeepSeek JSON response");
    }

    return jsonResponse.map((item: any, index: number) => ({
      ...item,
      id: `generated-deepseek-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("DeepSeek Service Error:", error);
    throw error;
  }
};