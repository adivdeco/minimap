import { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';

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

const MultiImageUpload = ({ label = "Additional Images", onChange, currentImages = [], onUploadingStateChange }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        if (onUploadingStateChange) onUploadingStateChange(true);
        setError('');

        try {
            // Upload all images in parallel
            const uploadPromises = files.map(async (file) => {
                // 1. Compress the image
                const compressedFile = await compressImage(file);
                
                // 2. Upload to Cloudinary
                const formData = new FormData();
                formData.append("file", compressedFile);
                formData.append("upload_preset", UPLOAD_PRESET);
                
                const res = await fetch(CLOUDINARY_URL, {
                    method: "POST",
                    body: formData
                });

                if (!res.ok) throw new Error("Upload failed for an image");

                const data = await res.json();
                return data.secure_url;
            });

            const newUrls = await Promise.all(uploadPromises);

            // Add all new URLs to the list
            const newImages = [...currentImages, ...newUrls];
            if (onChange) onChange(newImages);

        } catch (err) {
            console.error(err);
            setError('Failed to upload some images. Please try again.');
        } finally {
            // Reset input so they can upload the exact same file again if they deleted it
            e.target.value = null;
            setUploading(false);
            if (onUploadingStateChange) onUploadingStateChange(false);
        }
    };

    const handleDelete = (indexToDelete) => {
        // Remove image from the array
        const newImages = currentImages.filter((_, idx) => idx !== indexToDelete);
        if (onChange) onChange(newImages);
    };

    return (
        <div className="flex flex-col items-start gap-4 w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>
            
            {/* Gallery Grid */}
            {currentImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 w-full mb-2">
                    {currentImages.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 group bg-gray-100 dark:bg-white/5">
                            <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[2px]">
                                <button
                                    type="button"
                                    onClick={() => handleDelete(idx)}
                                    className="p-2 bg-red-500/90 text-white rounded-full hover:bg-red-600 hover:scale-110 transition-all shadow-lg"
                                    title="Delete Image"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                <div className="flex-1 w-full">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100
                            dark:file:bg-purple-500/20 dark:file:text-purple-300 dark:hover:file:bg-purple-500/30
                            transition-all
                        "
                        disabled={uploading}
                    />
                    {uploading && (
                        <p className="text-sm text-purple-500 mt-3 flex items-center gap-2 font-medium">
                            <UploadCloud size={16} className="animate-bounce" /> Compressing & Uploading...
                        </p>
                    )}
                    {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default MultiImageUpload;
