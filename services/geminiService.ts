import { GoogleGenAI } from "@google/genai";

export const generateBackgroundImage = async (prompt: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Using the specialized image generation model
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001', // Or 'imagen-3.0-generate-001' depending on availability
    prompt: `A high quality, wide angle background scene for a game stage. ${prompt}. Ensure the bottom area is relatively clear for character overlays. Photorealistic, cinematic lighting, 16:9 aspect ratio.`,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '16:9',
    },
  });

  const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!base64ImageBytes) {
    throw new Error("Failed to generate image");
  }

  return `data:image/jpeg;base64,${base64ImageBytes}`;
};
