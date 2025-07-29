
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// New interface for structured frame analysis
export interface FrameAnalysis {
  subject: string;
  action: string;
  environment: string;
  camera: string;
  lighting: string;
  style: string;
  composition: string;
  notable_details: string[];
}

export interface PromptGenerationResult {
  prompt: string;
  analyses: FrameAnalysis[];
  jsonPrompt: string;
}

// Helper to parse a Data URL into its components for the API
const parseDataUrl = (dataUrl: string) => {
    const parts = dataUrl.split(',');
    const header = parts[0];
    const data = parts[1];
    const mimeTypeMatch = header?.match(/:(.*?);/);

    if (data && mimeTypeMatch && mimeTypeMatch[1]) {
        return { base64: data, mimeType: mimeTypeMatch[1] };
    }
    throw new Error('Invalid data URL provided for analysis.');
};


/**
 * Converts a descriptive text prompt into a structured JSON object.
 * @param promptToStructure The text prompt to convert.
 * @param masterPrompt The foundational system instruction for the AI's personality.
 * @returns A promise that resolves to a stringified JSON object.
 */
export const structurePrompt = async (promptToStructure: string, masterPrompt: string): Promise<string> => {
    const structuringPrompt = `
      Based on the following detailed text-to-video prompt, convert it into a structured JSON object. 
      The JSON should logically break down the prompt into its core components.
      
      TEXT PROMPT:
      "${promptToStructure}"
    `;

    try {
        const structuringResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: structuringPrompt,
            config: {
                systemInstruction: `${masterPrompt}\n\nYour primary task is to convert a descriptive text prompt into a well-organized JSON object. The JSON should have keys like "subject", "action", "setting", "style", "composition", "lighting", "camera_work", and "key_details". The values should be extracted and summarized from the text prompt. Output only the raw JSON.`,
                responseMimeType: "application/json",
            }
        });

        const jsonPrompt = structuringResponse.text;
        if (!jsonPrompt) {
            throw new Error("The AI model did not return a valid structured JSON prompt.");
        }

        let cleanedJsonPrompt = jsonPrompt.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = cleanedJsonPrompt.match(fenceRegex);
        if (match && match[2]) {
            cleanedJsonPrompt = match[2].trim();
        }
        
        try {
            JSON.parse(cleanedJsonPrompt);
        } catch (e) {
            console.error("Failed to parse the structured JSON prompt from AI:", cleanedJsonPrompt, e);
            cleanedJsonPrompt = JSON.stringify({ error: "AI returned invalid JSON.", details: cleanedJsonPrompt }, null, 2);
        }
        return cleanedJsonPrompt;

    } catch (error) {
        console.error("Error during Gemini API communication for structuring:", error);
        if (error instanceof Error) {
            throw new Error(`AI structuring failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI for structuring.");
    }
};


/**
 * Generates a hyper-detailed text-to-video prompt from media frames using a single,
 * efficient, multi-task API call to Gemini.
 * @param frameDataUrls An array of data URLs for the video frames or images.
 * @param onProgress A callback to update the UI with processing messages.
 * @param masterPrompt The foundational system instruction for the AI's personality.
 * @returns A promise that resolves to an object containing the final prompt, the detailed frame-by-frame analysis, and a structured JSON prompt.
 */
export const generatePromptFromFrames = async (
    frameDataUrls: string[],
    onProgress: (message: string) => void,
    masterPrompt: string
): Promise<PromptGenerationResult> => {
    if (frameDataUrls.length === 0) {
        throw new Error("No frames provided for analysis.");
    }

    onProgress('Analyzing media with Gemini...');

    try {
        const imagePartsForAnalysis = frameDataUrls.map(dataUrl => {
            const { base64, mimeType } = parseDataUrl(dataUrl);
            return { inlineData: { mimeType, data: base64 } };
        });

        const analysisPrompt = `
        Analyze the following sequence of video frames. Perform a comprehensive analysis by completing three tasks in a single response:
        
        1.  **Frame-by-Frame Analysis**: For each frame, provide a detailed JSON analysis covering subject, action, environment, camera work, lighting, style, composition, and any notable details.
        2.  **Synthesize Text Prompt**: Based on the *entire sequence*, synthesize a single, cohesive, hyper-detailed text-to-video prompt. This prompt should be a comma-separated list of descriptive phrases that captures the essence of the video.
        3.  **Structure Text Prompt**: Convert the synthesized text prompt into a structured JSON object, breaking it down into its core components.

        Return a single, top-level JSON object that adheres to the provided schema.
        `;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                finalPrompt: {
                    type: Type.STRING,
                    description: "The single, synthesized, hyper-detailed text-to-video prompt, formatted as a comma-separated list of descriptive phrases."
                },
                structuredPrompt: {
                    type: Type.OBJECT,
                    description: "A structured JSON object breaking down the synthesized prompt into its core components.",
                    properties: {
                         subject: { type: Type.STRING, description: "The main subject of the video." },
                         action: { type: Type.STRING, description: "The primary action or event taking place." },
                         setting: { type: Type.STRING, description: "The environment or setting." },
                         style: { type: Type.STRING, description: "The visual style (e.g., cinematic, anime, photorealistic)." },
                         composition: { type: Type.STRING, description: "Description of the shot composition." },
                         lighting: { type: Type.STRING, description: "Description of the lighting." },
                         camera_work: { type: Type.STRING, description: "Description of camera movements and angles." },
                         key_details: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of other key details." }
                    }
                },
                frameAnalyses: {
                    type: Type.ARRAY,
                    description: "An array of detailed analyses, one for each frame provided.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            subject: { type: Type.STRING },
                            action: { type: Type.STRING },
                            environment: { type: Type.STRING },
                            camera: { type: Type.STRING },
                            lighting: { type: Type.STRING },
                            style: { type: Type.STRING },
                            composition: { type: Type.STRING },
                            notable_details: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            }
        };

        const analysisResponse: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: analysisPrompt }, ...imagePartsForAnalysis] },
            config: {
                systemInstruction: `${masterPrompt}\n\nYour task is to perform a multi-step analysis and return a single, structured JSON object adhering to the provided schema. Do not output any conversational text or markdown.`,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
            }
        });
        
        let analysisJsonStr = analysisResponse.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        let match = analysisJsonStr.match(fenceRegex);
        if (match && match[2]) {
            analysisJsonStr = match[2].trim();
        }
    
        const result = JSON.parse(analysisJsonStr);

        if (!result.finalPrompt || !result.frameAnalyses || !result.structuredPrompt) {
            throw new Error("The AI model returned an incomplete analysis. The result was missing key fields. Please try a different video.");
        }

        return {
            prompt: result.finalPrompt,
            analyses: result.frameAnalyses,
            jsonPrompt: JSON.stringify(result.structuredPrompt, null, 2),
        };

    } catch (error) {
        console.error("Error during Gemini API communication:", error);
        if (error instanceof Error) {
            if (error.name === 'SyntaxError') {
                throw new Error(`AI processing failed: The model returned an invalid JSON structure. Please try again.`);
            }
            throw new Error(`AI processing failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI.");
    }
};


export const refinePrompt = async (currentPrompt: string, userInstruction: string, masterPrompt: string): Promise<string> => {
    const content = `
Refine the following text-to-video prompt based on my instruction.

PROMPT:
"${currentPrompt}"

INSTRUCTION:
"${userInstruction}"
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: content,
            config: {
                systemInstruction: `${masterPrompt}\n\nYour primary task is to rewrite a given text-to-video prompt based on a user's instruction. Your output MUST be only the new, refined prompt. Do not include any conversational text, explanations, or markdown formatting. Just the prompt itself.`,
                temperature: 0.7,
            }
        });

        const newPrompt = response.text;
        if (!newPrompt) {
            throw new Error("The AI model did not return a valid refined prompt.");
        }
        return newPrompt.trim();
    } catch (error) {
        console.error("Error calling Gemini API for refinement:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to refine prompt from AI: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI for refinement.");
    }
};
