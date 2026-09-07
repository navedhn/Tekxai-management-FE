import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { EMOJI_CATEGORIES, ALL_EMOJIS } from './emojiData';

export default function EmojiPicker({
  onSelect,
  onClose,
  align = 'left',
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  align?: 'left' | 'right';
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q ? ALL_EMOJIS.filter((e) => e.name.includes(q) || e.keywords.includes(q)) : null;

  return (
    <>

      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`absolute bottom-full mb-2 ${align === 'right' ? 'right-0' : 'left-0'} z-50 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emoji…"
              className="w-full h-8 pl-8 pr-3 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filtered ? (
            filtered.length === 0 ? (
              <p className="text-center text-xs text-gray-300 py-6">No matches</p>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {filtered.map((e) => (
                  <button
                    key={e.emoji}
                    title={e.name}
                    onClick={() => onSelect(e.emoji)}
                    className="text-xl h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                  >
                    {e.emoji}
                  </button>
                ))}
              </div>
            )
          ) : (
            EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label} className="mb-2 last:mb-0">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase px-1 mb-1">{cat.label}</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {cat.entries.map((e) => (
                    <button
                      key={e.emoji}
                      title={e.name}
                      onClick={() => onSelect(e.emoji)}
                      className="text-xl h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                    >
                      {e.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
