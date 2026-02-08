import React, { useState } from 'react';
import { ModelConfig, ModelType } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: ModelConfig[];
  activeConfigId: string;
  onSaveConfig: (config: ModelConfig) => void;
  onSelectActive: (id: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, configs, activeConfigId, onSaveConfig, onSelectActive
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newConfig, setNewConfig] = useState<Partial<ModelConfig>>({
    type: ModelType.OPENAI_COMPATIBLE,
    name: '',
    endpoint: '',
    apiKey: '',
    modelId: ''
  });

  if (!isOpen) return null;

  const handleSave = () => {
    if (newConfig.name && newConfig.modelId) {
      onSaveConfig({
        id: Date.now().toString(),
        name: newConfig.name,
        type: newConfig.type || ModelType.OPENAI_COMPATIBLE,
        endpoint: newConfig.endpoint,
        apiKey: newConfig.apiKey,
        modelId: newConfig.modelId
      });
      setIsAdding(false);
      setNewConfig({ type: ModelType.OPENAI_COMPATIBLE, name: '', endpoint: '', apiKey: '', modelId: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Model Configuration</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Available Models</h3>
            
            {configs.map(config => (
              <div 
                key={config.id} 
                onClick={() => onSelectActive(config.id)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  activeConfigId === config.id 
                    ? 'bg-primary-900/20 border-primary-500' 
                    : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="font-medium text-white">{config.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{config.modelId} • {config.type}</div>
                </div>
                {activeConfigId === config.id && (
                  <div className="text-primary-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!isAdding ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-6 w-full py-2 border border-dashed border-slate-600 text-slate-400 rounded-lg hover:border-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Custom OpenAI Model
            </button>
          ) : (
            <div className="mt-6 bg-slate-800 p-4 rounded-lg space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-sm font-bold text-white mb-2">New Custom Model</h3>
              <input 
                type="text" 
                placeholder="Display Name" 
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-primary-500 outline-none"
                value={newConfig.name}
                onChange={e => setNewConfig({...newConfig, name: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Model ID (e.g., dall-e-3)" 
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-primary-500 outline-none"
                value={newConfig.modelId}
                onChange={e => setNewConfig({...newConfig, modelId: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Endpoint URL (e.g., https://api.openai.com)" 
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-primary-500 outline-none"
                value={newConfig.endpoint}
                onChange={e => setNewConfig({...newConfig, endpoint: e.target.value})}
              />
              <input 
                type="password" 
                placeholder="API Key" 
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-primary-500 outline-none"
                value={newConfig.apiKey}
                onChange={e => setNewConfig({...newConfig, apiKey: e.target.value})}
              />
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-primary-600 hover:bg-primary-500 text-white py-2 rounded text-sm font-medium"
                >
                  Save Model
                </button>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
