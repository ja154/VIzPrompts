
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// A more streamlined interface for structured frame analysis to improve AI focus.
export interface FrameAnalysis {
  frame_number: number;
  action_and_expression: string;
}


export interface PromptGenerationResult {
  prompt: string;
  analyses: FrameAnalysis[];
  jsonPrompt: string;
  suggestedNegativePrompts: string[];
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
      Based on the following detailed text-to-video prompt, convert it into a structured JSON object using the Universal Prompt Framework.
      
      TEXT PROMPT:
      "${promptToStructure}"
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            subject_and_action: { type: Type.STRING, description: "The core focus: what the image is of and what it is doing." },
            image_type_and_style: { type: Type.STRING, description: "The medium and overall aesthetic (e.g., photograph, oil painting, surrealism)." },
            setting_location_and_background: { type: Type.STRING, description: "The environment that frames the subject." },
            lighting_and_atmosphere: { type: Type.STRING, description: "The quality, color, and direction of light that sets the mood." },
            composition_and_camera_angle: { type: Type.STRING, description: "The arrangement of elements and the viewer's perspective." },
            color_palette_and_tonality: { type: Type.STRING, description: "The specific color scheme of the image." },
            level_of_detail_and_texture: { type: Type.STRING, description: "The desired fidelity and surface quality." },
            desired_emotion_and_mood: { type: Type.STRING, description: "The feeling the image should evoke." }
        }
    };

    try {
        const structuringResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: structuringPrompt,
            config: {
                systemInstruction: `${masterPrompt}\n\nYour primary task is to convert a descriptive text prompt into a well-organized JSON object based on the Universal Prompt Framework. The JSON must adhere to the provided schema. Output only the raw JSON.`,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
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
        You are a Master AI trained on the Universal Prompting Framework for Text-to-Video models. Your purpose is to analyze video frames and produce a 'Maestro' level prompt, embodying the highest standards of cinematography, art direction, and narrative storytelling. You will be given a sequence of video frames. Your task is to deconstruct this visual information and then synthesize it into a hyper-detailed, professional-grade text-to-video prompt.

        Follow this multi-step process:

        **Part 1: Deconstruction & Holistic Analysis**
        Analyze the clip AS A WHOLE to identify its core components. Think like a cinematographer and art director. Your analysis here will form the basis of the final structured prompt.
        - **Subject & Appearance**: Describe the primary subject with extreme detail (age, clothing, emotional state, key features).
        - **Scene & Environment**: Describe the setting with depth (foreground, background, mood, time of day).
        - **Cinematography**: Identify the primary camera work. Use precise terms: shot type (e.g., Medium Shot, Close-Up), angle (e.g., Low-Angle), and movement (e.g., Tracking Shot, Dolly In).
        - **Lighting Style**: Describe the lighting with evocative language (e.g., 'Dramatic low-key lighting', 'Soft golden hour glow', 'Chiaroscuro').
        - **Artistic Style & Medium**: Define the overall aesthetic (e.g., 'Photorealistic, shot on 35mm film', 'Ghibli-style anime', '1940s film noir').
        - **Color Palette**: Describe the dominant color scheme (e.g., 'Vibrant complementary colors of teal and orange', 'Muted, desaturated earth tones').

        **Part 2: Temporal Action Analysis (\`frameAnalyses\`)**
        Now, analyze the sequence frame-by-frame, focusing *only* on the evolution of the action and emotion. For each frame, provide a concise description of:
        - \`frame_number\`: The sequential number of the frame being analyzed.
        - \`action_and_expression\`: What is the subject doing and feeling in this specific frame? Describe the exact motion and facial expression. Be specific about changes from the previous frame.

        **Part 3: Synthesis - The Maestro Prompt (\`finalPrompt\`)**
        This is your most critical output. Synthesize all the information from Parts 1 and 2 into a single, flowing, narrative paragraph. This prompt must:
        - Be written in an active voice.
        - Weave together the subject, action, scene, cinematography, lighting, and style into a cohesive whole.
        - Describe the sequence of actions chronologically and with rich, descriptive verbs and adverbs.
        - Result in a 'decisive moment' micro-story that implies a past and suggests a future.

        **Part 4: Structured Prompt Breakdown (\`structuredPrompt\`)**
        Deconstruct your synthesized \`finalPrompt\` (and your holistic analysis from Part 1) into a structured JSON object using the Universal Prompt Framework. This gives the user modular control. The \`subject_and_action\` field should contain the core narrative from your final prompt.

        **Part 5: Negative Prompts (\`suggestedNegativePrompts\`)**
        Suggest 3-5 keywords to avoid common artifacts, relevant to the scene.

        Your final output MUST be a single, raw JSON object adhering to the provided schema. Do not add any conversational text or markdown.
        `;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                finalPrompt: {
                    type: Type.STRING,
                    description: "The single, synthesized, 'Maestro' level text-to-video prompt, formatted as a rich narrative paragraph that captures the video's motion, style, and story."
                },
                structuredPrompt: {
                    type: Type.OBJECT,
                    description: "A structured JSON object breaking down the synthesized prompt into its core components based on the Universal Prompt Framework.",
                    properties: {
                         subject_and_action: { type: Type.STRING, description: "The core focus: what the image is of and what it is doing." },
                         image_type_and_style: { type: Type.STRING, description: "The medium and overall aesthetic (e.g., photograph, oil painting, surrealism)." },
                         setting_location_and_background: { type: Type.STRING, description: "The environment that frames the subject." },
                         lighting_and_atmosphere: { type: Type.STRING, description: "The quality, color, and direction of light that sets the mood." },
                         composition_and_camera_angle: { type: Type.STRING, description: "The arrangement of elements and the viewer's perspective." },
                         color_palette_and_tonality: { type: Type.STRING, description: "The specific color scheme of the image." },
                         level_of_detail_and_texture: { type: Type.STRING, description: "The desired fidelity and surface quality." },
                         desired_emotion_and_mood: { type: Type.STRING, description: "The feeling the image should evoke." }
                    }
                },
                frameAnalyses: {
                    type: Type.ARRAY,
                    description: "An array of analyses focusing on the change in action and expression for each frame.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            frame_number: { type: Type.INTEGER, description: "The sequential number of the frame being analyzed." },
                            action_and_expression: { type: Type.STRING, description: "A concise description of the subject's specific action and facial expression in this frame." },
                        }
                    }
                },
                suggestedNegativePrompts: {
                    type: Type.ARRAY,
                    description: "A list of suggested keywords to use in a negative prompt to improve output quality.",
                    items: { type: Type.STRING }
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

        if (!result.finalPrompt || !result.frameAnalyses || !result.structuredPrompt || !result.suggestedNegativePrompts) {
            throw new Error("The AI model returned an incomplete analysis. The result was missing key fields. Please try a different video.");
        }

        return {
            prompt: result.finalPrompt,
            analyses: result.frameAnalyses,
            jsonPrompt: JSON.stringify(result.structuredPrompt, null, 2),
            suggestedNegativePrompts: result.suggestedNegativePrompts,
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

export const remixPrompt = async (promptToRemix: string, masterPrompt: string): Promise<string[]> => {
    const remixingPrompt = `
      You are a creative assistant. Your task is to "remix" a given text-to-video prompt.
      This means generating three new, distinct variations of the original prompt.
      Each variation should be creative and explore different styles, subjects, or moods, while retaining the core concept of the original.
      
      ORIGINAL PROMPT:
      "${promptToRemix}"

      Generate three new prompts based on this.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: remixingPrompt,
            config: {
                systemInstruction: `${masterPrompt}\n\nYour task is to generate three creative variations of a prompt. You MUST return a single, raw JSON object that is an array of strings, where each string is a new prompt. Example: ["new prompt 1", "new prompt 2", "new prompt 3"]. Do not include any other text or markdown.`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        const jsonResponse = response.text.trim();
        // The response text is already a parsed JSON object when using responseSchema, but the service returns it as a string. We must parse it.
        const remixedPrompts = JSON.parse(jsonResponse);

        if (!Array.isArray(remixedPrompts) || remixedPrompts.length === 0 || !remixedPrompts.every(p => typeof p === 'string')) {
            throw new Error("AI returned an invalid format for remixed prompts.");
        }

        return remixedPrompts;

    } catch (error) {
        console.error("Error during Gemini API communication for remixing:", error);
        if (error instanceof Error) {
            throw new Error(`AI remixing failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI for remixing.");
    }
};

export const refinePrompt = async (currentPrompt: string, userInstruction: string, negativePrompt: string, masterPrompt: string): Promise<string> => {
    let content = `
Refine the following text-to-video prompt based on my instruction.

PROMPT:
"${currentPrompt}"

INSTRUCTION:
"${userInstruction}"
`;

    if (negativePrompt) {
        content += `
IMPORTANT: The refined prompt MUST NOT include any of the following elements, concepts, or styles:
${negativePrompt}
`;
    }

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: content,
            config: {
                systemInstruction: `${masterPrompt}\n\nYour primary task is to rewrite a given text-to-video prompt based on a user's instruction. If a list of elements to exclude is provided, you must ensure the new prompt does not contain them. Your output MUST be only the new, refined prompt. Do not include any conversational text, explanations, or markdown formatting. Just the prompt itself.`,
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

export const remixVideoStyle = async (
    frameDataUrls: string[],
    targetStyle: string,
    masterPrompt: string
): Promise<string> => {
    const imageParts = frameDataUrls.map(dataUrl => {
        const { base64, mimeType } = parseDataUrl(dataUrl);
        return { inlineData: { mimeType, data: base64 } };
    });

    const remixingPrompt = `You are a world-class expert in video-to-video style transfer prompting. Your task is to analyze the sequence of motion, gestures, and actions from the provided video frames. Then, you will write a new, hyper-detailed text-to-video prompt that describes this exact sequence of movement, but reimagined in a '${targetStyle}' aesthetic.

Crucially, the new prompt must meticulously describe the motion so that a future text-to-video AI could replicate the original video's gestures, body movement, and even lip-sync faithfully.

Your output should focus on:
1.  **Character Transformation**: Describe how the subject(s) would look in the '${targetStyle}' style (e.g., cel-shaded anime character, textured clay figure).
2.  **Environment Transformation**: Describe how the background and setting are changed to fit the '${targetStyle}' aesthetic.
3.  **Motion Description**: Detail the original motion, frame-by-frame, using descriptive language appropriate for the new style. For example, instead of 'the person walks', use 'the cel-shaded hero strides confidently' or 'the claymation figure plods with a slight bounce'.

The final output MUST be only the new, refined prompt as a single block of text. Do not include any conversational text, explanations, or markdown formatting. Just the prompt itself.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: remixingPrompt }, ...imageParts] },
            config: {
                systemInstruction: masterPrompt,
                temperature: 0.8,
            }
        });
        const newPrompt = response.text;
        if (!newPrompt) {
            throw new Error("The AI model did not return a valid remixed prompt.");
        }
        return newPrompt.trim();
    } catch (error) {
        console.error("Error calling Gemini API for video style remix:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to remix video style: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI for video style remix.");
    }
};
