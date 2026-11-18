import React from 'react';
import { Navbar } from '@/components/navigation/Navbar';
import { PreparationScreen } from '@/components/interview/PreparationScreen';

export const metadata = {
  title: 'Préparation & Test Matériel | Prépa Campus France',
  description: 'Testez votre micro et votre caméra locale avant de commencer la simulation de 5 minutes.',
};

export default function PreparationPage() {
  return (
    <div className="min-h-screen bg-[#05070E] flex flex-col text-slate-100 font-sans">
      <Navbar />
      <main className="flex-1 py-4">
        <PreparationScreen />
      </main>
    </div>
  );
}
