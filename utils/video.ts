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
 * Converts an image file to a data URL string for preview purposes.
 * @param file The image file to convert.
 * @returns A promise that resolves with the data URL string.
 */
export const imageToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
