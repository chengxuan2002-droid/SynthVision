import { GoogleGenAI, Type } from "@google/genai";
import { ModelConfig, ModelType } from "../types";

// --- Gemini Implementation ---

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Google GenAI API Key not found in environment.");
  return new GoogleGenAI({ apiKey });
};

/**
 * Robustly extracts JSON from a string that might contain markdown code blocks.
 */
const extractJson = (text: string) => {
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return jsonMatch ? jsonMatch[0] : text;
};

export const generateDiversePrompts = async (
  basePrompt: string, 
  count: number,
  referenceImagesCount: number
): Promise<{ prompts: string[], aspectRatio: string }> => {
  try {
    const ai = getGeminiClient();
    
    // Use Flash for prompt expansion
    const model = "gemini-3-flash-preview"; 
    
    const systemInstruction = `You are a professional synthetic data engineer specializing in Computer Vision training sets. 
    Your task is to generate ${count} diverse prompt variations based on the user's requirement.

    CRITICAL CONSTRAINTS:
    1. **Language & Translation**: 
       - If the user provides input in Chinese, you MUST accurately translate the "Core Subject" and "Mandatory Features" into high-quality, descriptive English.
       - ALL output prompts in the final array MUST be in English. NEVER return Chinese text in the prompts.

    2. **Consistency (Immutable Core)**:
       - Identify the "Core Subject" (e.g., "damaged pantograph head with broken strip").
       - This core subject and its specific physical characteristics MUST remain IDENTICAL across all ${count} generated prompts. 
       - Do NOT change the subject's properties, pose, or structural features unless the user specifically asks to vary them.

    3. **Domain Randomization (The ONLY allowed variables)**:
       - ONLY vary the environment, lighting, weather, and camera-related artifacts.
       - Environment: e.g., railway bridge, railway tunnel, high-speed rail line, maintenance depot, station.
       - Lighting: e.g., harsh midday sun, dim twilight, fluorescent maintenance lights, cinematic backlighting, sunrise.
       - Weather: e.g., heavy rain, drizzle, foggy, clear sky, snowing, overcast, dusty.
       - Camera Artifacts: e.g., clean lens, motion blur, lens smudges, mud splatters, water droplets, surveillance grain.

    4. **Image Ratio**:
       - Analyze the user input for ratio keywords (e.g., "16:9", "horizontal", "vertical", "9:16", "3:4", "landscape").
       - Return the best matching supported ratio: ["1:1", "3:4", "4:3", "9:16", "16:9"].
       - If no ratio is mentioned, strictly default to "16:9".

    5. **Reference Mapping**:
       - Keep references like "Ref 1" or "Ref 2" if the user used them to map specific images to subjects.

    FORMAT:
    Return ONLY a JSON object. Each prompt follows: "[English Core Subject], [Randomized Domain Environment/Lighting/Weather/Artifacts]".

    Output JSON:
    {
      "prompts": ["string", "string", ...],
      "aspectRatio": "1:1" | "3:4" | "4:3" | "9:16" | "16:9"
    }`;

    const response = await ai.models.generateContent({
      model,
      contents: `Input: "${basePrompt}". Generate ${count} variations in JSON format.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            aspectRatio: {
              type: Type.STRING,
              enum: ["1:1", "3:4", "4:3", "9:16", "16:9"]
            }
          },
          required: ["prompts", "aspectRatio"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const jsonStr = extractJson(text);
    const result = JSON.parse(jsonStr) as { prompts: string[], aspectRatio: string };
    
    // Basic validation to ensure we got what we asked for
    if (!result.prompts || !Array.isArray(result.prompts)) {
       throw new Error("Invalid prompt array in response");
    }

    return result;
  } catch (error) {
    console.error("Error expanding prompts:", error);
    // If it fails, we return a fallback but log it properly in App.tsx
    throw error;
  }
};

export const generateImageWithGemini = async (
  prompt: string,
  referenceImagesBase64: string[],
  aspectRatio: string,
  onImageFound: (base64: string) => void
): Promise<void> => {
  const ai = getGeminiClient();
  const model = "gemini-3-pro-image-preview"; 

  const parts: any[] = [];
  
  // Add reference images
  referenceImagesBase64.forEach(base64 => {
    const cleanBase64 = base64.split(',')[1] || base64;
    parts.push({
      inlineData: {
        mimeType: 'image/png', 
        data: cleanBase64
      }
    });
  });

  // Add the text prompt
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        imageConfig: {
            aspectRatio: aspectRatio as any, 
            imageSize: "1K" 
        }
      }
    });

    // Extract image
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          const fullBase64 = `data:${mime};base64,${part.inlineData.data}`;
          onImageFound(fullBase64);
          return;
        }
      }
    }
    throw new Error("No image data found in response");
  } catch (err: any) {
    console.error("Gemini Image Gen Error:", err);
    throw err;
  }
};

export const generateImageCustom = async (
  config: ModelConfig,
  prompt: string,
  aspectRatio: string,
  onImageFound: (urlOrBase64: string) => void
) => {
  if (!config.endpoint || !config.apiKey) {
    throw new Error("Missing endpoint or API key for custom model");
  }

  let size = "1024x1024";
  if (aspectRatio === "16:9") size = "1792x1024";
  if (aspectRatio === "9:16") size = "1024x1792";

  const response = await fetch(`${config.endpoint}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.modelId,
      prompt: prompt,
      n: 1,
      size: size, 
      response_format: "b64_json"
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Custom API Error: ${err}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  
  if (b64) {
    onImageFound(`data:image/png;base64,${b64}`);
  } else {
    const url = data.data?.[0]?.url;
    if (url) onImageFound(url);
    else throw new Error("No image found in custom API response");
  }
};