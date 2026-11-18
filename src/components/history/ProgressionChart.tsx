'use client';

import React, { useState } from 'react';
import { 
  SessionRecord, 
  getTimelineData, 
  getGlobalProgressionStats, 
  TimelinePoint 
} from '@/lib/indicators/progression';

interface ProgressionChartProps {
  sessions: SessionRecord[];
}

export function ProgressionChart({ sessions }: ProgressionChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<TimelinePoint | null>(null);

  const rawTimeline = getTimelineData(sessions);
  const stats = getGlobalProgressionStats(sessions);

  if (stats.evaluatedSessions === 0) {
    return null;
  }

  // Si une seule session est enregistrée, construire une trajectoire prédictive pour que
  // le graphique soit TOUJOURS visible et superbe, exactement comme la maquette smartphone
  const isSingleSession = rawTimeline.length === 1;
  const displayTimeline: TimelinePoint[] = isSingleSession
    ? [
        {
          sessionId: rawTimeline[0].sessionId,
          reportId: rawTimeline[0].reportId,
          date: rawTimeline[0].date,
          score: rawTimeline[0].score,
          formattedDate: rawTimeline[0].formattedDate || 'Session 1',
          synthesisSummary: rawTimeline[0].synthesisSummary || 'Prestation initiale',
          index: 0,
        },
        {
          sessionId: 'target-session',
          reportId: 'target-report',
          date: new Date().toISOString(),
          score: Math.min(100, Math.max(85, rawTimeline[0].score + 12)),
          formattedDate: 'Objectif 85+',
          synthesisSummary: 'Niveau d\'excellence recommandé pour Campus France',
          index: 1,
        },
      ]
    : rawTimeline;

  // Dimensions du SVG
  const width = 360;
  const height = 180;
  const paddingX = 36;
  const paddingTop = 36;
  const paddingBottom = 32;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  // Échelle des scores
  const minScore = 40;
  const maxScore = 100;

  const getX = (index: number, total: number) => {
    if (total <= 1) return width / 2;
    return paddingX + (index / (total - 1)) * chartWidth;
  };

  const getY = (score: number) => {
    const clamped = Math.max(minScore, Math.min(maxScore, score));
    const ratio = (clamped - minScore) / (maxScore - minScore);
    return height - paddingBottom - ratio * chartHeight;
  };

  const points = displayTimeline.map((p, idx) => ({
    x: getX(idx, displayTimeline.length),
    y: getY(p.score),
    data: p,
  }));

  // Courbe fluide de Bézier
  const linePath = points.length > 1
    ? points.reduce((acc, curr, idx) => {
        if (idx === 0) return `M ${curr.x} ${curr.y}`;
        const prev = points[idx - 1];
        const cpX1 = prev.x + (curr.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (curr.x - prev.x) / 2;
        const cpY2 = curr.y;
        return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
      }, '')
    : `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;

  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : '';

  const diff = stats.totalProgression ?? 0;

  return (
    <div className="space-y-4">
      {/* 4 Métriques Clés en Grille 2x2 sobre et élégante */}
      <div className="grid grid-cols-2 gap-3">
        {/* Carte 1 : Simulations */}
        <div className="bg-[#0B1120] border border-cyan-500/30 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Simulations
            </span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {stats.evaluatedSessions}
            </span>
          </div>
        </div>

        {/* Carte 2 : Départ */}
        <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Départ
            </span>
            <span className="text-rose-400 text-xs font-bold leading-none">↓</span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {stats.initialScore !== null ? stats.initialScore : '—'}
            </span>
            <span className="text-sm font-medium text-slate-400 ml-0.5">/100</span>
          </div>
        </div>

        {/* Carte 3 : Actuel */}
        <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Actuel
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-1">
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {stats.latestScore !== null ? stats.latestScore : '—'}
              </span>
              <span className="text-sm font-medium text-slate-400 ml-0.5">/100</span>
            </div>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-bold text-[11px] shrink-0">
              {diff > 0 ? `+${diff} ↑` : diff === 0 ? '= Stable' : `${diff} ↓`}
            </span>
          </div>
        </div>

        {/* Carte 4 : Record */}
        <div className="bg-[#0B1120] border border-cyan-500/30 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Record
            </span>
            <span className="text-cyan-400 text-sm leading-none">★</span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {stats.highestScore !== null ? stats.highestScore : '—'}
            </span>
            <span className="text-sm font-medium text-slate-400 ml-0.5">/100</span>
          </div>
        </div>
      </div>

      {/* Courbe de Progression Graphique SVG Fluide sobre */}
      <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden shadow-sm">
        <div className="w-full">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 sm:h-44 overflow-visible">
            <defs>
              <linearGradient id="neonGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <linearGradient id="fillAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#22d3ee" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* Lignes de repère de la grille (horizontales et verticales) */}
            {[50, 75].map((lvl) => {
              const y = getY(lvl);
              return (
                <line
                  key={lvl}
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Lignes verticales sous chaque point */}
            {points.map((pt, idx) => (
              <line
                key={idx}
                x1={pt.x}
                y1={paddingTop - 10}
                x2={pt.x}
                y2={height - paddingBottom}
                stroke="#1e293b"
                strokeWidth="1"
              />
            ))}

            {/* Surface dégradée sous la courbe */}
            {areaPath && <path d={areaPath} fill="url(#fillAreaGradient)" />}

            {/* Tracé de la courbe néon */}
            <path
              d={linePath}
              fill="none"
              stroke="url(#neonGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#neonGlow)"
            />

            {/* Points & Pastilles de Score (Exactement comme dans la maquette) */}
            {points.map((pt, idx) => {
              const isHovered = hoveredPoint?.sessionId === pt.data.sessionId;
              const pillW = 26;
              const pillH = 16;
              const pillX = pt.x - pillW / 2;
              const pillY = pt.y - 22;

              return (
                <g 
                  key={pt.data.sessionId || idx} 
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt.data)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Pastille score sombre au-dessus du point */}
                  <rect
                    x={pillX}
                    y={pillY}
                    width={pillW}
                    height={pillH}
                    rx="4"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x={pt.x}
                    y={pillY + 11.5}
                    fill="#f8fafc"
                    fontSize="9.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {pt.data.score}
                  </text>

                  {/* Halo néon du point */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 7 : 5}
                    fill="#22d3ee"
                    opacity={0.4}
                  />

                  {/* Point central blanc/cyan */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 4 : 3}
                    fill="#ffffff"
                    stroke="#0284c7"
                    strokeWidth="2"
                  />

                  {/* Date en dessous */}
                  <text
                    x={pt.x}
                    y={height - 12}
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {pt.data.formattedDate}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Info-bulle interactive si survolé */}
        {hoveredPoint && (
          <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-slate-300 flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
            <span className="font-semibold text-white">{hoveredPoint.formattedDate} : {hoveredPoint.score}/100</span>
            {hoveredPoint.synthesisSummary && (
              <span className="text-slate-400 truncate max-w-xs text-[11px] italic">
                {hoveredPoint.synthesisSummary}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
