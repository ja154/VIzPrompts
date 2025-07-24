
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// This is a Vercel-compatible serverless function.
// It acts as a secure proxy to the Google Gemini API.

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

async function structurePrompt(ai: GoogleGenAI, payload: { promptToStructure: string; masterPrompt: string }): Promise<string> {
    const { promptToStructure, masterPrompt } = payload;
    const structuringPrompt = `Based on the following detailed text-to-video prompt, convert it into a structured JSON object. The JSON should logically break down the prompt into its core components. TEXT PROMPT: "${promptToStructure}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: structuringPrompt,
        config: {
            systemInstruction: `${masterPrompt}\n\nYour primary task is to convert a descriptive text prompt into a well-organized JSON object. Output only the raw JSON.`,
            responseMimeType: "application/json",
        }
    });

    const jsonPrompt = response.text;
    if (!jsonPrompt) throw new Error("The AI model did not return a valid structured JSON prompt.");

    let cleanedJsonPrompt = jsonPrompt.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanedJsonPrompt.match(fenceRegex);
    if (match && match[2]) {
        cleanedJsonPrompt = match[2].trim();
    }
    
    try {
        JSON.parse(cleanedJsonPrompt);
    } catch (e) {
        console.error("Failed to parse structured JSON from AI:", cleanedJsonPrompt, e);
        cleanedJsonPrompt = JSON.stringify({ error: "AI returned invalid JSON.", details: cleanedJsonPrompt }, null, 2);
    }
    return cleanedJsonPrompt;
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
        model: 'gemini-2.5-flash',
        contents: { parts: [analysisTextPart, ...imageParts] },
        config: {
            systemInstruction: `${masterPrompt}\n\nYour primary task is to analyze a sequence of images and return a structured JSON array of your findings.`,
            responseMimeType: "application/json", temperature: 0.7,
        }
    });
    let analysisJsonStr = analysisResponse.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    let match = analysisJsonStr.match(fenceRegex);
    if (match && match[2]) analysisJsonStr = match[2].trim();
    const analyses = JSON.parse(analysisJsonStr) as FrameAnalysis[];
    if (!analyses || !Array.isArray(analyses) || analyses.length === 0 || typeof analyses[0] !== 'object' || !analyses[0].subject) {
        throw new Error("The AI model did not return a valid analysis. The content may be too abstract.");
    }

    // Step 2: Synthesize prompt
    const synthesisPrompt = `Based on the following frame-by-frame JSON analysis, synthesize a single, cohesive, hyper-detailed text-to-video prompt. Capture the core essence, visual style, and key details. ANALYSES: ${JSON.stringify(analyses, null, 2)} Output only the synthesized text-to-video prompt as a comma-separated list of descriptive phrases.`;
    const synthesisResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
        model: 'gemini-2.5-flash',
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
