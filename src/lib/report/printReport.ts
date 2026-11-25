import { EvaluationReport } from '@/types/interview';
import { RevisionMemo } from '@/lib/indicators/progression';

/**
 * Génère le document HTML stylisé, autonome et prêt pour l'impression A4 / export PDF.
 * Compatible avec tous les navigateurs (Safari iOS, Chrome, Firefox, Edge, Mac et Windows).
 */
export function generateReportHtml(report: EvaluationReport): string {
  const dateFormatted = report.createdAt 
    ? new Date(report.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('fr-FR');

  const criteriaHtml = (report.scoresByCriteria || []).map((crit) => {
    const pct = Math.round((crit.score / (crit.maxScore || 25)) * 100);
    return `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 12px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 13px; font-weight: 700; color: #1e293b;">${crit.label}</span>
          <span style="font-size: 14px; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 3px 10px; border-radius: 8px;">
            ${crit.score} / ${crit.maxScore}
          </span>
        </div>
        <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-bottom: 8px;">
          <div style="width: ${pct}%; height: 100%; background: #0284c7; border-radius: 999px;"></div>
        </div>
        <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.5;">${crit.comment || ''}</p>
      </div>
    `;
  }).join('');

  const strengthsHtml = (report.strengths || []).map((s) => `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid;">
      <strong style="display: block; font-size: 12px; color: #166534; margin-bottom: 4px;">✔ ${s.criterion}</strong>
      ${s.verbatimQuote ? `<div style="font-size: 11px; font-style: italic; color: #334155; background: #ffffff; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #22c55e; margin-bottom: 6px;">« ${s.verbatimQuote} »</div>` : ''}
      <p style="font-size: 12px; color: #14532d; margin: 0; line-height: 1.4;">${s.feedback}</p>
    </div>
  `).join('');

  const areasHtml = (report.areasToImprove || []).map((a) => `
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid;">
      <strong style="display: block; font-size: 12px; color: #92400e; margin-bottom: 4px;">⚠ ${a.criterion}</strong>
      ${a.verbatimQuote ? `<div style="font-size: 11px; font-style: italic; color: #334155; background: #ffffff; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #f59e0b; margin-bottom: 6px;">« ${a.verbatimQuote} »</div>` : ''}
      <p style="font-size: 12px; color: #78350f; margin: 0 0 6px 0; line-height: 1.4;">${a.feedback}</p>
      ${a.suggestedReformulation ? `<div style="font-size: 11px; color: #1e40af; background: #eff6ff; padding: 6px 10px; border-radius: 6px;"><strong>Suggestion :</strong> ${a.suggestedReformulation}</div>` : ''}
    </div>
  `).join('');

  const reformulationsHtml = (report.reformulationExamples || []).map((r) => `
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Contexte : ${r.originalContext}</div>
      <div style="margin-bottom: 6px; padding: 8px 10px; background: #fff1f2; border-radius: 6px; font-size: 11px; color: #9f1239;">
        <strong>Votre réponse initiale :</strong> « ${r.studentQuote} »
      </div>
      <div style="margin-bottom: 6px; padding: 8px 10px; background: #f0fdf4; border-radius: 6px; font-size: 11px; color: #166534;">
        <strong>Reformulation recommandée :</strong> « ${r.recommendedAnswer} »
      </div>
      <p style="font-size: 11px; color: #475569; margin: 0; font-style: italic;">${r.explanation}</p>
    </div>
  `).join('');

  const topicsHtml = (report.revisionTopics || []).map((t) => `
    <li style="margin-bottom: 6px; font-size: 12px; color: #334155;">${t}</li>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bilan d'Entretien Campus France - ${dateFormatted}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 1.2cm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
    }
    .print-btn {
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover {
      opacity: 0.92;
    }
    .header-box {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .score-badge {
      background: #0f172a;
      color: #38bdf8;
      border-radius: 16px;
      padding: 14px 20px;
      text-align: center;
      min-width: 140px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      margin: 22px 0 12px 0;
      border-left: 4px solid #0284c7;
      padding-left: 8px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 640px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
      .header-box {
        flex-direction: column;
        gap: 12px;
      }
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <!-- Barre d'action supérieure (masquée automatiquement à l'impression) -->
  <div class="no-print-bar">
    <div style="font-size: 13px; font-weight: 600;">
      📄 Bilan Pédagogique PrépaCampus
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="print-btn" onclick="window.print()">
        🖨️ Imprimer / Enregistrer en PDF
      </button>
    </div>
  </div>

  <!-- En-tête officiel du document -->
  <div class="header-box">
    <div>
      <div style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">
        PrépaCampus • Simulation Réelle d'Entretien
      </div>
      <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.02em;">
        Bilan d'Évaluation Pédagogique
      </h1>
      <p style="font-size: 12px; color: #64748b; margin: 0;">
        Date de la session : <strong>${dateFormatted}</strong> • Réf. session : ${report.sessionId || report.id}
      </p>
    </div>
    <div class="score-badge">
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 2px;">
        Campus Score™
      </div>
      <div style="font-size: 32px; font-weight: 900; line-height: 1;">
        ${report.overallScore}<span style="font-size: 16px; font-weight: 500; color: #64748b;">/100</span>
      </div>
    </div>
  </div>

  <!-- Synthèse Générale -->
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
    <strong style="font-size: 12px; color: #0f172a; display: block; margin-bottom: 4px;">Synthèse de l'examinatrice :</strong>
    <p style="font-size: 12px; color: #334155; margin: 0; line-height: 1.6;">
      ${report.synthesisSummary}
    </p>
  </div>

  <!-- Critères d'Évaluation -->
  <div class="section-title">1. Évaluation Critère par Critère</div>
  <div>
    ${criteriaHtml}
  </div>

  <!-- Points forts et Axes d'amélioration -->
  <div class="grid-2" style="margin-top: 16px;">
    <div>
      <div class="section-title" style="border-color: #22c55e;">2. Points Forts Confirmés</div>
      ${strengthsHtml || '<p style="font-size: 12px; color: #64748b; font-style: italic;">Poursuivez vos entraînements pour consolider vos points forts.</p>'}
    </div>
    <div>
      <div class="section-title" style="border-color: #f59e0b;">3. Axes d'Amélioration & Vigilance</div>
      ${areasHtml || '<p style="font-size: 12px; color: #64748b; font-style: italic;">Aucun point critique majeur relevé.</p>'}
    </div>
  </div>

  <!-- Exemples de Reformulation -->
  ${report.reformulationExamples && report.reformulationExamples.length > 0 ? `
    <div class="section-title" style="border-color: #8b5cf6; margin-top: 24px;">4. Exemples de Reformulation Académique</div>
    <div>
      ${reformulationsHtml}
    </div>
  ` : ''}

  <!-- Thèmes de Révision Prioritaires -->
  ${report.revisionTopics && report.revisionTopics.length > 0 ? `
    <div class="section-title" style="border-color: #0284c7; margin-top: 24px;">5. Thèmes à Réviser Prioritairement</div>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
      <ul style="margin: 0; padding-left: 20px;">
        ${topicsHtml}
      </ul>
    </div>
  ` : ''}

  <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; text-align: center;">
    PrépaCampus — Rapport pédagogique indépendant d'entraînement aux entretiens Campus France.
  </div>

  <script>
    // Déclenchement automatique de la boîte de dialogue d'impression dès le chargement complet
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print error:', e);
        }
      }, 300);
    });
  </script>
</body>
</html>`;
}

/**
 * Déclenche l'impression ou l'ouverture du document d'évaluation.
 * Fonctionne de façon 100% fiable sur mobile, tablette et desktop.
 */
export function printReportDocument(report: EvaluationReport): void {
  // 1. Tenter d'ouvrir une fenêtre propre dédiée contenant le document autonome
  const htmlContent = generateReportHtml(report);
  
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return;
    }
  } catch (err) {
    console.warn('[Print Window Opening Warning, falling back to direct print]', err);
  }

  // 2. Si les popups sont bloqués, déclencher window.print() directement sur la page
  if (typeof window !== 'undefined') {
    window.print();
  }
}

/**
 * Télécharge le bilan sous forme de fichier autonome .html que l'étudiant peut ouvrir et imprimer à tout moment hors-ligne.
 */
export function downloadReportHtml(report: EvaluationReport): void {
  const htmlContent = generateReportHtml(report);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bilan_Entretien_CampusFrance_${report.sessionId || report.id || 'session'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Génère le document HTML de la Fiche Réflexe (Mémo) pour impression / PDF.
 */
export function generateMemoHtml(memo: RevisionMemo): string {
  const dateFormatted = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const strengthsHtml = memo.strengths.map((s) => `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid;">
      <strong style="display: block; font-size: 12px; color: #166534; margin-bottom: 4px;">✔ ${s.criterion}</strong>
      ${s.quote ? `<div style="font-size: 11px; font-style: italic; color: #334155; background: #ffffff; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #22c55e; margin-bottom: 6px;">« ${s.quote} »</div>` : ''}
      <p style="font-size: 12px; color: #14532d; margin: 0; line-height: 1.4;">${s.comment}</p>
    </div>
  `).join('');

  const areasHtml = memo.areasToImprove.map((a) => `
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid;">
      <strong style="display: block; font-size: 12px; color: #92400e; margin-bottom: 4px;">⚠ ${a.criterion}</strong>
      ${a.quote ? `<div style="font-size: 11px; font-style: italic; color: #334155; background: #ffffff; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #f59e0b; margin-bottom: 6px;">Piège relevé : « ${a.quote} »</div>` : ''}
      <p style="font-size: 12px; color: #78350f; margin: 0; line-height: 1.4;">${a.comment}</p>
    </div>
  `).join('');

  const reformulationsHtml = memo.topReformulations.map((r) => `
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid;">
      <div style="margin-bottom: 6px; padding: 6px 10px; background: #fff1f2; border-radius: 6px; font-size: 11px; color: #9f1239;">
        <strong>À éviter :</strong> « ${r.quote} »
      </div>
      <div style="margin-bottom: 6px; padding: 6px 10px; background: #f0fdf4; border-radius: 6px; font-size: 11px; color: #166534;">
        <strong>Formule conseillée :</strong> « ${r.recommended} »
      </div>
      ${r.explanation ? `<p style="font-size: 11px; color: #475569; margin: 0; font-style: italic;">${r.explanation}</p>` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fiche Réflexe Campus France - ${dateFormatted}</title>
  <style>
    @page { size: A4 portrait; margin: 1.2cm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #ffffff; margin: 0; padding: 24px; line-height: 1.5; }
    .no-print-bar { position: sticky; top: 0; background: #0f172a; color: #ffffff; padding: 12px 20px; border-radius: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; }
    .print-btn { background: linear-gradient(135deg, #2563eb, #06b6d4); color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; }
    .header-box { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin: 20px 0 10px 0; border-left: 4px solid #0284c7; padding-left: 8px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }
    @media print { .no-print-bar { display: none !important; } body { padding: 0 !important; } }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-size: 13px; font-weight: 600;">📄 Fiche Réflexe pour le Jour J</div>
    <button class="print-btn" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
  </div>

  <div class="header-box">
    <div>
      <div style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">
        PrépaCampus • Fiche de Révision Pédagogique
      </div>
      <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0;">Fiche Réflexe pour le Jour J</h1>
      <p style="font-size: 11px; color: #64748b; margin: 0;">Synthèse personnalisée basée sur vos entraînements oraux.</p>
    </div>
    <div style="background: #0f172a; color: #38bdf8; border-radius: 12px; padding: 10px 16px; text-align: center;">
      <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94a3b8;">Meilleur score</div>
      <div style="font-size: 22px; font-weight: 900;">${memo.highestScore !== null ? memo.highestScore : '—'}<span style="font-size: 12px; font-weight: 500; color: #64748b;">/100</span></div>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="section-title" style="border-color: #22c55e;">Vos Points Forts Confirmés</div>
      ${strengthsHtml || '<p style="font-size: 11px; color: #64748b; font-style: italic;">Réalisez des simulations pour consolider vos points forts.</p>'}
    </div>
    <div>
      <div class="section-title" style="border-color: #f59e0b;">Pièges & Points de Vigilance</div>
      ${areasHtml || '<p style="font-size: 11px; color: #64748b; font-style: italic;">Aucun point critique relevé.</p>'}
    </div>
  </div>

  ${memo.topReformulations.length > 0 ? `
    <div class="section-title" style="border-color: #8b5cf6;">Reformulations Clés Travaillées</div>
    <div>${reformulationsHtml}</div>
  ` : ''}

  <div class="section-title" style="border-color: #0284c7;">Les 4 Règles d'Or du Candidat Campus France</div>
  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; font-size: 11px; color: #334155; line-height: 1.6;">
    <p style="margin: 0 0 6px 0;"><strong>1. Structurez vos réponses</strong> en 2 ou 3 points clairs (ex. « Premièrement... Deuxièmement... »).</p>
    <p style="margin: 0 0 6px 0;"><strong>2. Liez formation et projet professionnel</strong> : montrez la passerelle évidente entre vos études et votre métier cible.</p>
    <p style="margin: 0 0 6px 0;"><strong>3. Connaissez le programme de votre cursus</strong> : citez 2 ou 3 matières clés du semestre.</p>
    <p style="margin: 0;"><strong>4. Restez serein et concis</strong> : 1 minute à 1 minute 30 par réponse est la durée optimale.</p>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch (e) {}
      }, 300);
    });
  </script>
</body>
</html>`;
}

/**
 * Imprime la Fiche Réflexe (Mémo) dans une fenêtre propre.
 */
export function printMemoDocument(memo: RevisionMemo): void {
  const htmlContent = generateMemoHtml(memo);
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return;
    }
  } catch (err) {
    console.warn('[Print Memo Window Warning]', err);
  }
  if (typeof window !== 'undefined') {
    window.print();
  }
}

/**
 * Télécharge la Fiche Réflexe (Mémo) en fichier HTML hors-ligne.
 */
export function downloadMemoHtml(memo: RevisionMemo): void {
  const htmlContent = generateMemoHtml(memo);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Fiche_Reflexe_CampusFrance_${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
