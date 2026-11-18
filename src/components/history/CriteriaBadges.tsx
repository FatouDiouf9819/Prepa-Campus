'use client';

import React from 'react';

interface Criterion {
  name: string;
  label: string;
  score: number;
  maxScore?: number;
  max_score?: number;
}

interface CriteriaBadgesProps {
  criteria?: Criterion[];
  className?: string;
}

export function CriteriaBadges({ criteria, className = '' }: CriteriaBadgesProps) {
  if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
    return null;
  }

  const getShortLabel = (crit: Criterion) => {
    const raw = (crit.label || crit.name || '').toLowerCase();
    if (raw.includes('projet')) return 'Projet';
    if (raw.includes('élocution') || raw.includes('elocution') || raw.includes('expression') || raw.includes('aisance')) return 'Élocution';
    if (raw.includes('logique') || raw.includes('argument')) return 'Logique';
    if (raw.includes('parcours') || raw.includes('cohérence')) return 'Parcours';
    if (raw.includes('vœu') || raw.includes('voeu')) return 'Vœux';
    if (raw.includes('motivation') || raw.includes('financement')) return 'Motivation';
    
    // Repli propre
    return crit.label?.split(' ')[0] || crit.name;
  };

  return (
    <div className={`space-y-2.5 w-full ${className}`}>
      {criteria.map((crit, idx) => {
        const max = crit.maxScore || crit.max_score || 20;
        const ratio = Math.max(0, Math.min(1, crit.score / max));
        const percent = Math.round(ratio * 100);
        const shortLabel = getShortLabel(crit);

        return (
          <div key={crit.name || idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 text-[11px] font-medium border border-slate-700/50">
                {shortLabel}
              </span>
              <span className="text-slate-200 font-bold text-xs">
                {crit.score}<span className="text-slate-400 font-normal text-[11px]">/{max}</span>
              </span>
            </div>

            {/* Barre de progression avec dégradé cyan / bleu lumineux */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
