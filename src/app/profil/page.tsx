import React from 'react';
import { Navbar } from '@/components/navigation/Navbar';
import { AcademicProfileForm } from '@/components/profile/AcademicProfileForm';

export const metadata = {
  title: 'Profil Académique | Prépa Campus France',
  description: 'Renseignez vos diplômes, formations ciblées et projet professionnel pour calibrer votre entretien IA.',
};

export default function ProfilPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FE] flex flex-col text-slate-800 font-sans">
      <Navbar />
      <main className="flex-1 py-6">
        <AcademicProfileForm />
      </main>
      <footer className="border-t border-slate-200/80 py-6 text-center text-xs text-slate-400 bg-[#F8F9FE]">
        <p>PrépaCampus — Service d&apos;entraînement pédagogique indépendant aux entretiens Campus France.</p>
      </footer>
    </div>
  );
}
