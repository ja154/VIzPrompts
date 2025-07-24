Of course. Here is the refactored version of your file with the suggested improvements applied.

The main changes are:

1.  The Gemini model name is now a constant at the top, making it easy to change in one place.
2.  The duplicated logic for cleaning and parsing JSON has been moved into a single `cleanAndParseJson` utility function to keep the code DRY (Don't Repeat Yourself).

This version is more robust, cleaner, and easier to maintain.

````typescript
import { GoogleGenAI } from "@google/genai";

// This is a Vercel-compatible serverless function.
// It acts as a secure proxy to the Google Gemini API.

// --- Constants ---
const GEMINI_MODEL = 'gemini-1.5-flash';

// --- Type Interfaces ---
interface FrameAnalysis {
  subject: string;
  action: string;
  environment: string;
  camera: string;
  lighting: string;
  style: string;
  composition: string;
  notable_details: string[];
}

interface PromptGenerationResult {
  prompt: string;
  analyses: FrameAnalysis[];
  jsonPrompt: string;
}

// --- Utility Functions ---

/**
 * Parses a Data URL into its base64 data and MIME type.
 */
const parseDataUrl = (dataUrl: string) => {
    const parts = dataUrl.split(',');
    if (parts.length < 2) throw new Error('Invalid data URL format.');
    const header = parts[0];
    const data = parts[1];
    const mimeTypeMatch = header?.match(/:(.*?);/);

    if (data && mimeTypeMatch && mimeTypeMatch[1]) {
        return { base64: data, mimeType: mimeTypeMatch[1] };
    }
    throw new Error('Could not parse data URL for analysis.');
};

/**
 * Cleans a string from a potential markdown code fence and parses it as JSON.
 */
function cleanAndParseJson<T>(jsonStr: string): T {
    let cleanedJson = jsonStr.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanedJson.match(fenceRegex);
    if (match && match[2]) {
        cleanedJson = match[2].trim();
    }
    return JSON.parse(cleanedJson) as T;
}


// --- Core AI Functions ---

async function structurePrompt(ai: GoogleGenAI, payload: { promptToStructure: string; masterPrompt: string }): Promise<string> {
    const { promptToStructure, masterPrompt } = payload;
    const structuringPrompt = `Based on the following detailed text-to-video prompt, convert it into a structured JSON object. The JSON should logically break down the prompt into its core components. TEXT PROMPT: "${promptToStructure}"`;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: structuringPrompt,
        config: {
            systemInstruction: `${masterPrompt}\n\nYour primary task is to convert a descriptive text prompt into a well-organized JSON object. Output only the raw JSON.`,
            responseMimeType: "application/json",
        }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("The AI model did not return a valid structured JSON prompt.");

    try {
        // Attempt to parse the cleaned JSON.
        const parsedJson = cleanAndParseJson(jsonText);
        return JSON.stringify(parsedJson, null, 2);
    } catch (e) {
        // If parsing fails, return a structured error message.
        console.error("Failed to parse structured JSON from AI:", jsonText, e);
        return JSON.stringify({ error: "AI returned invalid JSON.", details: jsonText }, null, 2);
    }
}

async function generatePrompt(ai: GoogleGenAI, payload: { frameDataUrls: string[]; masterPrompt: string }): Promise<PromptGenerationResult> {
    const { frameDataUrls, masterPrompt } = payload;
    if (frameDataUrls.length === 0) throw new Error("No frames were provided for analysis.");

    const imageParts = frameDataUrls.map(dataUrl => {
        const { base64, mimeType } = parseDataUrl(dataUrl);
        return { inlineData: { mimeType, data: base64 } };
    });

    // Step 1: Analyze frames
    const analysisTextPart = { text: `Analyze the following sequence of video frames. For each frame, provide a detailed JSON analysis. Return a single JSON object which is an array of analysis objects. Each analysis object must have this structure: { "subject": string, "action": string, "environment": string, "camera": string, "lighting":string, "style": string, "composition": string, "notable_details": string[] }. Output only the raw JSON.` };
    const analysisResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: { parts: [analysisTextPart, ...imageParts] },
        config: {
            systemInstruction: `${masterPrompt}\n\nYour primary task is to analyze a sequence of images and return a structured JSON array of your findings.`,
            responseMimeType: "application/json", temperature: 0.7,
        }
    });
    const analyses = cleanAndParseJson<FrameAnalysis[]>(analysisResponse.text);
    if (!analyses || !Array.isArray(analyses) || analyses.length === 0 || typeof analyses[0] !== 'object' || !analyses[0].subject) {
        throw new Error("The AI model did not return a valid analysis. The content may be too abstract.");
    }

    // Step 2: Synthesize prompt
    const synthesisPrompt = `Based on the following frame-by-frame JSON analysis, synthesize a single, cohesive, hyper-detailed text-to-video prompt. Capture the core essence, visual style, and key details. ANALYSES: ${JSON.stringify(analyses, null, 2)} Output only the synthesized text-to-video prompt as a comma-separated list of descriptive phrases.`;
    const synthesisResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: synthesisPrompt,
        config: { systemInstruction: `${masterPrompt}\n\nYour primary task is to create a single text prompt from a series of structured analyses.`, temperature: 0.8 }
    });
    const finalPrompt = synthesisResponse.text;
    if (!finalPrompt) throw new Error("The AI model failed to synthesize a prompt from the analysis.");

    // Step 3: Structure the prompt
    const cleanedJsonPrompt = await structurePrompt(ai, { promptToStructure: finalPrompt, masterPrompt });

    return { prompt: finalPrompt.trim(), analyses, jsonPrompt: cleanedJsonPrompt };
}


async function refineGeneratedPrompt(ai: GoogleGenAI, payload: { currentPrompt: string; userInstruction: string; masterPrompt: string }): Promise<string> {
    const { currentPrompt, userInstruction, masterPrompt } = payload;
    const content = `Refine the following text-to-video prompt based on my instruction. PROMPT: "${currentPrompt}" INSTRUCTION: "${userInstruction}"`;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: content,
        config: {
            systemInstruction: `${masterPrompt}\n\nYour primary task is to rewrite a given text-to-video prompt based on a user's instruction. Your output MUST be only the new, refined prompt.`,
            temperature: 0.7,
        }
    });
    const newPrompt = response.text;
    if (!newPrompt) throw new Error("The AI model did not return a valid refined prompt.");
    return newPrompt.trim();
}


// --- Vercel Serverless Handler ---

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        return new Response(JSON.stringify({ error: 'API key is not configured on the server.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    try {
        const { action, payload } = await req.json();
        let result;

        switch (action) {
            case 'generatePromptFromFrames':
                result = await generatePrompt(ai, payload);
                break;
            case 'refinePrompt':
                result = await refineGeneratedPrompt(ai, payload);
                break;
            case 'structurePrompt':
                result = await structurePrompt(ai, payload);
                break;
            default:
                throw new Error('Invalid action specified.');
        }

        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error(`Error in Gemini proxy:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
````
