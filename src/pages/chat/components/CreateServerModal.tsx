import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users as UsersIcon, ChevronRight, Upload } from 'lucide-react';
import { Server } from '../chatTypes';

interface CreateServerModalProps {
  onClose: () => void;
  onCreated: (s: Server) => void;
}

const CreateServerModal: React.FC<CreateServerModalProps> = ({ onClose, onCreated }) => {
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [name, setName] = useState('');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setIconPreview(URL.createObjectURL(f));
    }
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const abbreviation = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    onCreated({ id: `s${Date.now()}`, name: name.trim(), abbreviation, color: 'from-[#005CDA] to-[#001F4A]' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {step === 'type' ? (
          <div className="p-8 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#005CDA] to-[#001F4A] flex items-center justify-center shadow-lg">
              <UsersIcon size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Create Your Server</h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Your server is where you and your teammates hang out. Make yours and start talking.
              </p>
            </div>
            <button
              onClick={() => setStep('form')}
              className="w-full bg-gradient-to-b from-[#005CDA] to-[#001F4A] text-white py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 transition-all active:scale-95 shadow-lg"
            >
              Create My Own
            </button>
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('type')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
                <ChevronRight size={18} className="text-gray-500 rotate-180" />
              </button>
              <div>
                <h2 className="text-xl font-black text-gray-900">Customize Your Server</h2>
                <p className="text-xs text-gray-500 mt-0.5">Give it a name and an icon.</p>
              </div>
            </div>

            {/* Icon Upload */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 rounded-full border-2 border-dashed border-blue-200 hover:border-[#005CDA] transition-colors flex flex-col items-center justify-center gap-1.5 bg-blue-50 group overflow-hidden"
              >
                {iconPreview ? (
                  <img src={iconPreview} alt="icon" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload size={20} className="text-[#005CDA] group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-[#005CDA]">UPLOAD</span>
                  </>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Server Name */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Server Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Awesome Server"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005CDA]/30 focus:border-[#005CDA] transition-all"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-b from-[#005CDA] to-[#001F4A] text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-lg"
              >
                Create Server
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CreateServerModal;
