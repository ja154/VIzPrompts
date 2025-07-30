
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SceneAnalysis } from '../types.ts';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface PromptGenerationResult {
  prompt: string;
  analyses: SceneAnalysis[];
  jsonResponse: string;
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
 * @returns A promise that resolves to a stringified JSON object representing the scene analysis.
 */
export const structurePrompt = async (promptToStructure: string, masterPrompt: string): Promise<string> => {
    const structuringPrompt = `
      Based on the following text-to-video prompt, break it down into one or more scenes and convert it into a structured JSON array following a detailed filmmaking framework.
      If the prompt describes a single continuous scene, create an array with just one scene object.
      For each scene object in the array, provide: scene_number, description, camera_details, lighting, color_palette, textures_details, atmosphere, and sound_design.

      Strive for the professional quality shown in this example for a single scene:
      {
        "scene_number": 13,
        "description": "A tense, close-up of a Kenyan engineer’s hands rapidly typing on a holographic display, adjusting real-time telemetry data. The glow of the screen casts eerie blue light on their face, revealing beads of sweat. A voice crackles over the radio: 'Kama hiyo data si sahihi, tutaisha!' (If that data’s wrong, we’re finished!). The holographic interface flickers with 'JengaForge' branding. The sterile, high-tech environment of the engineering booth, filled with monitors and cables. The cool, artificial glow of screens, the tactile feedback of holographic keys.",
        "camera_details": "Arri Alexa, tight close-up on hands and face",
        "lighting": "Cool, artificial blue from holographic display",
        "color_palette": "Dark room with neon-blue highlights",
        "textures_details": "Glowing holograms, sweat on skin, metallic keyboard",
        "atmosphere": "High stakes, urgency, futuristic tension",
        "sound_design": "Rapid typing, radio static, tense breathing"
      }

      TEXT PROMPT:
      "${promptToStructure}"
    `;

    const sceneSchema = {
        type: Type.OBJECT,
        properties: {
            scene_number: { type: Type.INTEGER, description: "The sequential number of the scene." },
            description: { type: Type.STRING, description: "A detailed narrative description of this specific scene, covering the action, setting, and characters." },
            camera_details: { type: Type.STRING, description: "Specifics about the camera work: shot type, angle, movement, and lens effects." },
            lighting: { type: Type.STRING, description: "The lighting style and sources." },
            color_palette: { type: Type.STRING, description: "The dominant colors and overall tonality." },
            textures_details: { type: Type.STRING, description: "Key textures to emphasize." },
            atmosphere: { type: Type.STRING, description: "The overall mood or vibe of the scene." },
            sound_design: { type: Type.STRING, description: "Important sounds or dialogue." }
        },
        required: ["scene_number", "description", "camera_details", "lighting", "color_palette", "textures_details", "atmosphere", "sound_design"]
    };

    const responseSchema = {
        type: Type.ARRAY,
        description: "A detailed, scene-by-scene breakdown of the video prompt.",
        items: sceneSchema
    };

    try {
        const structuringResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: structuringPrompt,
            config: {
                systemInstruction: `${masterPrompt}\n\nYour primary task is to convert a descriptive text prompt into a well-organized JSON array of scene objects. The JSON must adhere to the provided schema. Output only the raw JSON.`,
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
            cleanedJsonPrompt = JSON.stringify([{ error: "AI returned invalid JSON.", details: cleanedJsonPrompt }], null, 2);
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
 * @returns A promise that resolves to an object containing the final prompt and the detailed scene-by-scene analysis.
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
        You are a world-class AI film director and cinematographer. Your task is to analyze a sequence of video frames and generate a single, raw JSON object based on the provided schema.

        **Video-to-Prompt Framework:**

        Analyze the frames and break them down into distinct scenes. For each scene, create a JSON object for the \`scene_analysis\` array with hyper-detailed descriptions for the following keys. Strive for the level of professional, evocative detail shown in these examples:
        
        Example 1:
        {
          "scene_number": 10,
          "description": "A high-speed, low-angle tracking shot of an F1 car roaring down a rain-soaked street in downtown Nairobi, its tires kicking up a dramatic spray of water. The car’s livery—featuring 'vizprompts' and 'JengaForge'—gleams under the neon glow of city lights reflecting off wet asphalt. Pedestrians in colorful umbrellas scramble aside, their expressions a mix of awe and irritation. The sheer kinetic energy of the car contrasts with the chaotic urban backdrop. The slick, reflective road surface, the blurred streaks of headlights, the rippling puddles, the vibrant umbrellas.",
          "camera_details": "Arri Alexa, low-angle tracking shot with stabilized rig",
          "lighting": "Neon city lights, diffused by rain, high contrast",
          "color_palette": "Vibrant umbrellas against dark, wet asphalt, neon reflections",
          "textures_details": "Slick road surface, water spray, blurred lights, glossy car livery",
          "atmosphere": "High energy, urban chaos, cinematic speed",
          "sound_design": "Roaring engine, screeching tires, splashing water, distant shouts"
        }

        Example 2:
        {
          "scene_number": 13,
          "description": "A tense, close-up of a Kenyan engineer’s hands rapidly typing on a holographic display, adjusting real-time telemetry data. The glow of the screen casts eerie blue light on their face, revealing beads of sweat. A voice crackles over the radio: 'Kama hiyo data si sahihi, tutaisha!' (If that data’s wrong, we’re finished!). The holographic interface flickers with 'JengaForge' branding. The sterile, high-tech environment of the engineering booth, filled with monitors and cables. The cool, artificial glow of screens, the tactile feedback of holographic keys.",
          "camera_details": "Arri Alexa, tight close-up on hands and face",
          "lighting": "Cool, artificial blue from holographic display",
          "color_palette": "Dark room with neon-blue highlights",
          "textures_details": "Glowing holograms, sweat on skin, metallic keyboard",
          "atmosphere": "High stakes, urgency, futuristic tension",
          "sound_design": "Rapid typing, radio static, tense breathing"
        }

        After creating the \`scene_analysis\` array, add this key to the root of the JSON object:

        1.  **\`master_prompt\`**: Synthesize all scene \`description\` fields into one single, cohesive, comma-separated paragraph. This master prompt should chronologically narrate the entire video for a text-to-video AI model.

        Your output must be a single JSON object conforming to the schema. Do not include any conversational text or markdown.
        `;
        
        const sceneSchema = {
            type: Type.OBJECT,
            properties: {
                scene_number: { type: Type.INTEGER, description: "The sequential number of the scene." },
                description: { type: Type.STRING, description: "A detailed narrative description of this specific scene, covering the action, setting, and characters." },
                camera_details: { type: Type.STRING, description: "Specifics about the camera work: shot type, angle, movement, and lens effects." },
                lighting: { type: Type.STRING, description: "The lighting style and sources." },
                color_palette: { type: Type.STRING, description: "The dominant colors and overall tonality." },
                textures_details: { type: Type.STRING, description: "Key textures to emphasize." },
                atmosphere: { type: Type.STRING, description: "The overall mood or vibe of the scene." },
                sound_design: { type: Type.STRING, description: "Important sounds or dialogue." }
            },
            required: ["scene_number", "description", "camera_details", "lighting", "color_palette", "textures_details", "atmosphere", "sound_design"]
        };

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                master_prompt: {
                    type: Type.STRING,
                    description: "The final, synthesized, direct text-to-video prompt, created by combining all scene descriptions."
                },
                scene_analysis: {
                    type: Type.ARRAY,
                    description: "A detailed, scene-by-scene breakdown of the video.",
                    items: sceneSchema
                }
            },
            required: ["master_prompt", "scene_analysis"]
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

        if (!result.master_prompt || !result.scene_analysis) {
            throw new Error("The AI model returned an incomplete analysis. The result was missing key fields. Please try a different video.");
        }

        return {
            prompt: result.master_prompt,
            analyses: result.scene_analysis,
            jsonResponse: analysisJsonStr,
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
