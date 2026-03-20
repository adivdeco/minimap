import { useState } from 'react';

// Pull credentials from your frontend/.env file
const CLOUDINARY_URL = import.meta.env.VITE_CLOUDINARY_URL || "YOUR_CLOUDINARY_API_URL"; 
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "YOUR_CLOUDINARY_UPLOAD_PRESET";

const compressImage = (file, maxWidth = 1000, maxHeight = 1000, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height *= maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width *= maxHeight / height));
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const ImageUpload = ({ label = "Image", onUploadSuccess, onAvatarUpdate, currentImage, onUploadingStateChange }) => {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(currentImage || null);
    const [error, setError] = useState('');

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        if (onUploadingStateChange) onUploadingStateChange(true);
        setError('');

        try {
            // 1. Compress the image
            const compressedFile = await compressImage(file);
            
            // Show local preview immediately (optional)
            const localPreviewUrl = URL.createObjectURL(compressedFile);
            setPreview(localPreviewUrl);

            // 2. Upload to Cloudinary
            // IMPORTANT: Remove this if condition once CLOUDINARY_URL is configured
            if (CLOUDINARY_URL === "YOUR_CLOUDINARY_API_URL") {
                // Mock upload for now
                setTimeout(() => {
                    if (onAvatarUpdate) onAvatarUpdate(localPreviewUrl);
                    if (onUploadSuccess) onUploadSuccess({ url: localPreviewUrl, file: compressedFile });
                    setUploading(false);
                    if (onUploadingStateChange) onUploadingStateChange(false);
                }, 1000);
                return;
            }

            const formData = new FormData();
            formData.append("file", compressedFile);
            formData.append("upload_preset", UPLOAD_PRESET);
            
            const res = await fetch(CLOUDINARY_URL, {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                throw new Error("Upload failed");
            }

            const data = await res.json();
            const secureUrl = data.secure_url;
            setPreview(secureUrl);

            if (onAvatarUpdate) {
                onAvatarUpdate(secureUrl);
            }
            if (onUploadSuccess) {
                onUploadSuccess({ url: secureUrl });
            }
        } catch (err) {
            console.error(err);
            setError('Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
            if (onUploadingStateChange) onUploadingStateChange(false);
        }
    };

    return (
        <div className="flex flex-col items-start gap-4 w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                {preview && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="flex-1 w-full">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100
                            dark:file:bg-purple-500/20 dark:file:text-purple-300 dark:hover:file:bg-purple-500/30
                        "
                        disabled={uploading}
                    />
                    {uploading && <p className="text-sm text-purple-500 mt-2">Compressing & Uploading...</p>}
                    {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default ImageUpload;
