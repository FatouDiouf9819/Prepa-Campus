'use client';

import React from 'react';

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  className?: string;
}

export function ScoreGauge({ score, maxScore = 100, className = '' }: ScoreGaugeProps) {
  const radius = 38;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.max(0, Math.min(100, (score / maxScore) * 100));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative w-28 h-28 flex items-center justify-center shrink-0 ${className}`}>
      <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="scoreGaugeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="scoreGaugeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#06b6d4" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Cercle d'arrière-plan sobre neutre */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#141414"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Arc de progression avec halo cyan néon */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="url(#scoreGaugeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          filter="url(#scoreGaugeGlow)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Texte central 84/100 */}
      <div className="absolute inset-0 flex items-center justify-center text-center select-none pointer-events-none">
        <span className="text-2xl font-black text-white tracking-tight leading-none">
          {score}
        </span>
        <span className="text-xs font-semibold text-slate-400 leading-none ml-0.5">
          /{maxScore}
        </span>
      </div>
    </div>
  );
}
