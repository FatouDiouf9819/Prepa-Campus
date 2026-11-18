import React, { Suspense } from 'react';
import { InterviewRoom } from '@/components/interview/InterviewRoom';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Simulation d\'Entretien 5 Min | Prépa Campus France',
  description: 'Entretien vocal adaptatif avec webcam locale et questions personnalisées de l\'IA.',
};

export default function InterviewPage() {
  return (
    <div className="min-h-screen bg-[#05070E] text-slate-100 font-sans">
      <Suspense fallback={
        <div className="min-h-screen bg-[#05070E] flex flex-col items-center justify-center text-[#38BDF8] gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs text-neutral-400">Chargement de la salle d&apos;entretien...</span>
        </div>
      }>
        <InterviewRoom />
      </Suspense>
    </div>
  );
}
