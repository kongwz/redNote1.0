/**
 * This service handles communication with your backend server.
 * Since pure frontend cannot scrape Xiaohongshu due to CORS,
 * we send the URL to your server, and the server returns the text.
 */

export const extractContentFromUrl = async (url: string, serverUrl: string): Promise<string> => {
  // Normalize Server URL
  // If serverUrl is empty, we assume we are on Vercel (Same Origin), so we use "" to make it a relative path "/api/scrape"
  const baseUrl = serverUrl ? serverUrl.replace(/\/$/, "") : "";
  
  // Validate URL basic format
  if (!url.includes('xiaohongshu.com') && !url.includes('xhslink.com')) {
    throw new Error("请提供有效的小红书笔记链接");
  }

  try {
    // Attempt to call the user's backend (Vercel or Custom Server)
    const response = await fetch(`${baseUrl}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("接口未找到 (404)。如果您使用 Vercel，请检查 api/scrape.js 是否存在。");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "服务器提取内容失败");
    }

    const data = await response.json();
    return data.content || ""; 

  } catch (error: any) {
    console.error("Scraping Error:", error);
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error("无法连接到后端服务。请检查网络或配置。");
    }
    throw error;
  }
};