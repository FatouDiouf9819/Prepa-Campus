'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, ExternalLink, GripVertical } from 'lucide-react';
import { CONTACT_CONFIG } from '@/config/contact';

interface WhatsAppHelpButtonProps {
  className?: string;
  isInterviewActive?: boolean;
}

export function WhatsAppHelpButton({ className = '', isInterviewActive = false }: WhatsAppHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const buttonRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const posStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialisation de la position initiale (au montage côté client)
  useEffect(() => {
    setMounted(true);
    const updateInitialPosition = () => {
      const buttonWidth = 56;
      const buttonHeight = 56;
      const margin = 16;

      if (isInterviewActive) {
        // En entretien actif : discret en bas à gauche
        setPos({
          x: margin,
          y: Math.max(window.innerHeight - buttonHeight - margin, 70),
        });
      } else {
        // Mode normal : en bas à droite
        setPos({
          x: Math.max(window.innerWidth - buttonWidth - margin, margin),
          y: Math.max(window.innerHeight - buttonHeight - margin, 70),
        });
      }
    };

    updateInitialPosition();

    // Recalibrer en cas de redimensionnement de l'écran ou rotation du téléphone
    const handleResize = () => {
      setPos((prev) => {
        const buttonWidth = buttonRef.current?.offsetWidth || 56;
        const buttonHeight = buttonRef.current?.offsetHeight || 56;
        const margin = 12;

        const maxX = Math.max(window.innerWidth - buttonWidth - margin, margin);
        const maxY = Math.max(window.innerHeight - buttonHeight - margin, 60);

        return {
          x: Math.min(Math.max(prev.x, margin), maxX),
          y: Math.min(Math.max(prev.y, 60), maxY),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isInterviewActive]);

  // Nettoyer le numéro pour l'URL wa.me
  const cleanNumber = CONTACT_CONFIG.whatsappNumber.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(CONTACT_CONFIG.defaultMessage);
  const whatsappUrl = cleanNumber ? `https://wa.me/${cleanNumber}?text=${encodedMessage}` : null;

  // Gestion du glisser-déplacer tactile & souris (AssistiveTouch style iPhone)
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Uniquement clic principal
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...pos };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignorer si la capture échoue
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;

    // Seuil de détection du mouvement (éviter de bloquer le simple clic)
    if (!hasMovedRef.current && Math.hypot(dx, dy) > 5) {
      hasMovedRef.current = true;
      setIsDragging(true);
    }

    if (hasMovedRef.current) {
      const buttonWidth = buttonRef.current?.offsetWidth || 56;
      const buttonHeight = buttonRef.current?.offsetHeight || 56;
      const margin = 12;

      const minX = margin;
      const maxX = Math.max(window.innerWidth - buttonWidth - margin, margin);
      const minY = 60; // Juste sous la barre de navigation
      const maxY = Math.max(window.innerHeight - buttonHeight - margin, minY);

      const targetX = Math.min(Math.max(posStartRef.current.x + dx, minX), maxX);
      const targetY = Math.min(Math.max(posStartRef.current.y + dy, minY), maxY);

      setPos({ x: targetX, y: targetY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignorer
    }

    if (hasMovedRef.current) {
      // Aimantation automatique vers le bord gauche ou droit le plus proche (comme sur iPhone)
      const buttonWidth = buttonRef.current?.offsetWidth || 56;
      const margin = 12;
      const midX = window.innerWidth / 2;
      const snapX = pos.x < midX ? margin : Math.max(window.innerWidth - buttonWidth - margin, margin);

      setPos((prev) => ({
        x: snapX,
        y: prev.y,
      }));
    } else {
      // Simple clic / tap : ouvrir ou fermer le dialogue d'aide
      setIsOpen((prev) => !prev);
    }
  };

  // Orientation du popup selon la position actuelle du bouton (ne déborde jamais de l'écran)
  const isLeftSide = typeof window !== 'undefined' ? pos.x < window.innerWidth / 2 : false;
  const isTopHalf = typeof window !== 'undefined' ? pos.y < window.innerHeight / 2 : false;

  // Rendu côté serveur initial pour éviter tout décalage d'hydratation
  if (!mounted) {
    return (
      <div className={`fixed z-50 ${isInterviewActive ? 'bottom-4 left-4' : 'bottom-6 right-6'} ${className}`}>
        <button
          type="button"
          className="flex items-center justify-center p-3.5 sm:px-4 sm:py-3 rounded-full bg-emerald-500 text-white font-semibold text-xs shadow-xl shadow-emerald-500/30"
          aria-label="Besoin d'aide ou support WhatsApp"
        >
          <MessageCircle className="w-5 h-5 text-white" />
          <span className="hidden sm:inline font-bold ml-2">Besoin d&apos;aide ?</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={buttonRef}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        zIndex: 99999,
        touchAction: 'none',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'left 0.35s cubic-bezier(0.16, 1, 0.3, 1), top 0.15s ease-out',
      }}
      className={`select-none ${className}`}
    >
      {/* Fenêtre de dialogue d'aide contextuelle (s'ouvre intelligemment vers l'espace libre) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            ...(isLeftSide ? { left: 0 } : { right: 0 }),
            ...(isTopHalf ? { top: 'calc(100% + 12px)' } : { bottom: 'calc(100% + 12px)' }),
          }}
          className="w-80 max-w-[calc(100vw-2rem)] rounded-3xl bg-[#0D121F] border border-white/10 p-5 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in duration-200 text-slate-100"
        >
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-bold text-xs text-white">Support & Entraide</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Fermer l'aide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {CONTACT_CONFIG.helpText}
          </p>

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              {CONTACT_CONFIG.actionLabel}
              <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </a>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-200">
              <p className="text-amber-300 font-medium mb-1">Assistance en cours de configuration</p>
              <p>Numéro d&apos;assistance non défini dans la configuration de contact.</p>
            </div>
          )}
        </div>
      )}

      {/* Bouton Flottant Déplaçable (AssistiveTouch style iPhone) */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`group flex items-center justify-center p-3 sm:px-4 sm:py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs shadow-2xl shadow-emerald-500/40 ring-2 ring-emerald-400/40 transition-transform ${isDragging ? 'cursor-grabbing scale-105 shadow-emerald-500/60 ring-emerald-300' : 'cursor-grab hover:scale-105 active:scale-95'
          }`}
        aria-label="Déplacer le bouton ou ouvrir le support WhatsApp"
        title="Maintenez appuyé pour déplacer comme sur iPhone, ou touchez pour ouvrir"
      >
        <GripVertical className="w-3 h-3 text-emerald-200/70 mr-0.5 hidden sm:inline-block pointer-events-none" />
        <MessageCircle className="w-5 h-5 text-white pointer-events-none" />
        <span className="hidden sm:inline font-bold ml-1.5 pointer-events-none">Besoin d&apos;aide ?</span>
      </button>
    </div>
  );
}
