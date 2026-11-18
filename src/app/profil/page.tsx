import React from 'react';
import { Navbar } from '@/components/navigation/Navbar';
import { AcademicProfileForm } from '@/components/profile/AcademicProfileForm';

export const metadata = {
  title: 'Profil Académique | Prépa Campus France',
  description: 'Renseignez vos diplômes, formations ciblées et projet professionnel pour calibrer votre entretien IA.',
};

export default function ProfilPage() {
  return (
    <div className="min-h-screen bg-[#05070E] flex flex-col text-slate-100 font-sans">
      <Navbar />
      <main className="flex-1 py-6">
        <AcademicProfileForm />
      </main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 bg-[#05070E]">
        <p>PrépaCampus — Service d&apos;entraînement pédagogique indépendant aux entretiens Campus France.</p>
      </footer>
    </div>
  );
}
