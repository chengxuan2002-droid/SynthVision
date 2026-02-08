import React, { useState, useEffect, useRef } from 'react';
import { GeneratedImage } from '../types';

interface ImageEditorModalProps {
  image: GeneratedImage | null;
  onClose: () => void;
  onSave: (id: string, newUrl: string, newTags: string[]) => void;
}

const FILTERS = [
  { name: 'None', value: 'none' },
  { name: 'Grayscale', value: 'grayscale(100%)' },
  { name: 'Sepia', value: 'sepia(100%)' },
  { name: 'High Contrast', value: 'contrast(150%)' },
  { name: 'Bright', value: 'brightness(120%)' },
  { name: 'Invert', value: 'invert(100%)' },
  { name: 'Blur', value: 'blur(2px)' },
];

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ image, onClose, onSave }) => {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [filter, setFilter] = useState('none');
  const [crop, setCrop] = useState({ top: 0, bottom: 0, left: 0, right: 0 }); // Percentages
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (image) {
      setTags(image.tags || []);
      setBrightness(100);
      setContrast(100);
      setFilter('none');
      setCrop({ top: 0, bottom: 0, left: 0, right: 0 });
      setPreviewUrl(image.url);
    }
  }, [image]);

  if (!image) return null;

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const applyChanges = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image.url;
    
    img.onload = () => {
      // 1. Calculate Crop Dimensions
      const width = img.width;
      const height = img.height;
      
      const cropLeft = width * (crop.left / 100);
      const cropRight = width * (crop.right / 100);
      const cropTop = height * (crop.top / 100);
      const cropBottom = height * (crop.bottom / 100);

      const finalWidth = width - cropLeft - cropRight;
      const finalHeight = height - cropTop - cropBottom;

      if (finalWidth <= 0 || finalHeight <= 0) return;

      // 2. Set Canvas Size to Cropped Size
      canvas.width = finalWidth;
      canvas.height = finalHeight;

      // 3. Apply Filters using Context
      let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
      if (filter !== 'none') {
        filterString += ` ${filter}`;
      }
      ctx.filter = filterString;

      // 4. Draw Cropped Image
      // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      ctx.drawImage(
        img, 
        cropLeft, cropTop, finalWidth, finalHeight, 
        0, 0, finalWidth, finalHeight
      );

      // 5. Save
      const newBase64 = canvas.toDataURL('image/png');
      onSave(image.id, newBase64, tags);
      onClose();
    };
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div>
            <h2 className="text-xl font-bold text-white">Image Editor</h2>
            <p className="text-xs text-slate-400 font-mono mt-1">{image.id}</p>
          </div>
          <div className="flex gap-3">
             <button onClick={onClose} className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
             <button onClick={applyChanges} className="px-6 py-2 rounded bg-primary-600 hover:bg-primary-500 text-white font-medium shadow-lg shadow-primary-900/20">Save Changes</button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Preview Area */}
          <div className="flex-1 bg-black/50 p-6 flex items-center justify-center relative overflow-hidden">
            <div className="relative shadow-2xl border border-slate-800" style={{ maxWidth: '100%', maxHeight: '100%' }}>
               {/* This image is for visual preview only, styling matches canvas logic roughly */}
               <img 
                 src={previewUrl} 
                 alt="preview" 
                 className="max-h-full max-w-full object-contain"
                 style={{
                   filter: `brightness(${brightness}%) contrast(${contrast}%) ${filter !== 'none' ? filter : ''}`,
                   clipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`
                 }}
               />
            </div>
            {/* Hidden Canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Tools Sidebar */}
          <div className="w-80 bg-slate-850 border-l border-slate-800 flex flex-col overflow-y-auto">
            
            {/* 1. Tagging System */}
            <div className="p-5 border-b border-slate-800">
               <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                 Tags
               </h3>
               <div className="flex gap-2 mb-3">
                 <input 
                   type="text" 
                   value={newTag}
                   onChange={(e) => setNewTag(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                   placeholder="Add tag..." 
                   className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-primary-500 outline-none"
                 />
                 <button onClick={handleAddTag} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-sm">+</button>
               </div>
               <div className="flex flex-wrap gap-2">
                 {tags.map(tag => (
                   <span key={tag} className="bg-primary-900/40 text-primary-300 border border-primary-500/30 px-2 py-1 rounded text-xs flex items-center gap-1">
                     {tag}
                     <button onClick={() => handleRemoveTag(tag)} className="hover:text-white">×</button>
                   </span>
                 ))}
                 {tags.length === 0 && <span className="text-xs text-slate-500 italic">No tags added</span>}
               </div>
            </div>

            {/* 2. Adjustments */}
            <div className="p-5 border-b border-slate-800 space-y-4">
               <h3 className="text-sm font-bold text-white">Adjustments</h3>
               
               <div className="space-y-1">
                 <div className="flex justify-between text-xs text-slate-400">
                   <span>Brightness</span>
                   <span>{brightness}%</span>
                 </div>
                 <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full accent-primary-500 h-1 bg-slate-700 rounded appearance-none" />
               </div>

               <div className="space-y-1">
                 <div className="flex justify-between text-xs text-slate-400">
                   <span>Contrast</span>
                   <span>{contrast}%</span>
                 </div>
                 <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full accent-primary-500 h-1 bg-slate-700 rounded appearance-none" />
               </div>
            </div>

            {/* 3. Filters */}
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3">Filters</h3>
              <div className="grid grid-cols-2 gap-2">
                {FILTERS.map(f => (
                  <button
                    key={f.name}
                    onClick={() => setFilter(f.value)}
                    className={`text-xs py-2 px-1 rounded border transition-colors ${
                      filter === f.value 
                        ? 'bg-primary-600 text-white border-primary-500' 
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Crop */}
            <div className="p-5 space-y-4">
               <h3 className="text-sm font-bold text-white flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg>
                 Crop (Inset %)
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <span className="text-xs text-slate-400">Top</span>
                     <input type="number" min="0" max="45" value={crop.top} onChange={e => setCrop({...crop, top: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
                  </div>
                  <div className="space-y-1">
                     <span className="text-xs text-slate-400">Bottom</span>
                     <input type="number" min="0" max="45" value={crop.bottom} onChange={e => setCrop({...crop, bottom: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
                  </div>
                  <div className="space-y-1">
                     <span className="text-xs text-slate-400">Left</span>
                     <input type="number" min="0" max="45" value={crop.left} onChange={e => setCrop({...crop, left: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
                  </div>
                  <div className="space-y-1">
                     <span className="text-xs text-slate-400">Right</span>
                     <input type="number" min="0" max="45" value={crop.right} onChange={e => setCrop({...crop, right: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
                  </div>
               </div>
               <button onClick={() => setCrop({top:0, bottom:0, left:0, right:0})} className="w-full mt-2 py-1 text-xs text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-800 rounded">Reset Crop</button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorModal;