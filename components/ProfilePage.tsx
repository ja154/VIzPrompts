import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import GlowCard from './GlowCard';
import BlurryButton from './Button';
import { UserIcon } from './icons';
import { imageToDataUrl } from '../utils/video';

const ProfilePage: React.FC = () => {
    const { currentUser, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState(currentUser?.fullName || '');
    const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!currentUser) {
        return (
            <section className="max-w-2xl mx-auto animate-fade-in-slide-up text-center">
                 <h2 className="text-3xl font-bold text-center mb-12">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">User Profile</span>
                </h2>
                <p>Please log in to view your profile.</p>
            </section>
        );
    }
    
    const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const dataUrl = await imageToDataUrl(file);
                setProfilePicture(dataUrl);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to process image.');
            }
        }
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            await updateUser({ fullName, profilePicture });
            setSuccess('Profile updated successfully!');
            setTimeout(() => {
                setIsEditing(false);
                setSuccess('');
            }, 1500)
        } catch(err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFullName(currentUser.fullName);
        setProfilePicture(currentUser.profilePicture);
        setError('');
        setSuccess('');
    }

    return (
        <section className="max-w-2xl mx-auto animate-fade-in-slide-up">
            <h2 className="text-3xl font-bold text-center mb-12">
                <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">User Profile</span>
            </h2>
            <GlowCard className="bg-bg-secondary-light dark:bg-bg-secondary-dark rounded-2xl p-1 shadow-lg border border-border-primary-light dark:border-border-primary-dark">
                <div className="rounded-xl p-8">
                    {error && <p className="text-red-500 text-center text-sm mb-4 bg-red-500/10 p-3 rounded-lg">{error}</p>}
                    {success && <p className="text-green-500 text-center text-sm mb-4 bg-green-500/10 p-3 rounded-lg">{success}</p>}

                    {!isEditing ? (
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mb-4 ring-4 ring-purple-500/30">
                                <UserIcon className="w-24 h-24" imgSrc={currentUser.profilePicture} />
                            </div>
                            <h3 className="text-2xl font-bold">{currentUser.fullName}</h3>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark">@{currentUser.username}</p>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark">{currentUser.email}</p>
                            <p className="mt-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                Member since {new Date(currentUser.createdAt).toLocaleDateString()}
                            </p>
                            <BlurryButton onClick={() => setIsEditing(true)} className="mt-6">
                                Edit Profile
                            </BlurryButton>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveChanges} className="space-y-6">
                            <div className="flex flex-col items-center space-y-2">
                                <div className="w-24 h-24 rounded-full bg-bg-uploader-light dark:bg-bg-uploader-dark border-2 border-dashed border-border-primary-light dark:border-border-primary-dark flex items-center justify-center cursor-pointer overflow-hidden" onClick={() => fileInputRef.current?.click()}>
                                    {profilePicture ? <img src={profilePicture} alt="Profile preview" className="w-full h-full object-cover" /> : <i className="fas fa-camera text-2xl text-text-secondary-light dark:text-text-secondary-dark"></i>}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handlePictureUpload} className="hidden" accept="image/*" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-primary-light dark:text-primary-dark hover:underline">
                                    Change Picture
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-2.5 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-text-secondary-light dark:text-text-secondary-dark">Username (cannot be changed)</label>
                                <input type="text" value={currentUser.username} className="w-full p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-border-primary-light dark:border-border-primary-dark cursor-not-allowed" disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-text-secondary-light dark:text-text-secondary-dark">Email (cannot be changed)</label>
                                <input type="email" value={currentUser.email} className="w-full p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-border-primary-light dark:border-border-primary-dark cursor-not-allowed" disabled />
                            </div>
                            <div className="flex gap-4 mt-4">
                                <BlurryButton type="submit" className="flex-1" disabled={isLoading}>
                                    {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Saving...</> : 'Save Changes'}
                                </BlurryButton>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 group relative inline-flex items-center justify-center p-0.5 rounded-xl font-semibold transition-all duration-200 ease-in-out bg-bg-primary-light dark:bg-bg-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700/80 text-text-primary-light dark:text-text-primary-dark"
                                    disabled={isLoading}
                                >
                                    <span className="relative w-full h-full px-5 py-2.5 text-sm rounded-lg leading-none flex items-center justify-center gap-2">
                                      Cancel
                                    </span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </GlowCard>
        </section>
    );
};

export default ProfilePage;
