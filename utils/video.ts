
/**
 * Extracts a specified number of frames from a video file as data URLs.
 * This version uses URL.createObjectURL for memory efficiency, preventing crashes on mobile.
 * Frames are resized and compressed to reduce payload size.
 * @param videoFile The video file to process.
 * @param frameCount The number of frames to extract.
 * @param onProgress A callback function to report progress (0-100, current frame, total frames).
 * @returns A promise that resolves with an array of data URI strings.
 */
export const extractFramesFromVideo = (
  videoFile: File,
  frameCount: number = 10,
  onProgress?: (progress: number, currentFrame: number, totalFrames: number) => void
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    // MORE EFFICIENT: Use createObjectURL to avoid loading the whole file into memory.
    const videoUrl = URL.createObjectURL(videoFile);
    
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: string[] = [];

    if (!context) {
      URL.revokeObjectURL(videoUrl); // Clean up
      return reject(new Error('Could not create canvas context.'));
    }

    // Centralized cleanup function
    const cleanup = () => {
      URL.revokeObjectURL(videoUrl);
      // Let the browser garbage collect the elements
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Could not process video. The file may be corrupt or in an unsupported format. Please try a different video (e.g., MP4).'));
    };

    video.onloadedmetadata = () => {
      video.muted = true;
      video.playsInline = true;
      
      const MAX_DIMENSION = 1280; // Max width or height for frames
      let { videoWidth, videoHeight } = video;

      if (videoWidth > MAX_DIMENSION || videoHeight > MAX_DIMENSION) {
        if (videoWidth > videoHeight) {
          videoHeight = Math.round(videoHeight * (MAX_DIMENSION / videoWidth));
          videoWidth = MAX_DIMENSION;
        } else {
          videoWidth = Math.round(videoWidth * (MAX_DIMENSION / videoHeight));
          videoHeight = MAX_DIMENSION;
        }
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const duration = video.duration;

      if (!isFinite(duration) || duration <= 0) {
        cleanup();
        reject(new Error('Video has an invalid duration. It might be a live stream or a corrupted file that cannot be processed.'));
        return;
      }
      
      const interval = duration / (frameCount + 1);
      let currentTime = interval > 0 ? interval : 0.1;
      let framesExtracted = 0;

      if (onProgress) {
          onProgress(0, 0, frameCount);
      }

      const captureFrame = () => {
        video.currentTime = currentTime;
      };
      
      video.onseeked = () => {
        if (framesExtracted >= frameCount) return; // A seek might fire after we are done.

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Reduce quality to 80% to decrease payload size and prevent upload issues.
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        if (dataUrl && dataUrl.length > 'data:image/jpeg;base64,'.length) {
          frames.push(dataUrl);
        }
        framesExtracted++;

        if (onProgress) {
            const progress = Math.min(100, Math.round((framesExtracted / frameCount) * 100));
            onProgress(progress, framesExtracted, frameCount);
        }
        
        currentTime += interval;
        
        if (currentTime < duration && framesExtracted < frameCount) {
          captureFrame();
        } else {
           if (onProgress) onProgress(100, frameCount, frameCount);
           cleanup(); // Clean up the object URL
           resolve(frames);
        }
      };

      // Start the process by triggering the first seek
      captureFrame();
    };

    video.preload = 'auto';
    video.src = videoUrl;
  });
};


export const getVideoMetadata = (file: File): Promise<{ duration: number; width: number; height: number; }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Failed to load video metadata. The file may be corrupt or in an unsupported format.'));
    };
  });
};

/**
 * Converts an image file to a data URL string, resizing it to a max dimension and compressing it to reduce payload size.
 * This helps prevent issues with streaming uploads in certain proxy environments.
 * This version uses URL.createObjectURL for memory efficiency.
 * @param file The image file to convert.
 * @returns A promise that resolves with the data URL string.
 */
export const imageToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    
    const img = new Image();
    
    const cleanup = () => {
      URL.revokeObjectURL(imageUrl);
    };
    
    img.onload = () => {
      const MAX_DIMENSION = 1920; // Max width or height
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round(height * (MAX_DIMENSION / width));
          width = MAX_DIMENSION;
        } else {
          width = Math.round(width * (MAX_DIMENSION / height));
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        cleanup();
        return reject(new Error('Could not create canvas context for image resizing.'));
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Use JPEG with quality 0.8 to ensure smaller size, even for PNGs.
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8); 
      cleanup();
      resolve(dataUrl);
    };

    img.onerror = () => {
      cleanup();
      reject(new Error("The provided file could not be loaded as an image. It may be corrupt."));
    };

    img.src = imageUrl;
  });
};
