import React, { useRef } from 'react';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  disabled: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onImagesChange, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as File[];
      const newImages: UploadedImage[] = [];

      for (const file of newFiles) {
        const previewUrl = URL.createObjectURL(file);
        newImages.push({ file, previewUrl, base64: '' });
      }

      onImagesChange([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].previewUrl);
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Area */}
      <div 
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300
          flex flex-col items-center justify-center min-h-[160px]
          ${disabled 
            ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' 
            : 'border-gray-300 hover:border-[#FF2442] hover:bg-[#FF2442]/5 bg-white'
          }
        `}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          multiple 
          accept="image/*" 
          className="hidden"
          disabled={disabled}
        />
        
        <div className="bg-red-50 text-[#FF2442] w-12 h-12 rounded-full flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        
        <div className="space-y-1">
          <p className="font-bold text-gray-800 text-lg">点击上传图片</p>
          <p className="text-sm text-gray-400">支持多图 (JPG, PNG)</p>
        </div>
      </div>

      {/* Sliding Preview Grid */}
      {images.length > 0 && (
        <div className="relative">
            <p className="text-xs text-gray-400 mb-2 px-1">已选 {images.length} 张图片 (左右滑动查看)</p>
            {/* Removed no-scrollbar, added padding-bottom for scrollbar space */}
            <div className="flex gap-3 overflow-x-auto py-2 px-1 scroll-smooth custom-scrollbar">
            {images.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0 group w-28 h-28 rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white">
                <img src={img.previewUrl} alt="preview" className="w-full h-full object-cover" />
                {!disabled && (
                    <div 
                    onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                        <div className="bg-white/20 p-1 rounded-full backdrop-blur-sm">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                    </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                    {idx + 1}
                </div>
                </div>
            ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;