import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Use a local variable to hold the instance.
let ai: GoogleGenAI;

/**
 * Lazily initializes and returns the GoogleGenAI client instance.
 * This ensures the API key is read from the environment at the time of the first API call,
 * which can help in environments where `process.env` is populated after initial module load.
 * @returns The initialized GoogleGenAI instance.
 */
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) {
            // This error is more likely to be thrown if the key is truly missing at runtime.
            throw new Error("API_KEY environment variable not set at the time of API call.");
        }
        ai = new GoogleGenAI({ apiKey: API_KEY });
    }
    return ai;
};


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
        const structuringResponse = await getAiClient().models.generateContent({
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
 * Generates a hyper-detailed text-to-video prompt from a video file by performing a
 * multi-step AI process: 1) Analyze frames, 2) Synthesize a text prompt, 3) Structure the prompt.
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

    try {
        // == STEP 1: Analyze all frames into a structured JSON array ==
        onProgress('Step 1/3: Analyzing frames...');
        
        const imagePartsForAnalysis = frameDataUrls.map(dataUrl => {
            const { base64, mimeType } = parseDataUrl(dataUrl);
            return { inlineData: { mimeType, data: base64 } };
        });

        const analysisTextPart = {
            text: `Analyze the following sequence of video frames. For each frame, provide a detailed JSON analysis.
Return a single JSON object which is an array of analysis objects. Each analysis object must have this structure: { "subject": string, "action": string, "environment": string, "camera": string, "lighting":string, "style": string, "composition": string, "notable_details": string[] }.
Output only the raw JSON. Do not include any conversational text or markdown formatting.`
        };

        const analysisResponse: GenerateContentResponse = await getAiClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [analysisTextPart, ...imagePartsForAnalysis] },
            config: {
                systemInstruction: `${masterPrompt}\n\nYour primary task is to analyze a sequence of images and return a structured JSON array of your findings.`,
                responseMimeType: "application/json",
                temperature: 0.7,
            }
        });
        
        let analysisJsonStr = analysisResponse.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        let match = analysisJsonStr.match(fenceRegex);
        if (match && match[2]) {
            analysisJsonStr = match[2].trim();
        }
    
        const analyses = JSON.parse(analysisJsonStr) as FrameAnalysis[];

        // Stronger validation: ensure it's a non-empty array of objects with the expected structure.
        if (!analyses || !Array.isArray(analyses) || analyses.length === 0 || typeof analyses[0] !== 'object' || !analyses[0].subject) {
            throw new Error("The AI model did not return a valid analysis. The video may be too abstract or short.");
        }

        // == STEP 2: Synthesize a text prompt from the structured analyses ==
        onProgress('Step 2/3: Synthesizing prompt...');
        
        const synthesisPrompt = `
          Based on the following frame-by-frame JSON analysis of a video, synthesize a single, cohesive, hyper-detailed text-to-video prompt. The prompt should capture the core subject and action, the evolution of the scene, the consistent visual style, lighting, and camera work, and all key details.
          
          ANALYSES:
          ${JSON.stringify(analyses, null, 2)}
          
          Output only the synthesized text-to-video prompt, formatted as a comma-separated list of descriptive phrases. Do not include any conversational text or markdown formatting.
        `;
    
        const synthesisResponse = await getAiClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: synthesisPrompt,
            config: {
                systemInstruction: `${masterPrompt}\n\nYour primary task is to create a single text prompt from a series of structured analyses.`,
                temperature: 0.8,
            }
        });
        
        const finalPrompt = synthesisResponse.text;
        if (!finalPrompt) {
            throw new Error("The AI model failed to synthesize a prompt from the analyses.");
        }

        // == STEP 3: Structure the Text Prompt into JSON ==
        onProgress('Step 3/3: Structuring prompt into JSON format...');

        const cleanedJsonPrompt = await structurePrompt(finalPrompt, masterPrompt);

        return {
            prompt: finalPrompt.trim(),
            analyses: analyses,
            jsonPrompt: cleanedJsonPrompt,
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
        const response: GenerateContentResponse = await getAiClient().models.generateContent({
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
