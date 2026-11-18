'use client';

import React from 'react';
import { Check, GraduationCap, School, Target, Sparkles } from 'lucide-react';
import { ProfileStep, ProfileStepConfig } from '@/types/profile';

interface StepIndicatorProps {
  currentStep: ProfileStep;
  completedSteps: number[];
  onStepClick: (step: ProfileStep) => void;
}

export const STEPS_CONFIG: ProfileStepConfig[] = [
  {
    step: 1,
    title: 'Parcours Actuel',
    shortTitle: 'Parcours',
    description: 'Votre diplôme et vos études en cours',
  },
  {
    step: 2,
    title: 'Formation Visée',
    shortTitle: 'Formations',
    description: 'Vos vœux et universités en France',
  },
  {
    step: 3,
    title: 'Projet Professionnel',
    shortTitle: 'Projet Pro',
    description: 'Vos motivations et votre métier cible',
  },
  {
    step: 4,
    title: 'Évaluation & Validation',
    shortTitle: 'Évaluation',
    description: 'Auto-évaluation, axes de travail et validation',
  },
];

export function ProfileStepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
  const getIcon = (step: ProfileStep) => {
    switch (step) {
      case 1:
        return <GraduationCap className="w-5 h-5" />;
      case 2:
        return <School className="w-5 h-5" />;
      case 3:
        return <Target className="w-5 h-5" />;
      case 4:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-xl mb-8">
      <div className="flex items-center justify-between relative">
        {/* Ligne de connexion d'arrière-plan */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-0" />
        
        {/* Ligne de progression active */}
        <div 
          className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 -z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (STEPS_CONFIG.length - 1)) * 90}%` }}
        />

        {STEPS_CONFIG.map((config) => {
          const isCurrent = currentStep === config.step;
          const isDone = completedSteps.includes(config.step);

          return (
            <button
              key={config.step}
              type="button"
              onClick={() => onStepClick(config.step)}
              className="group relative z-10 flex flex-col items-center focus:outline-none"
            >
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 font-semibold text-sm ${
                  isDone
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : isCurrent
                    ? 'bg-slate-950 text-cyan-400 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-4 ring-cyan-500/10'
                    : 'bg-slate-800/90 text-slate-400 border border-slate-700/60 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                {isDone ? <Check className="w-5 h-5 text-white" /> : getIcon(config.step)}
              </div>

              <div className="mt-2 text-center hidden sm:block">
                <span
                  className={`text-xs font-medium block transition-colors ${
                    isCurrent
                      ? 'text-cyan-400 font-semibold'
                      : isDone
                      ? 'text-slate-300'
                      : 'text-slate-500'
                  }`}
                >
                  {config.shortTitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <span>
          Étape <strong className="text-white font-semibold">{currentStep}</strong> sur {STEPS_CONFIG.length} : {STEPS_CONFIG[currentStep - 1].title}
        </span>
        <span className="text-cyan-400/90">
          {Math.round(((completedSteps.length) / STEPS_CONFIG.length) * 100)}% complété
        </span>
      </div>
    </div>
  );
}
