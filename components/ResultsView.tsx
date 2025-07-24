import React from 'react';
import { MagicWandIcon } from './icons';
import { FrameAnalysis } from '../services/geminiService';
import BlurryButton from './Button';
import GlowCard from './GlowCard';

type JsonView = 'structured' | 'detailed' | 'superStructured';

interface ResultsViewProps {
    file: File | null;
    videoUrl: string;
    videoMeta: { duration: string; resolution: string } | null;
    generatedPrompt: string;
    originalPrompt: string;
    structuredJson: string;
    detailedJson: FrameAnalysis[] | null;
    superStructuredJson: string;
    currentJsonView: JsonView;
    isCopied: boolean;
    isJsonCopied: boolean;
    isUpdatingJson: boolean;
    isRefining: boolean;
    isDetailing: boolean;
    refineTone: string;
    refineStyle: string;
    refineCamera: string;
    refineLighting: string;
    refineInstruction: string;
    handlePromptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleCopy: (text: string, type: 'prompt' | 'json') => void;
    resetState: () => void;
    handleRefinePrompt: (mode: 'refine' | 'detail') => void;
    setRefineTone: (value: string) => void;
    setRefineStyle: (value: string) => void;
    setRefineCamera: (value: string) => void;
    setRefineLighting: (value: string) => void;
    setRefineInstruction: (value: string) => void;
    handleJsonViewChange: (view: JsonView) => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({
    file, videoUrl, videoMeta, generatedPrompt, originalPrompt,
    structuredJson, detailedJson, superStructuredJson, currentJsonView,
    isCopied, isJsonCopied, isUpdatingJson, isRefining, isDetailing,
    refineTone, refineStyle, refineCamera, refineLighting, refineInstruction,
    handlePromptChange, handleCopy, resetState, handleRefinePrompt,
    setRefineTone, setRefineStyle, setRefineCamera, setRefineLighting, setRefineInstruction,
    handleJsonViewChange,
}) => {
    return (
        <section className="max-w-6xl mx-auto mt-16 animate-fade-in-slide-up animation-delay-300">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <GlowCard className="bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-2xl p-1 shadow-lg border border-border-primary-light dark:border-border-primary-dark lg:col-span-2">
                <div className="rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center"><i className="fas fa-video mr-2 text-gray-700 dark:text-stone-300"></i>Media Analysis</h2>
                  <div className="video-preview bg-black rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                    {file?.type.startsWith('video/') ? (
                        <video src={videoUrl} controls className="w-full h-full object-contain"></video>
                    ) : (
                        <img src={videoUrl} alt="Image Preview" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-bg-uploader-light dark:bg-bg-uploader-dark p-3 rounded-lg">
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Duration</p>
                      <p className="font-medium">{videoMeta?.duration}</p>
                    </div>
                    <div className="bg-bg-uploader-light dark:bg-bg-uploader-dark p-3 rounded-lg">
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Resolution</p>
                      <p className="font-medium">{videoMeta?.resolution}</p>
                    </div>
                  </div>
                </div>
              </GlowCard>
              
              <GlowCard className="lg:col-span-3 bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-2xl p-1 shadow-lg border border-border-primary-light dark:border-border-primary-dark">
                <div className="rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center"><i className="fas fa-magic mr-2 text-gray-700 dark:text-stone-300"></i>Text Prompt</h2>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => handleCopy(generatedPrompt, 'prompt')} className="p-2 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 transform active:scale-90 tooltip">
                        {isCopied ? <i className="fas fa-check text-green-500"></i> : <i className="far fa-copy"></i>}
                        <span className="tooltip-text">Copy prompt</span>
                      </button>
                      <button onClick={resetState} className="p-2 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 transform active:scale-90 tooltip">
                        <i className="fas fa-plus"></i>
                        <span className="tooltip-text">Choose Another File</span>
                      </button>
                    </div>
                  </div>
                  <textarea 
                    value={generatedPrompt}
                    onChange={handlePromptChange}
                    className="w-full prompt-textarea p-4 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Your AI-generated text prompt will appear here..."></textarea>
                </div>
              </GlowCard>
              
              <GlowCard className="lg:col-span-5 bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-2xl p-1 shadow-lg border border-border-primary-light dark:border-border-primary-dark">
                <div className="rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center"><MagicWandIcon className="w-6 h-6 mr-2 text-gray-700 dark:text-stone-300" />Refine Prompt</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="refine-tone" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Tone</label>
                      <select id="refine-tone" value={refineTone} onChange={(e) => setRefineTone(e.target.value)} className="w-full p-2 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200 hover:border-purple-400 dark:hover:border-purple-500">
                        <option value="">Default</option>
                        <option value="cinematic">Cinematic</option>
                        <option value="whimsical">Whimsical</option>
                        <option value="gritty">Gritty</option>
                        <option value="dreamy">Dreamy</option>
                        <option value="documentary">Documentary</option>
                      </select>
                    </div>
                     <div>
                      <label htmlFor="refine-style" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Style</label>
                      <select id="refine-style" value={refineStyle} onChange={(e) => setRefineStyle(e.target.value)} className="w-full p-2 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200 hover:border-purple-400 dark:hover:border-purple-500">
                        <option value="">Default</option>
                        <option value="photorealistic">Photorealistic</option>
                        <option value="anime">Anime</option>
                        <option value="vintage film">Vintage Film</option>
                        <option value="abstract">Abstract</option>
                        <option value="3d render">3D Render</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="refine-camera" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Camera</label>
                      <select id="refine-camera" value={refineCamera} onChange={(e) => setRefineCamera(e.target.value)} className="w-full p-2 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200 hover:border-purple-400 dark:hover:border-purple-500">
                        <option value="">Default</option>
                        <option value="close-up shot">Close-up Shot</option>
                        <option value="medium shot">Medium Shot</option>
                        <option value="wide shot">Wide Shot</option>
                        <option value="drone shot">Drone Shot</option>
                        <option value="first-person view">First-person View</option>
                        <option value="handheld shaky cam">Handheld Shaky Cam</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="refine-lighting" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Lighting</label>
                      <select id="refine-lighting" value={refineLighting} onChange={(e) => setRefineLighting(e.target.value)} className="w-full p-2 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200 hover:border-purple-400 dark:hover:border-purple-500">
                        <option value="">Default</option>
                        <option value="soft cinematic light">Soft Cinematic</option>
                        <option value="dramatic high-contrast">Dramatic High-Contrast</option>
                        <option value="neon glow">Neon Glow</option>
                        <option value="golden hour sunset">Golden Hour</option>
                        <option value="moonlight">Moonlight</option>
                        <option value="natural daylight">Natural Daylight</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="refine-instruction" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Custom Instruction</label>
                    <textarea id="refine-instruction" value={refineInstruction} onChange={(e) => setRefineInstruction(e.target.value)} placeholder="e.g., make it shorter, add a dragon" rows={2} className="w-full p-2 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200 hover:border-purple-400 dark:hover:border-purple-500"></textarea>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                      <BlurryButton onClick={() => handleRefinePrompt('refine')} disabled={isRefining || isDetailing}>
                        {isRefining ? (<><i className="fas fa-spinner fa-spin"></i><span>Refining...</span></>) : "Refine"}
                      </BlurryButton>
                       <BlurryButton onClick={() => handleRefinePrompt('detail')} disabled={isRefining || isDetailing}>
                        {isDetailing ? (<><i className="fas fa-spinner fa-spin"></i><span>Detailing...</span></>) : "Add More Detail"}
                      </BlurryButton>
                  </div>
                </div>
              </GlowCard>
    
              <GlowCard className="lg:col-span-5 bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-2xl p-1 shadow-lg border border-border-primary-light dark:border-border-primary-dark">
                <div className="rounded-xl p-6">
                   <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold flex items-center">
                        <i className="fas fa-code mr-2 text-gray-700 dark:text-stone-300"></i>
                        JSON Prompt
                        {isUpdatingJson && <i className="fas fa-spinner fa-spin ml-3 text-gray-700 dark:text-stone-300"></i>}
                      </h2>
                       <div className="flex space-x-2">
                           <button onClick={() => {
                               let jsonToCopy = '';
                               if (currentJsonView === 'structured') {
                                   jsonToCopy = structuredJson;
                               } else if (currentJsonView === 'detailed') {
                                   jsonToCopy = detailedJson ? JSON.stringify(detailedJson, null, 2) : '';
                               } else {
                                   jsonToCopy = superStructuredJson;
                               }
                               handleCopy(jsonToCopy, 'json');
                           }} className="p-2 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 transform active:scale-90 tooltip">
                               {isJsonCopied ? <i className="fas fa-check text-green-500"></i> : <i className="far fa-copy"></i>}
                               <span className="tooltip-text">Copy JSON</span>
                           </button>
                       </div>
                   </div>
    
                    <div className="mb-4 flex flex-wrap gap-2">
                        <button onClick={() => handleJsonViewChange('structured')} className={`px-3 py-1 rounded-lg font-medium transition-all duration-200 ${currentJsonView === 'structured' ? 'bg-purple-600 text-white' : 'bg-bg-uploader-light dark:bg-bg-uploader-dark hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Structured</button>
                        <button 
                          onClick={() => handleJsonViewChange('detailed')} 
                          className={`px-3 py-1 rounded-lg font-medium transition-all duration-200 ${currentJsonView === 'detailed' ? 'bg-purple-600 text-white' : 'bg-bg-uploader-light dark:bg-bg-uploader-dark hover:bg-gray-100 dark:hover:bg-gray-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          disabled={generatedPrompt !== originalPrompt}
                        >Detailed</button>
                        <button 
                          onClick={() => handleJsonViewChange('superStructured')} 
                          className={`px-3 py-1 rounded-lg font-medium transition-all duration-200 ${currentJsonView === 'superStructured' ? 'bg-purple-600 text-white' : 'bg-bg-uploader-light dark:bg-bg-uploader-dark hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >Super Structured</button>
                    </div>
                    {generatedPrompt !== originalPrompt && (
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark -mt-2 mb-4">
                        <i className="fas fa-info-circle mr-1"></i>
                        'Detailed' view is tied to the original media and is disabled when the prompt is edited.
                      </p>
                    )}
                    <pre className="w-full p-4 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark overflow-auto" style={{minHeight: '200px', maxHeight: '400px'}}>
                      <code>
                        {currentJsonView === 'structured' 
                            ? structuredJson 
                            : currentJsonView === 'detailed'
                                ? (detailedJson ? JSON.stringify(detailedJson, null, 2) : "Detailed analysis not available.")
                                : (superStructuredJson || "Super Structured analysis not available.")
                        }
                      </code>
                    </pre>
                </div>
              </GlowCard>
            </div>
        </section>
    );
};

export default ResultsView;