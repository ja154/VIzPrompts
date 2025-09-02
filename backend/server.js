import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { Storage } from '@google-cloud/storage';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import tmp from 'tmp';
import fs from 'fs';

// Load environment variables from .env file
// Make sure to create a .env file in the backend directory with your API_KEY
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// Check for API Key
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY environment variable not set.");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

// --- Google Cloud Storage Setup ---
// Optional: If you want to save files to GCS.
// Make sure your Cloud Run service account has "Storage Object Admin" role.
const gcs = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME; // e.g., 'your-gcs-bucket-name'
let bucket;
if (bucketName) {
  bucket = gcs.bucket(bucketName);
  console.log(`Connected to GCS bucket: ${bucketName}`);
} else {
  console.log('GCS_BUCKET_NAME not set. File uploads will not be saved to GCS.');
}

// --- Multer Setup ---
// Use memory storage to handle the file as a buffer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit
});


// --- Video/Image Processing ---

/**
 * Extracts frames from a video buffer.
 * @param {Buffer} videoBuffer The video file buffer.
 * @param {number} frameCount The number of frames to extract.
 * @returns {Promise<string[]>} A promise that resolves to an array of base64-encoded frame images.
 */
const extractFramesFromVideo = (videoBuffer, frameCount = 10) => {
  return new Promise((resolve, reject) => {
    // Create a temporary file for the video buffer
    const tmpVideoFile = tmp.fileSync({ postfix: '.mp4' });
    fs.writeFileSync(tmpVideoFile.name, videoBuffer);

    // Create a temporary directory for the output frames
    const tmpFrameDir = tmp.dirSync().name;

    let frames = [];

    ffmpeg(tmpVideoFile.name)
      .on('end', () => {
        try {
          let files = fs.readdirSync(tmpFrameDir);

          // Sort files numerically based on the frame number in the filename
          files.sort((a, b) => {
            const numA = parseInt(a.match(/(\d+)/)?.[0] || 0, 10);
            const numB = parseInt(b.match(/(\d+)/)?.[0] || 0, 10);
            return numA - numB;
          });

          for (const file of files) {
            const framePath = `${tmpFrameDir}/${file}`;
            const frameBuffer = fs.readFileSync(framePath);
            frames.push(frameBuffer.toString('base64'));
            fs.unlinkSync(framePath); // Clean up the frame file
          }

          fs.rmdirSync(tmpFrameDir); // Clean up the temporary directory
          tmpVideoFile.removeCallback(); // Clean up the temporary video file

          resolve(frames);
        } catch (err) {
          reject(new Error(`Error processing frames: ${err.message}`));
        }
      })
      .on('error', (err) => {
        console.error('ffmpeg error:', err.message);
        // Cleanup in case of error
        tmpVideoFile.removeCallback();
        if (fs.existsSync(tmpFrameDir)) {
          fs.readdirSync(tmpFrameDir).forEach(file => fs.unlinkSync(`${tmpFrameDir}/${file}`));
          fs.rmdirSync(tmpFrameDir);
        }
        reject(new Error(`ffmpeg failed: ${err.message}`));
      })
      .screenshots({
        count: frameCount,
        folder: tmpFrameDir,
        filename: 'frame-%i.png',
        size: '640x?'
      });
  });
};

/**
 * Converts an image buffer to a base64 string.
 * @param {Buffer} imageBuffer The image file buffer.
 * @returns {string} The base64-encoded image.
 */
const imageToBase64 = (imageBuffer) => {
  return imageBuffer.toString('base64');
};


// --- Gemini API Logic ---
// This section is adapted from the frontend's geminiService.ts

const parseDataUrl = (dataUrl) => {
    const parts = dataUrl.split(',');
    const header = parts[0];
    const data = parts[1];
    const mimeTypeMatch = header?.match(/:(.*?);/);

    if (data && mimeTypeMatch && mimeTypeMatch[1]) {
        return { base64: data, mimeType: mimeTypeMatch[1] };
    }
    throw new Error('Invalid data URL provided for analysis.');
};

const generatePromptFromFrames = async (
    frameData, // This will be an array of base64 strings
    mimetypes, // This will be an array of mimetypes
    masterPrompt
) => {
    if (frameData.length === 0) {
        throw new Error("No frames provided for analysis.");
    }

    const imagePartsForAnalysis = frameData.map((base64, index) => {
      return { inlineData: { mimeType: mimetypes[index], data: base64 } };
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

    After creating the \`scene_analysis\` array, add this key to the root of the JSON object:

    1.  **\`master_prompt\`**: Synthesize all scene \`description\` fields into one single, cohesive, comma-separated paragraph. This master prompt should chronologically narrate the entire video for a text-to-video AI model.

    Your output must be a single JSON object conforming to the schema. Do not include any conversational text or markdown.
    `;

    const sceneSchema = {
        type: Type.OBJECT,
        properties: {
            scene_number: { type: Type.INTEGER },
            description: { type: Type.STRING },
            camera_details: { type: Type.STRING },
            lighting: { type: Type.STRING },
            color_palette: { type: Type.STRING },
            textures_details: { type: Type.STRING },
            atmosphere: { type: Type.STRING },
            sound_design: { type: Type.STRING }
        },
        required: ["scene_number", "description", "camera_details", "lighting", "color_palette", "textures_details", "atmosphere", "sound_design"]
    };

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            master_prompt: { type: Type.STRING },
            scene_analysis: { type: Type.ARRAY, items: sceneSchema }
        },
        required: ["master_prompt", "scene_analysis"]
    };

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `${masterPrompt}\n\nYour task is to perform a multi-step analysis and return a single, structured JSON object adhering to the provided schema. Do not output any conversational text or markdown.`,
    });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: analysisPrompt }, ...imagePartsForAnalysis] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.7,
        }
    });

    const analysisJsonStr = result.response.text();
    const analysisResult = JSON.parse(analysisJsonStr);

    if (!analysisResult.master_prompt || !analysisResult.scene_analysis) {
        throw new Error("The AI model returned an incomplete analysis. The result was missing key fields.");
    }

    return {
        prompt: analysisResult.master_prompt,
        analyses: analysisResult.scene_analysis,
    };
};


// --- API Endpoints ---

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { buffer, originalname, mimetype } = req.file;
  const masterPrompt = req.body.masterPrompt || "You are a visionary AGI director with an unparalleled eye for cinematic detail and creative potential. Your purpose is to analyze media and synthesize hyper-detailed, production-ready prompts for generative AI.";

  console.log(`Received file: ${originalname} (${mimetype})`);

  try {
    // --- 1. Save to GCS (Optional) ---
    if (bucket) {
      const gcsFileName = `${Date.now()}-${originalname}`;
      const file = bucket.file(gcsFileName);
      const stream = file.createWriteStream({
        metadata: { contentType: mimetype },
      });
      stream.on('error', (err) => console.error('GCS upload error:', err));
      stream.on('finish', () => console.log(`Successfully uploaded ${gcsFileName} to GCS.`));
      stream.end(buffer);
    }

    // --- 2. Process Media ---
    let frames = [];
    let mimeTypes = [];

    if (mimetype.startsWith('video/')) {
        console.log('Extracting frames from video...');
        frames = await extractFramesFromVideo(buffer);
        // All extracted frames are png
        mimeTypes = frames.map(() => 'image/png');
        console.log(`Extracted ${frames.length} frames.`);
    } else if (mimetype.startsWith('image/')) {
        console.log('Processing image...');
        frames = [imageToBase64(buffer)];
        mimeTypes = [mimetype];
    } else {
        return res.status(400).json({ error: 'Unsupported file type.' });
    }

    // --- 3. Generate Prompt with Gemini ---
    console.log('Generating prompt with Gemini...');
    const result = await generatePromptFromFrames(frames, mimeTypes, masterPrompt);
    console.log('Successfully generated prompt.');

    // --- 4. Send Response ---
    return res.json(result);

  } catch (error) {
    console.error('Error during file processing:', error);
    res.status(500).json({ error: `An error occurred during processing: ${error.message}` });
  }
});

app.get('/', (req, res) => {
    res.status(200).send('Backend is running. Use the /upload endpoint to post files.');
});

// Endpoint to structure a prompt
app.post('/structure', async (req, res) => {
    const { promptToStructure, masterPrompt } = req.body;
    if (!promptToStructure || !masterPrompt) {
        return res.status(400).json({ error: 'Missing promptToStructure or masterPrompt in request body.' });
    }
    try {
        const structuredResult = await structurePrompt(promptToStructure, masterPrompt);
        res.json(structuredResult);
    } catch (error) {
        console.error('Error during structuring:', error);
        res.status(500).json({ error: `An error occurred during structuring: ${error.message}` });
    }
});

// Endpoint to refine a prompt
app.post('/refine', async (req, res) => {
    const { currentPrompt, userInstruction, negativePrompt, masterPrompt } = req.body;
    if (!currentPrompt || !userInstruction || !masterPrompt) {
        return res.status(400).json({ error: 'Missing required fields in request body.' });
    }
    try {
        const refinedResult = await refinePrompt(currentPrompt, userInstruction, negativePrompt || '', masterPrompt);
        res.json({ refinedPrompt: refinedResult });
    } catch (error) {
        console.error('Error during refinement:', error);
        res.status(500).json({ error: `An error occurred during refinement: ${error.message}` });
    }
});


// --- Gemini Logic for Structuring and Refinement ---

const structurePrompt = async (promptToStructure, masterPrompt) => {
    const structuringPrompt = `
      Based on the following text-to-video prompt, break it down into one or more scenes and convert it into a structured JSON array following a detailed filmmaking framework.
      If the prompt describes a single continuous scene, create an array with just one scene object.
      For each scene object in the array, provide: scene_number, description, camera_details, lighting, color_palette, textures_details, atmosphere, and sound_design.

      TEXT PROMPT:
      "${promptToStructure}"
    `;

    const sceneSchema = {
        type: Type.OBJECT,
        properties: {
            scene_number: { type: Type.INTEGER },
            description: { type: Type.STRING },
            camera_details: { type: Type.STRING },
            lighting: { type: Type.STRING },
            color_palette: { type: Type.STRING },
            textures_details: { type: Type.STRING },
            atmosphere: { type: Type.STRING },
            sound_design: { type: Type.STRING }
        },
        required: ["scene_number", "description", "camera_details", "lighting", "color_palette", "textures_details", "atmosphere", "sound_design"]
    };

    const responseSchema = {
        type: Type.ARRAY,
        items: sceneSchema
    };

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `${masterPrompt}\n\nYour primary task is to convert a descriptive text prompt into a well-organized JSON array of scene objects. The JSON must adhere to the provided schema. Output only the raw JSON.`,
    });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: structuringPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
    });

    const jsonPrompt = result.response.text();
    return JSON.parse(jsonPrompt);
};

const refinePrompt = async (currentPrompt, userInstruction, negativePrompt, masterPrompt) => {
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

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `${masterPrompt}\n\nYour primary task is to rewrite a given text-to-video prompt based on a user's instruction. If a list of elements to exclude is provided, you must ensure the new prompt does not contain them. Your output MUST be only the new, refined prompt. Do not include any conversational text, explanations, or markdown formatting. Just the prompt itself.`,
    });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: content }] }],
        generationConfig: {
          temperature: 0.7,
        }
    });

    return result.response.text();
};


// --- Server Start ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
