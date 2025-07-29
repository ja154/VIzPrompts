

export enum AnalysisState {
  IDLE = 'idle',
  PREVIEW = 'preview',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
}

// Defines the structure for a user account
export interface User {
    username: string;
    email: string;
    fullName: string;
    password?: string; // Optional: not present for Google Sign-In users.
    createdAt: string;
    profilePicture?: string; // Should be a full data URI: "data:image/png;base64,..."
}

// New type for storing a single prompt history item
export interface PromptHistoryItem {
    id: string;
    prompt: string;
    frameAnalyses: any[]; // Using any to avoid circular dependency issues if FrameAnalysis is also here
    jsonPrompt: string;
    thumbnail: string; // Should be a full data URI: "data:image/jpeg;base64,..."
    timestamp: string;
    suggestedNegativePrompts?: string[];
}
