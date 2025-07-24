import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { UserIcon, HistoryIcon, LogoutIcon } from './icons';
import { AppView } from '../App';

interface UserMenuProps {
    currentUser: User;
    onNavigate: (view: AppView) => void;
    onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser, onNavigate, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigation = (view: AppView) => {
        onNavigate(view);
        setIsMenuOpen(false);
    };
    
    const handleLogoutClick = () => {
        onLogout();
        setIsMenuOpen(false);
    }

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center text-text-primary-light dark:text-text-primary-dark transition-all duration-150 active:scale-90 shadow-md">
                <UserIcon className="w-10 h-10" imgSrc={currentUser.profilePicture} />
            </button>
            {isMenuOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-lg shadow-lg border border-border-primary-light dark:border-border-primary-dark py-1 z-10 animate-scale-in" style={{animationDuration: '150ms'}}>
                    <div className="px-4 py-2 border-b border-border-primary-light dark:border-border-primary-dark">
                        <p className="text-sm font-semibold truncate" title={currentUser.fullName}>{currentUser.fullName}</p>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate" title={`@${currentUser.username}`}>@{currentUser.username}</p>
                    </div>
                    <button onClick={() => handleNavigation('profile')} className="w-full text-left px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center transition-colors duration-150">
                        <UserIcon className="w-5 h-5 mr-2" /> Profile
                    </button>
                    <button onClick={() => handleNavigation('history')} className="w-full text-left px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center transition-colors duration-150">
                        <HistoryIcon className="w-5 h-5 mr-2" /> History
                    </button>
                    <div className="border-t border-border-primary-light dark:border-border-primary-dark my-1"></div>
                    <button onClick={handleLogoutClick} className="w-full text-left px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center transition-colors duration-150">
                        <LogoutIcon className="w-5 h-5 mr-2" /> Sign Out
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
