
import { useState, useEffect, useCallback } from 'react';
import { User, PromptHistoryItem } from '../types';

// ====================================================================================
// CLIENT-SIDE DATABASE IMPLEMENTATION
//
// This application uses the browser's localStorage as a simple, persistent, and
// secure client-side database. It functions like a key-value store where we
// can save JSON data that persists even after the browser is closed.
//
// We manage three types of data:
// 1. A "master table" of all user accounts (`USERS_KEY`).
// 2. Separate "tables" for each user's prompt history (`HISTORY_KEY_PREFIX`).
// 3. A "session key" to track the currently logged-in user (`ACTIVE_USER_KEY`).
// ====================================================================================

const USERS_KEY = 'vizprompts_users';
const HISTORY_KEY_PREFIX = 'vizprompts_history_';
const ACTIVE_USER_KEY = 'vizprompts_active_user';


// Generates a simple, colorful SVG avatar based on the username.
const generateAvatar = (username: string): string => {
    const hash = username.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const h = Math.abs(hash % 360);
    const s = 60;
    const l = 70;
    const color = `hsl(${h}, ${s}%, ${l}%)`;
    const lighterColor = `hsl(${h}, ${s}%, 90%)`;
    const firstInitial = username.charAt(0).toUpperCase();

    const svg = `
        <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="${color}" />
            <text x="50" y="50" font-family="Inter, sans-serif" font-size="50" fill="${lighterColor}" text-anchor="middle" dy=".35em" font-weight="600">${firstInitial}</text>
        </svg>
    `;
    // Use btoa to base64 encode the SVG string for the data URI
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// New type for Google's JWT payload
interface GoogleJwtPayload {
    email: string;
    email_verified: boolean;
    name: string;
    picture: string;
    given_name: string;
    family_name: string;
    sub: string; // This is the unique Google User ID
}

export const useAuth = () => {
    const [users, setUsers] = useState<Record<string, User>>({});
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userHistory, setUserHistory] = useState<PromptHistoryItem[]>([]);

    const loadHistoryForUser = useCallback((username: string) => {
        try {
            const historyKey = `${HISTORY_KEY_PREFIX}${username}`;
            const storedHistory = localStorage.getItem(historyKey);
            setUserHistory(storedHistory ? JSON.parse(storedHistory) : []);
        } catch (error) {
            console.error("Failed to load history from localStorage:", error);
            setUserHistory([]);
        }
    }, []);

    // On initial app load, restore the session and user database from localStorage.
    useEffect(() => {
        try {
            const storedUsersStr = localStorage.getItem(USERS_KEY);
            const storedUsers = storedUsersStr ? JSON.parse(storedUsersStr) : {};
            setUsers(storedUsers);

            const activeUsername = localStorage.getItem(ACTIVE_USER_KEY);
            // If there's an active user session, log them in automatically.
            if (activeUsername && storedUsers[activeUsername]) {
                const user = storedUsers[activeUsername];
                setCurrentUser(user);
                loadHistoryForUser(user.username);
            }
        } catch (error) {
            console.error("Failed to initialize auth state from localStorage:", error);
            localStorage.clear(); // Clear potentially corrupt data.
        }
    }, [loadHistoryForUser]);

    const persistUsers = (updatedUsers: Record<string, User>) => {
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
            setUsers(updatedUsers);
        } catch (error) {
            console.error("Failed to save users to localStorage:", error);
        }
    };
    
    const loginWithGoogle = (credential: string): Promise<User> => {
        return new Promise((resolve, reject) => {
            try {
                const payloadStr = atob(credential.split('.')[1]);
                const payload: GoogleJwtPayload = JSON.parse(payloadStr);

                if (!payload.email_verified) {
                    return reject(new Error("Google account email is not verified."));
                }
                
                let user = Object.values(users).find(u => u.email === payload.email);

                if (!user) {
                    // New user: Create account automatically
                    const username = payload.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
                    if (users[username]) {
                         return reject(new Error('This username is already taken. Try signing in with your email and password.'));
                    }

                    user = {
                        username: username,
                        email: payload.email,
                        fullName: payload.name,
                        createdAt: new Date().toISOString(),
                        profilePicture: payload.picture || generateAvatar(username),
                    };
                    
                    persistUsers({ ...users, [user.username]: user });
                }
                
                // Login successful: set current user and save session.
                setCurrentUser(user);
                loadHistoryForUser(user.username);
                localStorage.setItem(ACTIVE_USER_KEY, user.username);
                resolve(user);
            } catch (error) {
                reject(new Error("Failed to process Google Sign-In."));
            }
        });
    };
    
    const signup = (data: Omit<User, 'createdAt' | 'profilePicture'>): Promise<User> => {
        return new Promise((resolve, reject) => {
            if (users[data.username]) {
                return reject(new Error('Username is already taken.'));
            }
            if (Object.values(users).some(u => u.email === data.email)) {
                return reject(new Error('An account with this email already exists.'));
            }
            if (!data.password || data.password.length < 6) {
                return reject(new Error('Password must be at least 6 characters long.'));
            }

            const newUser: User = {
                ...data,
                createdAt: new Date().toISOString(),
                profilePicture: generateAvatar(data.username),
            };

            persistUsers({ ...users, [newUser.username]: newUser });
            
            // Login successful: set current user and save session.
            setCurrentUser(newUser);
            loadHistoryForUser(newUser.username);
            localStorage.setItem(ACTIVE_USER_KEY, newUser.username);
            resolve(newUser);
        });
    };

    const login = (usernameOrEmail: string, password?: string): Promise<User> => {
        return new Promise((resolve, reject) => {
            const user = Object.values(users).find(
                u => u.username === usernameOrEmail || u.email === usernameOrEmail
            );

            if (!user) {
                return reject(new Error('User not found.'));
            }
            // For Google-created accounts without a password
            if (user.password === undefined) {
                 return reject(new Error('This account was created with Google Sign-In. Please use Google to sign in.'));
            }
            if (user.password !== password) {
                return reject(new Error('Invalid password.'));
            }

            // Login successful: set current user and save session.
            setCurrentUser(user);
            loadHistoryForUser(user.username);
            localStorage.setItem(ACTIVE_USER_KEY, user.username);
            resolve(user);
        });
    };

    const logout = () => {
        setCurrentUser(null);
        setUserHistory([]);
        localStorage.removeItem(ACTIVE_USER_KEY);
    };
    
    const addToHistory = useCallback((item: PromptHistoryItem) => {
        if (!currentUser) return;

        setUserHistory(prev => {
            const newHistory = [item, ...prev].slice(0, 5); // Keep only the last 5
            try {
                const historyKey = `${HISTORY_KEY_PREFIX}${currentUser.username}`;
                localStorage.setItem(historyKey, JSON.stringify(newHistory));
            } catch (error) {
                console.error("Failed to save history to localStorage:", error);
            }
            return newHistory;
        });
    }, [currentUser]);

    const updateUser = (updatedData: Partial<User>): Promise<User> => {
        return new Promise((resolve, reject) => {
            if (!currentUser) {
                return reject(new Error("No user is currently logged in."));
            }

            const updatedUser = { ...currentUser, ...updatedData };
            persistUsers({ ...users, [currentUser.username]: updatedUser });
            setCurrentUser(updatedUser);
            resolve(updatedUser);
        });
    };

    return {
        currentUser,
        userHistory,
        login,
        signup,
        loginWithGoogle,
        logout,
        addToHistory,
        updateUser,
    };
};
