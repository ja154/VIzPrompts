
// All direct `@google/genai` imports and API key handling are removed from the client.

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

// A generic fetch wrapper for our new API proxy.
async function callApiProxy(action: string, payload: any) {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, payload }),
        });

        const result = await response.json();

        if (!response.ok) {
            // The server-side function returns a JSON object with an `error` key.
            throw new Error(result.error || `Request failed with status ${response.status}`);
        }

        return result;

    } catch (error) {
        console.error(`Error calling API proxy for action "${action}":`, error);
        if (error instanceof Error) {
            // Re-throw the specific error from the server or a network error.
            throw new Error(`AI processing failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the server.");
    }
}

/**
 * Converts a descriptive text prompt into a structured JSON object via the backend proxy.
 */
export const structurePrompt = async (promptToStructure: string, masterPrompt: string): Promise<string> => {
    return callApiProxy('structurePrompt', { promptToStructure, masterPrompt });
};

/**
 * Generates a prompt by sending frames to the backend proxy for analysis.
 * The `onProgress` callback is removed as we can no longer get granular progress from the backend
 * with a single API call. The client should show a generic loading state.
 */
export const generatePromptFromFrames = async (
    frameDataUrls: string[],
    masterPrompt: string
): Promise<PromptGenerationResult> => {
    return callApiProxy('generatePromptFromFrames', { frameDataUrls, masterPrompt });
};

/**
 * Refines a prompt by sending the current prompt and instructions to the backend proxy.
 */
export const refinePrompt = async (currentPrompt: string, userInstruction: string, masterPrompt: string): Promise<string> => {
    return callApiProxy('refinePrompt', { currentPrompt, userInstruction, masterPrompt });
};
