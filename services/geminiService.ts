import { SceneAnalysis } from '../types.ts';

// The backend URL should be configured in an environment variable for production.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''; // Defaults to relative path

/**
 * Sends a prompt to the backend to be converted into a structured JSON object.
 * @param promptToStructure The text prompt to convert.
 * @param masterPrompt The foundational system instruction for the AI's personality.
 * @returns A promise that resolves to a JSON object representing the scene analysis.
 */
export const structurePrompt = async (promptToStructure: string, masterPrompt: string): Promise<SceneAnalysis[]> => {
    const response = await fetch(`${BACKEND_URL}/structure`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ promptToStructure, masterPrompt }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to structure prompt' }));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const result = await response.json();
    return result;
};


/**
 * Sends a prompt to the backend to be refined based on user instructions.
 * @param currentPrompt The prompt to be refined.
 * @param userInstruction The instructions for refinement.
 * @param negativePrompt Elements to exclude from the refined prompt.
 * @param masterPrompt The foundational system instruction for the AI.
 * @returns A promise that resolves to the refined prompt string.
 */
export const refinePrompt = async (currentPrompt: string, userInstruction: string, negativePrompt: string, masterPrompt: string): Promise<string> => {
    const response = await fetch(`${BACKEND_URL}/refine`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            currentPrompt,
            userInstruction,
            negativePrompt,
            masterPrompt,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to refine prompt' }));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const result = await response.json();
    if (!result.refinedPrompt) {
        throw new Error("The AI model did not return a valid refined prompt.");
    }
    return result.refinedPrompt;
};
