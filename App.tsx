


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnalysisState, PromptHistoryItem, User, SceneAnalysis } from './types.ts';
import { extractFramesFromVideo, imageToDataUrl, getVideoMetadata } from './utils/video.ts';
import { generatePromptFromFrames, refinePrompt, structurePrompt } from './services/geminiService.ts';
import { BrainCircuitIcon, LibraryIcon } from './components/icons.tsx';
import BlurryButton from './components/Button.tsx';
import LogoLoader from './components/LogoLoader.tsx';
import UploaderIcon from './components/UploaderIcon.tsx';
import ThemeSwitch from './components/ThemeSwitch.tsx';
import AnimatedAppName from './components/AnimatedAppName.tsx';
import Auth from './components/Auth.tsx';
import { useAuth } from './hooks/useAuth';
import GlowCard from './components/GlowCard.tsx';
import ResultsView from './components/ResultsView.tsx';
import ProfilePage from './components/ProfilePage.tsx';
import HistoryPage from './components/HistoryPage.tsx';
import UserMenu from './components/UserMenu.tsx';
import PatternBackground from './components/PatternBackground.tsx';
import PromptLibrary from './components/PromptLibrary.tsx';
import AnimatedList from './components/AnimatedList.tsx';
import { PromptTemplate } from './data/promptLibrary.ts';


type Theme = 'light' | 'dark';
type JsonView = 'structured' | 'detailed' | 'superStructured';
export type AppView = 'main' | 'profile' | 'history';

const masterPromptPresets = [
    {
        name: 'Cinematic Visionary (Default)',
        prompt: "You are a visionary AGI director with an unparalleled eye for cinematic detail and creative potential. Your purpose is to analyze media and synthesize hyper-detailed, production-ready prompts for generative AI. You deconstruct visual information using the VideoAnalysisToTextPromptFramework, focusing on: Object Detection, Human Movement Analysis, Action Recognition, and overall Scene Context. Your analysis translates these components into a rich tapestry of descriptive text that inspires groundbreaking creative output. Every analysis should be a masterclass in prompt engineering."
    },
    {
        name: 'Documentary Realist',
        prompt: "You are an observant documentary filmmaker AI. Your goal is to analyze media with a focus on realism, authenticity, and narrative truth. You identify key subjects, actions, and environmental details with journalistic precision, producing prompts that generate raw, compelling, and emotionally resonant footage."
    },
    {
        name: 'VFX & Animation Specialist',
        prompt: "You are a specialized AI for VFX and animation. You deconstruct visual media into its core components: character models, textures, lighting rigs, particle effects, and animation curves. Your prompts are technical and precise, designed to generate specific assets or animated sequences with a focus on art style, motion, and visual effects."
    },
    {
        name: 'Commercial & Advertising Pro',
        prompt: "You are a creative director AI for advertising. You analyze media to identify brand-able moments, product placement opportunities, and emotional triggers that drive consumer action. Your prompts are concise, high-impact, and tailored to create polished, persuasive, and on-brand video content for marketing campaigns."
    },
    {
        name: 'Abstract Artist',
        prompt: "You are an experimental artist AI. You perceive media not literally, but as a collage of colors, shapes, textures, and emotions. You translate visual input into abstract, poetic prompts that explore themes and feelings, designed to generate avant-garde and visually stunning non-narrative art pieces."
    },
    {
        name: 'Video Game Cinematics Director',
        prompt: "You are a lead cinematics director for a AAA game studio. Your expertise is in translating game assets and environments into emotionally charged narrative sequences. You analyze visuals for their potential within a real-time rendering engine, focusing on dynamic camera movements (dolly zooms, orbital shots), character animation, environmental storytelling, and interactive lighting. Your prompts are designed to be used with game engines like Unreal Engine or Unity, specifying assets, shaders, and post-processing effects."
    },
    {
        name: 'Music Video Auteur',
        prompt: "You are an iconic music video director AI, known for your bold, symbolic, and rhythm-driven visuals. You deconstruct media into a sequence of stunning, high-energy shots that sync with an imagined beat. You focus on artist performance, surreal visual metaphors, rapid cuts, and a strong, cohesive color grade. Your prompts are designed to generate visually arresting clips that feel like a music video."
    },
    {
        name: 'Architectural Visualization Specialist',
        prompt: "You are an architectural visualization (ArchViz) AI. Your primary function is to analyze scenes for their architectural and spatial qualities. You produce prompts that describe materials (concrete, glass, wood), lighting (natural, artificial, soft, harsh), and atmospheric conditions with photorealistic precision. Your goal is to generate prompts for creating lifelike architectural renders and fly-throughs."
    },
    {
        name: 'Sci-Fi World-Builder',
        prompt: "You are a veteran sci-fi world-builder AI. Your mind contains encyclopedic knowledge of speculative design, futuristic aesthetics, and alien biology. You analyze visuals for their world-building potential, identifying unique technologies, architectural styles, and environmental details. Your prompts are rich with imaginative, specific terminology (e.g., 'bioluminescent flora,' 'brutalist megastructure,' 'plasma conduits') to generate coherent and believable sci-fi or fantasy worlds."
    },
    {
        name: 'Fashion & Beauty Photographer',
        prompt: "You are a high-fashion photographer AI with the discerning eye of a top magazine editor. You analyze visuals for their aesthetic appeal, focusing on model poses, fabric textures, designer styles, and dramatic lighting. Your prompts are geared towards creating elegant, editorial-quality images and video clips, specifying details like 'chiaroscuro lighting,' 'vogueing poses,' 'satin sheen,' and 'haute couture'."
    }
];

const Uploader = ({ onAddToHistory, masterPrompt, selectedHistoryItem, onHistoryItemLoaded }: {
    onAddToHistory: (item: PromptHistoryItem) => void;
    masterPrompt: string;
    selectedHistoryItem: PromptHistoryItem | null;
    onHistoryItemLoaded: () => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoMeta, setVideoMeta] = useState<{ duration: string, resolution: string } | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>(AnalysisState.IDLE);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [structuredJson, setStructuredJson] = useState('');
  const [detailedJson, setDetailedJson] = useState<SceneAnalysis[] | null>(null);
  const [superStructuredJson, setSuperStructuredJson] = useState('');
  const [currentJsonView, setCurrentJsonView] = useState<JsonView>('detailed');
  const [error, setError] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isJsonCopied, setIsJsonCopied] = useState(false);
  const [isUpdatingJson, setIsUpdatingJson] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isDetailing, setIsDetailing] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineTone, setRefineTone] = useState('');
  const [refineStyle, setRefineStyle] = useState('');
  const [refineCamera, setRefineCamera] = useState('');
  const [refineLighting, setRefineLighting] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<number | null>(null);

  const createSuperStructuredPrompt = (prompt: string, analyses: SceneAnalysis[] | null): string => {
      const scenesObject: { [key: string]: Omit<SceneAnalysis, 'scene_number'> } = {};
      if (analyses) {
          analyses.forEach(scene => {
              const sceneKey = `scene_${scene.scene_number}`;
              const { scene_number, ...sceneData } = scene;
              scenesObject[sceneKey] = sceneData;
          });
      }
      
      const superPromptObject = {
          master_prompt: prompt,
          scenes: scenesObject
      };
      
      return JSON.stringify(superPromptObject, null, 2);
  };

  const resetState = useCallback(() => {
    setFile(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl('');
    setVideoMeta(null);
    setAnalysisState(AnalysisState.IDLE);
    setProgress(0);
    setProgressMessage('');
    setGeneratedPrompt('');
    setOriginalPrompt('');
    setStructuredJson('');
    setDetailedJson(null);
    setSuperStructuredJson('');
    setCurrentJsonView('detailed');
    setError('');
    setIsCopied(false);
    setIsJsonCopied(false);
    setIsUpdatingJson(false);
    setIsRefining(false);
    setIsDetailing(false);
    setRefineInstruction('');
    setRefineTone('');
    setRefineStyle('');
    setRefineCamera('');
    setRefineLighting('');
    setNegativePrompt('');
    setExtractedFrames([]);
  }, [videoUrl]);
  
  useEffect(() => {
    if (selectedHistoryItem) {
        // The timeout is a workaround for the state update race condition when view changes.
        setTimeout(() => {
            resetState(); // Clear any existing state first.
            setAnalysisState(AnalysisState.SUCCESS);
            setGeneratedPrompt(selectedHistoryItem.prompt);
            setOriginalPrompt(selectedHistoryItem.prompt);
            setDetailedJson(selectedHistoryItem.sceneAnalyses);
            setStructuredJson(JSON.stringify(selectedHistoryItem.sceneAnalyses[0] || {}, null, 2));
            setSuperStructuredJson(createSuperStructuredPrompt(selectedHistoryItem.prompt, selectedHistoryItem.sceneAnalyses));
            setFile(null); 
            setVideoUrl(selectedHistoryItem.thumbnail);
            setVideoMeta({ duration: "N/A", resolution: "From History" });
            onHistoryItemLoaded();
        }, 0);
    }
  }, [selectedHistoryItem, onHistoryItemLoaded, resetState]);

  const handleFileSelect = async (selectedFile: File) => {
    resetState();
    
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a valid video (MP4, MOV, WEBM) or image (JPG, PNG, GIF) file.');
      return;
    }

    if (selectedFile.size > 200 * 1024 * 1024) {
      setError('File size exceeds 200MB limit.');
      return;
    }

    setFile(selectedFile);
    
    try {
        if (selectedFile.type.startsWith('video/')) {
            setVideoUrl(URL.createObjectURL(selectedFile));
            const meta = await getVideoMetadata(selectedFile);
            const minutes = Math.floor(meta.duration / 60);
            const seconds = Math.floor(meta.duration % 60).toString().padStart(2, '0');
            setVideoMeta({
                duration: `${minutes}:${seconds}`,
                resolution: `${meta.width}x${meta.height}`,
            });
        } else if (selectedFile.type.startsWith('image/')) {
            const dataUrl = await imageToDataUrl(selectedFile);
            const img = new Image();
            img.onload = () => setVideoMeta({ duration: 'N/A', resolution: `${img.width}x${img.height}` });
            img.src = dataUrl;
            setVideoUrl(dataUrl);
        }
        setAnalysisState(AnalysisState.PREVIEW);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read file preview.');
        setAnalysisState(AnalysisState.IDLE);
        setFile(null);
    }
  };

  const handleStartAnalysis = async () => {
    if (!file) return;

    setAnalysisState(AnalysisState.PROCESSING);
    setProgressMessage('Uploading and analyzing media...');
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('masterPrompt', masterPrompt);

      // For local development, you might need to configure a proxy in vite.config.ts
      // or use an absolute URL like 'http://localhost:8080/upload'.
      // In production, this relative URL should work if the frontend and backend are on the same domain.
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      // Simulate progress as we wait for the server
      let progressInterval = setInterval(() => {
        setProgress(oldProgress => Math.min(oldProgress + 5, 80));
      }, 500);

      if (!response.ok) {
        clearInterval(progressInterval);
        const errorData = await response.json().catch(() => ({ error: `Server returned status ${response.status}` }));
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      }

      const result = await response.json();
      clearInterval(progressInterval);

      setProgress(90);
      setProgressMessage('Finalizing results...');

      setGeneratedPrompt(result.prompt);
      setOriginalPrompt(result.prompt);
      setDetailedJson(result.analyses);
      setStructuredJson(JSON.stringify(result.analyses[0] || {}, null, 2));
      setSuperStructuredJson(createSuperStructuredPrompt(result.prompt, result.analyses));

      // The backend now handles processing, so we use the local preview URL for the history thumbnail.
      onAddToHistory({
          id: Date.now().toString(),
          prompt: result.prompt,
          sceneAnalyses: result.analyses,
          jsonPrompt: JSON.stringify(result.analyses[0] || {}, null, 2),
          thumbnail: videoUrl, // Use the existing preview URL
          timestamp: new Date().toISOString(),
      });

      setProgress(100);
      setAnalysisState(AnalysisState.SUCCESS);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during upload.');
      setAnalysisState(AnalysisState.IDLE);
      // Do not clear the file on error, allowing the user to retry.
    }
  };

  const updateAndSetDerivedPrompts = useCallback(async (currentPrompt: string) => {
    if (!currentPrompt) return;
    setIsUpdatingJson(true);
    setError('');
    try {
        const newSceneAnalysesJson = await structurePrompt(currentPrompt, masterPrompt);
        const newSceneAnalyses: SceneAnalysis[] = JSON.parse(newSceneAnalysesJson);

        setDetailedJson(newSceneAnalyses);
        setStructuredJson(JSON.stringify(newSceneAnalyses[0] || {}, null, 2));
        setSuperStructuredJson(createSuperStructuredPrompt(currentPrompt, newSceneAnalyses));

    } catch (err) {
        setError(err instanceof Error ? `Failed to update JSON: ${err.message}` : 'An unknown error occurred.');
    } finally {
        setIsUpdatingJson(false);
    }
  }, [masterPrompt]);

  useEffect(() => {
    // Automatically update JSONs when the prompt is changed by the user.
    if (generatedPrompt && originalPrompt && generatedPrompt !== originalPrompt) {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = window.setTimeout(() => {
            updateAndSetDerivedPrompts(generatedPrompt);
        }, 1000); // 1-second debounce
    }
    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
  }, [generatedPrompt, originalPrompt, updateAndSetDerivedPrompts]);
  
  const handleCopy = (text: string, type: 'prompt' | 'json') => {
    navigator.clipboard.writeText(text);
    if (type === 'prompt') {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      setIsJsonCopied(true);
      setTimeout(() => setIsJsonCopied(false), 2000);
    }
  };
  
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGeneratedPrompt(e.target.value);
  };
  
  const handleRefinePrompt = async (mode: 'refine' | 'detail') => {
    if (!generatedPrompt) return;
    
    if (mode === 'refine') setIsRefining(true);
    if (mode === 'detail') setIsDetailing(true);
    setError('');

    let instruction = '';
    if (mode === 'detail') {
        instruction = 'Add significantly more detail to the prompt. Make it richer, more descriptive, and include more sensory information and intricate visual elements.';
    } else {
        instruction = 'Refine the following prompt. ';
        if (refineTone) instruction += `Give it a ${refineTone} tone. `;
        if (refineStyle) instruction += `Make the style ${refineStyle}. `;
        if (refineCamera) instruction += `Use ${refineCamera} camera work. `;
        if (refineLighting) instruction += `Incorporate ${refineLighting} lighting. `;
        if (refineInstruction) instruction += `Specifically: ${refineInstruction}.`;

        if (instruction.trim() === 'Refine the following prompt.') {
            instruction = 'Slightly rephrase and improve the prompt for clarity and impact.';
        }
    }
    
    try {
        const newPrompt = await refinePrompt(generatedPrompt, instruction, negativePrompt, masterPrompt);
        setGeneratedPrompt(newPrompt);
    } catch (err) {
        setError(err instanceof Error ? `Failed to refine prompt: ${err.message}` : 'An unknown error occurred during refinement.');
    } finally {
        if (mode === 'refine') setIsRefining(false);
        if (mode === 'detail') setIsDetailing(false);
    }
  };

  const handleJsonViewChange = (view: JsonView) => {
    setCurrentJsonView(view);
  }
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.classList.add('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/20');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/20');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/20');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileSelect(e.dataTransfer.files[0]);
          e.dataTransfer.clearData();
      }
  };

  const handleSelectFromLibrary = async (template: PromptTemplate) => {
    setIsLibraryOpen(false);
    setAnalysisState(AnalysisState.PROCESSING);
    setProgressMessage('Loading template...');
    setError('');
    
    try {
      setGeneratedPrompt(template.prompt);
      setOriginalPrompt(template.prompt);
      setDetailedJson(null);
      setFile(null);
      
      const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" class="dark:bg-gray-800 bg-gray-200 text-gray-500 dark:text-gray-400"><rect width="1920" height="1080" fill="currentColor" fill-opacity="0.1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="64" fill="currentColor">Prompt from Library</text></svg>`;
      const placeholderDataUri = `data:image/svg+xml;base64,${btoa(placeholderSvg)}`;
      setVideoUrl(placeholderDataUri);
      setVideoMeta({ duration: "N/A", resolution: "Template" });

      setProgress(50);
      setProgressMessage('Structuring prompt...');

      const newSceneAnalysesJson = await structurePrompt(template.prompt, masterPrompt);
      const newSceneAnalyses: SceneAnalysis[] = JSON.parse(newSceneAnalysesJson);

      setDetailedJson(newSceneAnalyses);
      setStructuredJson(JSON.stringify(newSceneAnalyses[0] || {}, null, 2));
      setSuperStructuredJson(createSuperStructuredPrompt(template.prompt, newSceneAnalyses));
      
      setProgress(100);
      setAnalysisState(AnalysisState.SUCCESS);
    } catch (err) {
      setError(err instanceof Error ? `Failed to load template: ${err.message}` : 'An unknown error occurred.');
      resetState();
    }
  };

  return (
    <>
      <PromptLibrary 
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          onSelectPrompt={handleSelectFromLibrary}
      />

      <div className="flex flex-col items-center">
          <BlurryButton onClick={() => setIsLibraryOpen(true)} className="mb-4">
              <LibraryIcon className="h-5 w-5 mr-2"/>
              Browse Prompt Library
          </BlurryButton>

          {analysisState === AnalysisState.IDLE && (
            <div className="relative flex py-5 items-center w-full max-w-3xl">
              <div className="flex-grow border-t border-border-primary-light dark:border-border-primary-dark"></div>
              <span className="flex-shrink mx-4 text-xs uppercase font-semibold text-text-secondary-light dark:text-text-secondary-dark">Or</span>
              <div className="flex-grow border-t border-border-primary-light dark:border-border-primary-dark"></div>
            </div>
          )}
      </div>

      {analysisState !== AnalysisState.SUCCESS && (
        <GlowCard className="bg-bg-uploader-light dark:bg-bg-uploader-dark rounded-2xl p-8 max-w-3xl mx-auto shadow-lg border border-border-primary-light dark:border-border-primary-dark animate-scale-in animation-delay-200">
            {analysisState === AnalysisState.IDLE && (
              <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className="w-full group border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 cursor-pointer hover:border-gray-500 dark:hover:border-stone-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 ease-in-out transform hover:scale-[1.01]"
              >
                <div className="flex flex-col items-center justify-center space-y-4">
                   <div className="w-20 h-20 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                       <UploaderIcon />
                   </div>
                  <h3 className="text-lg font-medium transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-stone-300">Drag & drop your video or image here</h3>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">or click to browse files</p>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Supports MP4, MOV, WEBM, JPG, PNG (Max 200MB)</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} className="hidden" accept="video/*,image/*" />
              </div>
            )}

            {analysisState === AnalysisState.PREVIEW && file && (
                <div className="animate-fade-in-slide-up" style={{animationDuration: '300ms'}}>
                  <h3 className="text-xl font-bold mb-4 text-center">Ready to Analyze?</h3>
                  <div className="video-preview bg-black rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                     {file?.type.startsWith('video/') ? (
                        <video src={videoUrl} controls className="w-full h-full object-contain"></video>
                    ) : (
                        <img src={videoUrl} alt="Image Preview" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <p className="text-center text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark truncate" title={file.name}>{file.name}</p>
                  <div className="flex flex-col sm:flex-row gap-4 mt-6">
                      <BlurryButton onClick={handleStartAnalysis} className="flex-1">
                        <i className="fas fa-magic mr-2"></i>
                        Start Analysis
                      </BlurryButton>
                      <button
                          onClick={resetState}
                          className="flex-1 group relative inline-flex items-center justify-center p-0.5 rounded-xl font-semibold transition-all duration-200 ease-in-out bg-bg-primary-light dark:bg-bg-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700/80 text-text-primary-light dark:text-text-primary-dark"
                      >
                          <span className="relative w-full h-full px-5 py-2.5 text-sm rounded-lg leading-none flex items-center justify-center gap-2">
                            <i className="fas fa-undo mr-2"></i>
                            Choose Another File
                          </span>
                      </button>
                  </div>
                </div>
            )}
            
            {analysisState === AnalysisState.PROCESSING && (
               <div className="mt-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">{progressMessage || 'Processing media...'}</span>
                    <span className="text-sm font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="bg-purple-600 h-2.5 rounded-full progress-bar" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
            )}
            
            {error && <p className="text-center text-red-500 mt-4">{error}</p>}
        </GlowCard>
      )}

      {analysisState === AnalysisState.SUCCESS && (
          <ResultsView
              file={file}
              videoUrl={videoUrl}
              videoMeta={videoMeta}
              generatedPrompt={generatedPrompt}
              originalPrompt={originalPrompt}
              structuredJson={structuredJson}
              detailedJson={detailedJson}
              superStructuredJson={superStructuredJson}
              currentJsonView={currentJsonView}
              isCopied={isCopied}
              isJsonCopied={isJsonCopied}
              isUpdatingJson={isUpdatingJson}
              isRefining={isRefining}
              isDetailing={isDetailing}
              refineTone={refineTone}
              refineStyle={refineStyle}
              refineCamera={refineCamera}
              refineLighting={refineLighting}
              refineInstruction={refineInstruction}
              negativePrompt={negativePrompt}
              setNegativePrompt={setNegativePrompt}
              handlePromptChange={handlePromptChange}
              handleCopy={handleCopy}
              resetState={resetState}
              handleRefinePrompt={handleRefinePrompt}
              setRefineTone={setRefineTone}
              setRefineStyle={setRefineStyle}
              setRefineCamera={setRefineCamera}
              setRefineLighting={setRefineLighting}
              setRefineInstruction={setRefineInstruction}
              handleJsonViewChange={handleJsonViewChange}
          />
      )}
    </>
  );
};

const MasterPromptSection = ({ masterPrompt, setMasterPrompt, presets }: {
    masterPrompt: string;
    setMasterPrompt: (p: string) => void;
    presets: { name: string; prompt: string }[];
}) => {
    const handlePresetChange = (selectedPreset: { name: string; prompt: string; }) => {
        if (selectedPreset) {
            setMasterPrompt(selectedPreset.prompt);
        }
    };

    const currentPreset = presets.find(p => p.prompt === masterPrompt) || null;

    return (
        <section className="max-w-4xl mx-auto animate-fade-in-slide-up animation-delay-500">
            <h2 className="text-3xl font-bold text-center mb-12">
                <span className="title-glow-subtle bg-gradient-to-r from-gray-700 to-gray-900 dark:from-stone-100 dark:to-stone-300 bg-clip-text text-transparent flex items-center justify-center gap-4">
                    <BrainCircuitIcon className="w-8 h-8" />
                    AI Creative Protocol
                </span>
            </h2>
            <GlowCard className="bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-2xl p-1 shadow-lg border border-border-primary-light dark:border-border-primary-dark">
                <div className="rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-4">Master Prompt</h3>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
                        Select a preset or write your own master prompt. This acts as the foundational context for all AI interactions, setting its core personality and creative direction.
                    </p>

                    <div className="mb-4">
                        <label htmlFor="prompt-preset" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Protocol Preset</label>
                        <AnimatedList
                            items={presets}
                            selectedItem={currentPreset}
                            onItemSelected={handlePresetChange}
                            displayKey="name"
                            placeholder="Custom Protocol"
                        />
                    </div>

                    <textarea
                        value={masterPrompt}
                        onChange={(e) => setMasterPrompt(e.target.value)}
                        className="w-full prompt-textarea p-4 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Define the AI's core creative protocol..."
                        rows={6}
                        style={{ minHeight: '150px' }}
                    />
                </div>
            </GlowCard>
        </section>
    );
};

const Footer = ({ onNavigate }: { onNavigate: (view: AppView) => void }) => (
    <footer className="mt-24">
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        {/* Logo and Name at the top, centered */}
        <div onClick={() => onNavigate('main')} className="flex flex-col items-center cursor-pointer group mb-8">
            <LogoLoader />
            <AnimatedAppName />
        </div>

        {/* Social Icons */}
        <div className="mb-8">
          <ul className="wrapper">
            <li className="icon facebook">
              <a href="https://www.facebook.com/profile.php?id=100089838724125" target="_blank" rel="noopener noreferrer">
                <span className="tooltip">Facebook</span>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0.01-1.93.93-2H17V2.04C16.38 2 15.65 2 14.96 2 12.57 2 11 3.6 11 6.22V9.5H8.5v4H11v7h3v-7z"/></svg>
              </a>
            </li>
            <li className="icon twitter">
              <a href="https://x.com/aicreatorske?t=vIB_Wqjo1QWtb-9x-204zQ&s=08" target="_blank" rel="noopener noreferrer">
                <span className="tooltip">Twitter</span>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </li>
            <li className="icon instagram">
              <a href="https://www.instagram.com/aicreatorske?igsh=MWwybG5rYnZncmFsNQ==" target="_blank" rel="noopener noreferrer">
                <span className="tooltip">Instagram</span>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 011.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122s-.013 3.056-.06 4.122c-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772c-.556.556-1.112.9-1.772 1.153-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06s-3.056-.013-4.122-.06c-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12s.013-3.056.06-4.122c.05-1.065.217-1.79.465-2.428a4.88 4.88 0 011.153-1.772A4.897 4.897 0 015.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zm5-8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>
              </a>
            </li>
             <li className="icon linktree">
              <a href="https://linktr.ee/Jaygraphicz254" target="_blank" rel="noopener noreferrer">
                <span className="tooltip">Linktree</span>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.723 1.95h-1.446L3.332 9.496l.723.723L12 2.275l7.945 7.944.723-.723-7.945-7.546zM12 5.512l-5.617 5.617 5.617 5.617 5.617-5.617-5.617-5.617zm-7.945 2.328L12 15.785l7.945-7.945.723.723L12 17.23 3.332 9.563l.723-.723z"/>
                </svg>
              </a>
            </li>
            <li className="icon whatsapp">
              <a href="https://chat.whatsapp.com/JdOhcFcENmsDpl7nQvJjPd" target="_blank" rel="noopener noreferrer">
                <span className="tooltip">WhatsApp</span>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.52 3.48 1.44 4.93l-1.54 5.62 5.76-1.52c1.4.88 3.03 1.4 4.75 1.4h.01c5.46 0 9.9-4.44 9.9-9.9C21.94 6.45 17.5 2 12.04 2zM9.51 8.24c.2-.35.49-.57.65-.6.2-.04.44-.04.64-.04.22 0 .5.02.72.31.22.29.84 1.01.84 2.4s0 1.63-.12 1.84c-.12.21-.49.52-1.04.52s-.88-.15-1.71-1.08c-.83-.93-1.37-2.06-1.37-2.06s-.11-.15-.11-.27.28-.42.28-.42zm7.42 5.09c-.19-.1-.4-.19-.67-.34s-1.6-.79-1.85-.88c-.25-.09-.43-.15-.61.15-.18.29-.7.88-.86 1.06-.16.18-.32.2-.47.05-.15-.15-.64-.23-1.22-.76-.45-.41-.75-.9-1.04-1.55-.29-.65-.6-1.29-.6-1.29s-.14-.23.09-.46c.23-.23.41-.39.56-.58.15-.19.2-.32.3-.53s.05-.28-.02-.43c-.07-.15-.61-1.47-.84-2-.23-.53-.46-.45-.6-.45s-.36-.01-.52-.01l-.43.01s-.41.06-.63.31c-.22.25-.84.82-.84 2s.84 2.32.96 2.47c.12.15 1.69 2.59 4.1 3.61.59.25 1.05.4 1.41.51.61.19 1.17.16 1.62.1.5-.06 1.59-.65 1.81-1.28.22-.63.22-1.17.15-1.28z"/></svg>
              </a>
            </li>
            <li className="icon reddit">
              <a href="https://www.reddit.com/u/AIcreatorske/s/Bb8Y6bErp1" target="_blank" rel="noopener noreferrer">
                <span className="tooltip">Reddit</span>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                   <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm1.69,14.23a1.4,1.4,0,0,1-3.38,0,1.39,1.39,0,0,1,1.69-2.31,1.39,1.39,0,0,1,1.69,2.31Zm.37-3.47a.79.79,0,0,1-.72.5,1.4,1.4,0,0,1-1.34,0,.79.79,0,0,1-.72-.5,1,1,0,0,1,1-1.15,3.48,3.48,0,0,1,1.75.49,1,1,0,0,1-.49,1.16ZM8.73,12.5a1.14,1.14,0,1,1,1.14-1.14A1.14,1.14,0,0,1,8.73,12.5Zm6.54,0a1.14,1.14,0,1,1,1.14-1.14A1.14,1.14,0,0,1,15.27,12.5Z"/>
                </svg>
              </a>
            </li>
          </ul>
        </div>

        {/* Separator */}
        <div className="w-full max-w-4xl border-t border-border-primary-light dark:border-border-primary-dark"></div>

        {/* Legal and Copyright */}
        <div className="w-full max-w-4xl pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center sm:text-left">
            © {new Date().getFullYear()} VizPrompts. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Privacy Policy</a>
            <a href="#" className="text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
);


const App: React.FC = () => {
    const [theme, setTheme] = useState<Theme>('dark');
    const { currentUser, userHistory, addToHistory, logout } = useAuth();
    const [currentView, setCurrentView] = useState<AppView>('main');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [masterPrompt, setMasterPrompt] = useState<string>(masterPromptPresets[0].prompt);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<PromptHistoryItem | null>(null);

    const handleSelectHistoryItem = (item: PromptHistoryItem) => {
        setSelectedHistoryItem(item);
        setCurrentView('main');
    };

    const handleAuthSuccess = () => {
        setIsAuthModalOpen(false);
        setCurrentView('profile');
    };

    const handleThemeToggle = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };
    
    const handleLogout = () => {
        logout();
        setCurrentView('main');
    }

    const onHistoryItemLoaded = useCallback(() => {
        setSelectedHistoryItem(null);
    }, []);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);
    
    return (
        <>
            <PatternBackground />
            <div className="relative z-10 flex flex-col min-h-screen">
                <Auth 
                    isOpen={isAuthModalOpen} 
                    onClose={() => setIsAuthModalOpen(false)}
                    onAuthSuccess={handleAuthSuccess}
                />

                <div className="absolute top-0 left-0 right-0 z-40 p-6 flex justify-between items-start">
                    <div className="flex-1 flex justify-start">
                        {currentUser ? (
                            <UserMenu 
                                currentUser={currentUser}
                                onNavigate={setCurrentView}
                                onLogout={handleLogout}
                            />
                        ) : (
                            <BlurryButton onClick={() => setIsAuthModalOpen(true)}>
                                Sign In
                            </BlurryButton>
                        )}
                    </div>

                    <div className="flex-1 flex justify-end">
                        <ThemeSwitch theme={theme} onToggleTheme={handleThemeToggle} />
                    </div>
                </div>

                <header className="py-12 md:py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <div onClick={() => setCurrentView('main')} className="inline-flex flex-col items-center cursor-pointer group">
                            <AnimatedAppName />
                        </div>
                        <p className="max-w-3xl mx-auto text-base md:text-lg text-center text-text-primary-light dark:text-text-secondary-dark animate-fade-in-slide-up animation-delay-200">
                            Welcome to VizPrompts! Instantly turn any video or image into detailed AI prompts.
                            <br />
                            Just <strong>upload a file</strong> or <strong>browse the library</strong> to start your creative journey.
                        </p>
                    </div>
                </header>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 flex-grow">
                    {currentView === 'main' && (
                        <div className="space-y-16 md:space-y-24">
                            <MasterPromptSection masterPrompt={masterPrompt} setMasterPrompt={setMasterPrompt} presets={masterPromptPresets} />
                            <Uploader 
                                onAddToHistory={addToHistory} 
                                masterPrompt={masterPrompt} 
                                selectedHistoryItem={selectedHistoryItem}
                                onHistoryItemLoaded={onHistoryItemLoaded}
                            />
                        </div>
                    )}
                    {currentView === 'profile' && <ProfilePage />}
                    {currentView === 'history' && <HistoryPage history={userHistory} onSelectHistoryItem={handleSelectHistoryItem} />}
                </main>
                
                <Footer onNavigate={setCurrentView} />
            </div>
        </>
    );
};

export default App;
