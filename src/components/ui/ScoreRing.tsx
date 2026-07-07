import React from 'react';
import { cn } from '@/utils/cn';

interface ScoreRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}

const ScoreRing: React.FC<ScoreRingProps> = ({ percent, size = 64, strokeWidth = 6, color = '#005CDA', label, sublabel, className }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#F1F5F9" strokeWidth={strokeWidth} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-gray-900">
          {clamped}%
        </div>
      </div>
      {label && <span className="text-[11px] font-black text-gray-700 text-center">{label}</span>}
      {sublabel && <span className="text-[10px] text-gray-400 font-bold text-center">{sublabel}</span>}
    </div>
  );
};

export default ScoreRing;
