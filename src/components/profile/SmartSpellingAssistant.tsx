'use client';

import React, { useMemo } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { 
  findSpellingSuggestions, 
  applySpellingCorrection, 
  applyAllSpellingCorrections 
} from '@/lib/utils/frenchSpelling';

interface SmartSpellingAssistantProps {
  text: string;
  onApplyCorrection: (correctedText: string) => void;
  className?: string;
  fieldLabel?: string;
}

/**
 * Assistant d'orthographe et d'accents interactif style Microsoft Word.
 * Suggère immédiatement l'écriture correcte des mots (ex: Senegal -> Sénégal)
 * avec remplacement direct au clic.
 */
export function SmartSpellingAssistant({
  text,
  onApplyCorrection,
  className = '',
  fieldLabel,
}: SmartSpellingAssistantProps) {
  const suggestions = useMemo(() => findSpellingSuggestions(text), [text]);

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const handleApplySingle = (original: string, suggestion: string) => {
    const nextText = applySpellingCorrection(text, original, suggestion);
    onApplyCorrection(nextText);
  };

  const handleApplyAll = () => {
    const { correctedText } = applyAllSpellingCorrections(text);
    onApplyCorrection(correctedText);
  };

  return (
    <div 
      className={`mt-1.5 flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 animate-in fade-in duration-200 ${className}`}
      role="region"
      aria-label="Suggestions d'orthographe"
    >
      <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300 shrink-0 mr-0.5">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
        <span>Suggestion Word :</span>
      </div>

      {suggestions.map((item) => (
        <button
          key={`${item.original}_${item.suggestion}`}
          type="button"
          onClick={() => handleApplySingle(item.original, item.suggestion)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-100 font-semibold text-xs transition transform hover:scale-[1.02] active:scale-95 cursor-pointer shadow-xs"
          title={`Remplacer "${item.original}" par "${item.suggestion}"`}
        >
          <span className="text-slate-400 line-through text-[10px]">{item.original}</span>
          <span className="text-cyan-300">➔</span>
          <span className="text-white font-bold">{item.suggestion}</span>
        </button>
      ))}

      {suggestions.length > 1 && (
        <button
          type="button"
          onClick={handleApplyAll}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-500/40 text-emerald-200 font-bold text-[11px] transition active:scale-95 cursor-pointer ml-auto"
          title="Corriger tous les accents détectés"
        >
          <Check className="w-3 h-3 text-emerald-400" />
          <span>Tout corriger ({suggestions.length})</span>
        </button>
      )}
    </div>
  );
}

