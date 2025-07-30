

import React from 'react';
import { PromptHistoryItem } from '../types';
import GlowCard from './GlowCard';
import { HistoryIcon } from './icons';

interface HistoryPageProps {
    history: PromptHistoryItem[];
    onSelectHistoryItem: (item: PromptHistoryItem) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ history, onSelectHistoryItem }) => (
    <section className="max-w-6xl mx-auto animate-fade-in-slide-up">
        <h2 className="text-3xl font-bold text-center mb-12"><span className="title-glow-subtle bg-gradient-to-r from-gray-700 to-gray-900 dark:from-stone-100 dark:to-stone-300 bg-clip-text text-transparent">Prompt History</span></h2>
        {history.length === 0 ? (
            <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                    <HistoryIcon className="w-12 h-12 text-gray-700 dark:text-stone-300" />
                </div>
                <h3 className="text-xl font-bold">No History Yet</h3>
                <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">
                    Your generated prompts will appear here after you analyze a video or image.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map(item => (
                    <GlowCard key={item.id} className="group bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-2xl p-1 shadow-lg border border-border-primary-light dark:border-border-primary-dark">
                        <button
                          onClick={() => onSelectHistoryItem(item)}
                          className="rounded-xl p-4 flex flex-col h-full w-full text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-bg-secondary-dark"
                        >
                           <div className="overflow-hidden rounded-lg mb-4">
                                <img src={item.thumbnail} alt="Media thumbnail" className="w-full h-40 object-cover bg-black transition-transform duration-300 ease-in-out group-hover:scale-105" />
                           </div>
                            <p className="text-sm text-text-primary-light dark:text-text-primary-dark flex-grow overflow-hidden text-ellipsis h-20">
                                {item.prompt}
                            </p>
                            <p className="text-xs text-text-secondary-light/70 dark:text-text-secondary-dark/70 mt-2 pt-2 border-t border-border-primary-light dark:border-border-primary-dark">
                                {new Date(item.timestamp).toLocaleString()}
                            </p>
                        </button>
                    </GlowCard>
                ))}
            </div>
        )}
    </section>
);

export default HistoryPage;
