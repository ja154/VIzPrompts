
import React from 'react';

interface LoaderProps {
    message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
    return (
        <div role="status" className="flex flex-col items-center justify-center p-8 bg-gray-800/50 rounded-lg">
            <div aria-hidden="true" className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-lg text-gray-300">{message}</p>
        </div>
    );
};

export default Loader;