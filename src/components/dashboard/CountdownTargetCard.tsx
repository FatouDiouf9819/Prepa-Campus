'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Edit2, Check, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function CountdownTargetCard() {
  const { language } = useLanguage();
  const [targetDateStr, setTargetDateStr] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [inputDate, setInputDate] = useState<string>('');
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('campus_france_interview_date');
      if (saved) {
        setTargetDateStr(saved);
        calculateDays(saved);
      }
    } catch {
      // Ignorer
    }
  }, []);

  const calculateDays = (dateIso: string) => {
    try {
      const target = new Date(dateIso).getTime();
      const now = new Date().setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      setDaysRemaining(diffDays);
    } catch {
      setDaysRemaining(null);
    }
  };

  const handleSaveDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDate) return;
    try {
      localStorage.setItem('campus_france_interview_date', inputDate);
      setTargetDateStr(inputDate);
      calculateDays(inputDate);
      setIsEditing(false);
    } catch {
      // Ignorer
    }
  };

  const handleClearDate = () => {
    try {
      localStorage.removeItem('campus_france_interview_date');
      setTargetDateStr('');
      setDaysRemaining(null);
      setIsEditing(false);
    } catch {
      // Ignorer
    }
  };

  return (
    <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-[#38BDF8] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                {language === 'fr' ? 'Objectif Entretien Consulaire' : 'Consular Interview Goal'}
              </h2>
              {daysRemaining !== null && daysRemaining >= 0 && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  daysRemaining <= 3 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                    : daysRemaining <= 7 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {daysRemaining === 0 ? (language === 'fr' ? "Aujourd'hui" : 'Today') : `J-${daysRemaining}`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {daysRemaining !== null && targetDateStr ? (
                <>
                  {language === 'fr' ? 'Rendez-vous prévu le ' : 'Scheduled on '}
                  <strong className="text-slate-200 font-bold">
                    {new Date(targetDateStr).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </strong>
                </>
              ) : (
                language === 'fr' 
                  ? 'Fixez la date de votre entretien pour suivre votre compte à rebours.' 
                  : 'Set your interview date to track your countdown.'
              )}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => {
                setInputDate(targetDateStr || new Date().toISOString().split('T')[0]);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-slate-200 hover:text-white transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>{targetDateStr ? (language === 'fr' ? 'Modifier' : 'Edit') : (language === 'fr' ? 'Fixer ma date' : 'Set date')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title={language === 'fr' ? 'Annuler' : 'Cancel'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <form onSubmit={handleSaveDate} className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in duration-150">
          <input
            type="date"
            required
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-[#121827] border border-white/15 text-white text-xs focus:outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md shadow-blue-500/25 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{language === 'fr' ? 'Enregistrer' : 'Save'}</span>
            </button>
            {targetDateStr && (
              <button
                type="button"
                onClick={handleClearDate}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-xs font-semibold transition cursor-pointer"
              >
                {language === 'fr' ? 'Effacer' : 'Clear'}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
