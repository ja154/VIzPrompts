import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import BlurryButton from './Button';

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

const Auth: React.FC<AuthProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');

  const { login, signup, loginWithGoogle } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const resetFormState = () => {
    setError('');
    setSuccessMessage('');
    setIsLoading(false);
    setEmail('');
    setPassword('');
    setUsername('');
    setFullName('');
    setActiveTab('login'); // Default to login tab
  };

  useEffect(() => {
    if (isOpen) {
      resetFormState();
    }
  }, [isOpen]);
  
  // Separate useEffect to handle Google library loading, which can be asynchronous.
  useEffect(() => {
      if (isOpen && activeTab === 'login') {
          if (window.google) {
              initializeGoogleSignIn();
          } else {
              // If the script hasn't loaded yet, we can't do anything.
              // It will be initialized by the `async defer` script tag eventually.
              console.warn("Google Sign-In script not loaded yet.");
          }
      }
  }, [isOpen, activeTab]);

  const initializeGoogleSignIn = () => {
    try {
      window.google.accounts.id.initialize({
        client_id: document.querySelector('meta[name="google-client-id"]')?.getAttribute('content') || '',
        callback: handleGoogleCredentialResponse,
      });

      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = ''; // Clear previous button
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: "outline", size: "large", width: "320" }
        );
      }
    } catch (err) {
      console.error("Google Sign-In initialization error:", err);
      setError("Could not initialize Google Sign-In. Ensure the client ID is correct.");
    }
  };

  const handleAuthSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
        onAuthSuccess();
    }, 1500);
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    setIsLoading(true);
    setError('');
    try {
      await loginWithGoogle(response.credential);
      handleAuthSuccess('Successfully signed in!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      try {
          await login(email, password);
          handleAuthSuccess('Successfully signed in!');
      } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleEmailSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
       try {
          await signup({ username, email, fullName, password });
          handleAuthSuccess('Account created! Signing you in...');
      } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
          setIsLoading(false);
      }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    if (isLoading || successMessage) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
          {isLoading && !successMessage && <i className="fas fa-spinner fa-spin text-4xl text-primary-light dark:text-primary-dark"></i>}
          <p className={`mt-4 text-center text-lg p-4 rounded-lg ${successMessage ? 'text-green-500 bg-green-500/10' : ''}`}>
            {successMessage || 'Processing...'}
          </p>
        </div>
      );
    }

    if (activeTab === 'signup') {
        return (
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full p-2.5 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent"/>
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required className="w-full p-2.5 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent"/>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2.5 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent"/>
            <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2.5 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent"/>
            <BlurryButton type="submit" className="w-full !mt-6">Create Account</BlurryButton>
          </form>
        );
    }

    // Login Tab
    return (
        <form onSubmit={handleEmailLogin} className="space-y-4">
            <div ref={googleButtonRef} className="flex justify-center h-[40px] -mb-2">
                {/* Google button will render here. It is only initialized when this tab is active. */}
            </div>
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border-primary-light dark:border-border-primary-dark"></div>
                <span className="flex-shrink mx-4 text-xs uppercase text-text-secondary-light dark:text-text-secondary-dark">Or</span>
                <div className="flex-grow border-t border-border-primary-light dark:border-border-primary-dark"></div>
            </div>
            <input type="email" placeholder="Email or Username" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2.5 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent"/>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2.5 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent"/>
            <BlurryButton type="submit" className="w-full !mt-6">Sign In</BlurryButton>
        </form>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-slide-up" style={{animationDuration: '300ms'}}>
      <div 
        className="bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-2xl p-1 max-w-md w-full shadow-2xl border border-border-primary-light dark:border-border-primary-dark relative animate-scale-in"
        style={{animationDuration: '400ms'}}
      >
        <button onClick={onClose} disabled={isLoading} className="absolute top-3 right-3 text-text-secondary-light dark:text-text-secondary-dark hover:text-red-500 transition-colors w-8 h-8 rounded-full bg-transparent hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center z-10 disabled:opacity-50">
            <i className="fas fa-times"></i>
        </button>

        <div className="p-8">
            <div className="flex justify-center border-b border-border-primary-light dark:border-border-primary-dark mb-6">
                <button onClick={() => setActiveTab('login')} className={`px-6 py-3 font-semibold transition-all duration-200 ${activeTab === 'login' ? 'text-primary-light dark:text-primary-dark border-b-2 border-primary-light dark:border-primary-dark' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    Sign In
                </button>
                <button onClick={() => setActiveTab('signup')} className={`px-6 py-3 font-semibold transition-all duration-200 ${activeTab === 'signup' ? 'text-primary-light dark:text-primary-dark border-b-2 border-primary-light dark:border-primary-dark' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                    Sign Up
                </button>
            </div>
            {error && <p className="text-red-500 text-center text-sm mb-4 bg-red-500/10 p-3 rounded-lg w-full">{error}</p>}
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Auth;
