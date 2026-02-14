
import { GoogleGenAI } from "@google/genai";
import { BriefLength, BriefVoice } from "../types";

// Always initialize GoogleGenAI with the process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Google Search grounding to "visit" and extract content from a URL.
 * Improved with more robust parsing and explicit instructions to avoid refusals.
 */
export async function extractArticleFromUrl(url: string): Promise<{ title: string; content: string; sources: { uri: string; title: string }[] }> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert news researcher and web scraper. 
      PRIMARY TASK: Retrieve the full article text from this URL: ${url}
      
      INSTRUCTIONS:
      1. Use your search tools to access and read the page content.
      2. If the URL is behind a paywall or login, please use your search tools to find the same news story from other reputable public sources.
      3. Provide the full, detailed article text. Do not summarize. 
      4. If you absolutely cannot find any related article content, start your response with "FAILURE: REASON".
      
      OUTPUT FORMAT:
      ---TITLE START---
      [The Article Title]
      ---TITLE END---
      ---CONTENT START---
      [The Full Article Body - include all relevant details, quotes, and paragraphs]
      ---CONTENT END---`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    
    // Check for explicit failure responses
    if (text.startsWith("FAILURE:")) {
      throw new Error(text.replace("FAILURE:", "").trim());
    }

    // Flexible extraction using markers
    const titleMatch = text.match(/---TITLE START---([\s\S]*?)---TITLE END---/i);
    const contentMatch = text.match(/---CONTENT START---([\s\S]*?)---CONTENT END---/i);

    let title = titleMatch ? titleMatch[1].trim() : "";
    let content = contentMatch ? contentMatch[1].trim() : "";

    // Robust Fallback 1: Try broader markers
    if (!content) {
      const altContentMatch = text.match(/CONTENT:\s*([\s\S]*)/i);
      content = altContentMatch ? altContentMatch[1].trim() : "";
    }

    // Robust Fallback 2: If no markers, try to split by some heuristic
    if (!content && text.length > 150) {
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      // Assume first few lines might be metadata/title
      title = title || lines[0].substring(0, 200);
      content = lines.slice(1).join('\n\n');
    }

    // Fallback 3: If everything failed but we have text, just use the text
    if (!content && text.length > 50) {
      content = text.trim();
    }

    // Clean up any remaining formatting artifacts
    content = content
      .replace(/---TITLE START---|---TITLE END---|---CONTENT START---|---CONTENT END---/gi, '')
      .trim();

    // Final validation - lowered threshold slightly for breaking news/short updates
    if (!content || content.length < 60) {
      // Check if it's a polite refusal
      if (text.toLowerCase().includes("cannot access") || text.toLowerCase().includes("unable to") || text.toLowerCase().includes("paywall")) {
        throw new Error("This source is restricted or requires a subscription.");
      }
      throw new Error("The content extracted was too brief. Please try a different news link.");
    }

    // Extract grounding chunks for compliance and source display
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        uri: chunk.web?.uri || "",
        title: chunk.web?.title || "Verified Source"
      }))
      .filter(s => s.uri !== "");

    return { 
      title: title || "Extracted News", 
      content, 
      sources 
    };
  } catch (error: any) {
    console.error("URL extraction error:", error);
    throw new Error(error.message || "Failed to reach or read the article content.");
  }
}

/**
 * Summarizes articles into a radio-style script.
 */
export async function summarizeArticles(articles: string[], length: BriefLength): Promise<string> {
  const lengthPrompt = {
    [BriefLength.Short]: "Under 150 words. Just the essentials.",
    [BriefLength.Medium]: "Balanced 400 words. Key details and context.",
    [BriefLength.Long]: "Comprehensive 800 words. Deep dive into implications."
  }[length];

  const prompt = `
    You are a professional radio news anchor for a morning commute show. 
    Task: Summarize the following news articles into a SINGLE, cohesive, engaging audio script.
    
    Tone: Friendly, professional, and informative.
    Style: Use radio transitions like "In other news," "Turning our attention to," and "That’s your morning update."
    
    ARTICLES TO SUMMARIZE:
    ${articles.map((a, i) => `--- ARTICLE ${i + 1} ---\n${a}`).join('\n\n')}

    LENGTH REQUIREMENT: ${lengthPrompt}
    
    OUTPUT ONLY THE SCRIPT TEXT. No markdown, no bolding, no headers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "I was unable to summarize these articles.";
  } catch (error) {
    console.error("Summarization error:", error);
    throw new Error("Failed to synthesize the news script.");
  }
}

/**
 * Converts text to speech using the Gemini TTS model.
 */
export async function textToSpeech(text: string, voice: BriefVoice): Promise<Uint8Array> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        // Explicitly set to 'AUDIO' to avoid modality errors.
        responseModalities: ['AUDIO' as any], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("The AI did not return any audio data.");
    }

    return decodeBase64(base64Audio);
  } catch (error: any) {
    console.error("TTS error:", error);
    const msg = error.message || "Failed to generate audio brief.";
    throw new Error(msg);
  }
}

/**
 * Standard Base64 decoding to Uint8Array.
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data returned by Gemini TTS for Web Audio API.
 */
export async function decodeAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
