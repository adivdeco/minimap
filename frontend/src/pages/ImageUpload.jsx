import { useState } from 'react';

const ImageUpload = ({ userId, onUploadSuccess, onAvatarUpdate }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // In a real implementation, you would upload this file to Cloudinary/S3 here
        // For now, we'll just simulate an upload and return a fake URL or base64
        setUploading(true);

        // Simulate upload delay
        setTimeout(() => {
            // Mock response
            const fakeUrl = URL.createObjectURL(file);
            console.log("Mock upload successful", fakeUrl);

            if (onAvatarUpdate) {
                onAvatarUpdate(fakeUrl);
            }
            if (onUploadSuccess) {
                onUploadSuccess({ url: fakeUrl });
            }
            setUploading(false);
        }, 1000);
    };

    return (
        <div className="flex flex-col items-start gap-4">
            <label className="block text-sm font-medium text-gray-700">
                Avatar
            </label>
            <div className="flex items-center gap-4">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-purple-50 file:text-purple-700
                        hover:file:bg-purple-100
                    "
                    disabled={uploading}
                />
                {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
            </div>
        </div>
    );
};

export default ImageUpload;
