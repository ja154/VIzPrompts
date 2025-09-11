import React from 'react';

interface PromptLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPrompt: (prompt: any) => void;
}

const PromptLibrary: React.FC<PromptLibraryProps> = ({ isOpen, onClose, onSelectPrompt }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-lg w-full">
                <h2 className="text-2xl font-bold mb-4">Prompt Library</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    This feature is currently under construction. Please check back later!
                </p>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default PromptLibrary;
