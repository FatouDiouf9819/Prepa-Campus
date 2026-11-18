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
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-[#0066FF] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {language === 'fr' ? 'Objectif Entretien Consulaire' : 'Consular Interview Goal'}
              </h2>
              {daysRemaining !== null && daysRemaining >= 0 && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  daysRemaining <= 3 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                    : daysRemaining <= 7 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {daysRemaining === 0 ? (language === 'fr' ? "Aujourd'hui" : 'Today') : `J-${daysRemaining}`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {daysRemaining !== null && targetDateStr ? (
                <>
                  {language === 'fr' ? 'Rendez-vous prévu le ' : 'Scheduled on '}
                  <strong className="text-slate-800 font-bold">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>{targetDateStr ? (language === 'fr' ? 'Modifier' : 'Edit') : (language === 'fr' ? 'Fixer ma date' : 'Set date')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title={language === 'fr' ? 'Annuler' : 'Cancel'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <form onSubmit={handleSaveDate} className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in duration-150">
          <input
            type="date"
            required
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/10 transition"
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
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer"
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
