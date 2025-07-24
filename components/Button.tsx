import React from 'react';

interface BlurryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const BlurryButton: React.FC<BlurryButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative inline-flex items-center justify-center
        p-0.5 rounded-xl
        font-semibold
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary-light dark:focus:ring-offset-bg-primary-dark focus:ring-purple-500
        disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <div
        className="
          absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 
          rounded-xl blur opacity-60 group-hover:opacity-100 
          transition-all duration-1000 group-hover:duration-200
        "
      ></div>
      <span
        className="
          relative w-full h-full px-5 py-2.5 text-sm
          bg-bg-secondary-light dark:bg-bg-secondary-dark 
          text-text-primary-light dark:text-text-primary-dark 
          rounded-lg leading-none flex items-center justify-center gap-2
          transform group-hover:-translate-y-px transition-transform duration-150
        "
      >
        {children}
      </span>
    </button>
  );
};

export default BlurryButton;