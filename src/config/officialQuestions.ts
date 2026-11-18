/**
 * Référentiel des questions officielles et incontournables Campus France
 * PrépaCampus — Base d'entraînement aux critères et questions pièges réels.
 */

export type QuestionCategory = 
  | 'PROJET_PRO'
  | 'CHOIX_FRANCE'
  | 'PARCOURS_NOTES'
  | 'FINANCEMENT_LOGEMENT'
  | 'PIEGES_AVENIR';

export interface OfficialQuestion {
  id: string;
  category: QuestionCategory;
  categoryLabel: string;
  question: string;
  hiddenIntent: string;
  trapToAvoid: string;
  recommendedResponse: string;
  keyAdvice: string;
}

export const OFFICIAL_QUESTIONS: OfficialQuestion[] = [
  // 1. Projet Professionnel
  {
    id: 'q_projet_1',
    category: 'PROJET_PRO',
    categoryLabel: 'Projet Professionnel',
    question: "Quel est votre projet professionnel après l'obtention de votre diplôme ?",
    hiddenIntent: "Vérifier si le candidat a une vision claire et réaliste du marché du travail, et si son diplôme est indispensable pour y arriver.",
    trapToAvoid: "Rester vague (« Je veux travailler dans une grande entreprise » ou « Je verrai bien selon les opportunités »).",
    recommendedResponse: "« Mon objectif est d'occuper le poste de [Métier précis] au sein d'entreprises du secteur [Secteur précis]. Ce Master en France me permet d'acquérir les compétences clés en [Matières spécifiques] indispensables pour ce rôle. »",
    keyAdvice: "Nommez un intitulé de poste précis et connectez-le immédiatement aux matières de votre formation.",
  },
  {
    id: 'q_projet_2',
    category: 'PROJET_PRO',
    categoryLabel: 'Projet Professionnel',
    question: "Comptez-vous rentrer dans votre pays d'origine après vos études ou rester en France ?",
    hiddenIntent: "Tester la conformité avec l'objectif de visa étudiant (la mobilité pour études n'est pas un visa d'immigration permanente).",
    trapToAvoid: "Dire « Je veux absolument m'installer définitivement en France et y faire ma vie ».",
    recommendedResponse: "« Mon projet prioritaire est de valoriser mon expertise dans mon pays d'origine où les besoins dans mon domaine sont très forts. Toutefois, je souhaite d'abord acquérir 1 à 2 ans d'expérience professionnelle en France pour consolider mes acquis avant mon retour. »",
    keyAdvice: "Mettez en avant le retour au pays comme objectif à moyen terme, éventuellement précédé d'une première expérience professionnelle tremplin.",
  },
  {
    id: 'q_projet_3',
    category: 'PROJET_PRO',
    categoryLabel: 'Projet Professionnel',
    question: "En quoi cette formation vous aidera-t-elle à atteindre ce poste plutôt qu'un diplôme local ?",
    hiddenIntent: "Vérifier la valeur ajoutée réelle du cursus français par rapport à l'offre existant dans le pays de résidence.",
    trapToAvoid: "Dénigrer l'enseignement de son pays (« L'université chez moi n'est pas bien »).",
    recommendedResponse: "« Mon cursus actuel m'a donné de solides bases théoriques. Cependant, le Master visé en France propose une spécialisation pointue en [Spécialité], des laboratoires de recherche renommés et un semestre obligatoire en entreprise difficilement accessibles localement. »",
    keyAdvice: "Ne dénigrez jamais votre université locale : valorisez la complémentarité et les spécificités uniques du cursus français.",
  },

  // 2. Choix de la France & Universités
  {
    id: 'q_france_1',
    category: 'CHOIX_FRANCE',
    categoryLabel: 'Choix de la France & Vœux',
    question: "Pourquoi avoir choisi la France et pas un autre pays francophone comme la Belgique ou le Canada ?",
    hiddenIntent: "Vérifier la sincérité de la démarche et la connaissance du système d'enseignement supérieur français.",
    trapToAvoid: "Invoquer uniquement le tourisme (« La France est un beau pays » ou « J'ai de la famille là-bas »).",
    recommendedResponse: "« J'ai choisi la France pour l'excellence de son enseignement supérieur, la reconnaissance internationale des diplômes d'État et l'adéquation parfaite de la maquette pédagogique de mes universités choisies avec mon projet. »",
    keyAdvice: "Citez des arguments académiques et professionnels, jamais uniquement familiaux ou touristiques.",
  },
  {
    id: 'q_france_2',
    category: 'CHOIX_FRANCE',
    categoryLabel: 'Choix de la France & Vœux',
    question: "Pourquoi avoir sélectionné l'Université de [Nom de la ville] parmi tous vos vœux ?",
    hiddenIntent: "Vérifier si le candidat a vraiment lu la plaquette de formation ou s'il a cliqué au hasard sur la plateforme.",
    trapToAvoid: "Dire « Parce qu'elle est bien classée » sans être capable de citer un seul professeur, laboratoire ou unité d'enseignement.",
    recommendedResponse: "« J'ai retenu cet établissement car sa formation intègre le module [Nom de cours précis], un partenariat actif avec [Entreprise/Laboratoire] et un taux d'insertion professionnelle de plus de 90% à 6 mois. »",
    keyAdvice: "Connaissez par cœur au moins 2 matières précises de chaque université mentionnée dans votre dossier.",
  },
  {
    id: 'q_france_3',
    category: 'CHOIX_FRANCE',
    categoryLabel: 'Choix de la France & Vœux',
    question: "Quelle est la différence majeure entre vos 3 vœux formulés sur la plateforme ?",
    hiddenIntent: "Tester la cohérence de l'ensemble de la démarche de candidature.",
    trapToAvoid: "Avoir postulé dans des domaines totalement disparates (ex: Droit, Informatique et Tourisme) sans fil conducteur.",
    recommendedResponse: "« Tous mes vœux partagent le même fil conducteur en [Filière]. Le vœu 1 est davantage orienté vers [Spécialité A], tandis que le vœu 2 met l'accent sur [Spécialité B], ce qui me permet de maximiser mes chances tout en restant cohérent. »",
    keyAdvice: "Justifiez la complémentarité de vos choix autour d'une colonne vertébrale commune.",
  },

  // 3. Parcours & Notes
  {
    id: 'q_parcours_1',
    category: 'PARCOURS_NOTES',
    categoryLabel: 'Parcours Académique & Notes',
    question: "Comment expliquez-vous la baisse de vos résultats scolaires lors de votre deuxième année ?",
    hiddenIntent: "Mesurer l'honnêteté, la maturité et la capacité de rebond face à une difficulté.",
    trapToAvoid: "Accuser les professeurs, mentir ou prétendre qu'il n'y a pas eu de baisse.",
    recommendedResponse: "« J'ai effectivement traversé un semestre plus difficile en L2 lié à l'adaptation aux matières plus spécialisées. J'ai réagi en revoyant ma méthode de travail et en participant à des groupes de révision, ce qui m'a permis de remonter ma moyenne dès le semestre suivant. »",
    keyAdvice: "Assumez sans détour, puis insistez immédiatement sur les actions correctives mises en place pour remonter la pente.",
  },
  {
    id: 'q_parcours_2',
    category: 'PARCOURS_NOTES',
    categoryLabel: 'Parcours Académique & Notes',
    question: "Vous avez changé de filière après votre Bac / première année. Pourquoi cette réorientation ?",
    hiddenIntent: "Vérifier que le parcours atypique est le fruit d'une réflexion mûrie et non d'une instabilité.",
    trapToAvoid: "Donner l'impression d'avoir choisi au hasard ou d'abandonner dès que c'est difficile.",
    recommendedResponse: "« Cette première expérience m'a permis de découvrir les réalités du domaine et de réaliser que mes réelles compétences et motivations s'expriment pleinement dans [Nouvelle filière]. Cette décision réfléchie a été confirmée par mes très bons résultats récents. »",
    keyAdvice: "Présentez la réorientation non comme un échec, mais comme une clarification salutaire de votre vocation.",
  },

  // 4. Financement & Logement
  {
    id: 'q_finance_1',
    category: 'FINANCEMENT_LOGEMENT',
    categoryLabel: 'Financement & Logement',
    question: "Comment comptez-vous financer vos études et votre coût de vie en France ?",
    hiddenIntent: "S'assurer que l'étudiant dispose des moyens financiers légaux sans dépendre d'un travail à temps plein non autorisé.",
    trapToAvoid: "Dire « Je travaillerai comme livreur ou serveur pour payer mes études » (un visa étudiant exige des ressources préalables garanties).",
    recommendedResponse: "« Mes études sont financées par mon garant [Lien de parenté, ex: mon oncle/mon père], qui est [Profession] et dispose de revenus stables. Une Attestation de Virement Irrévocable (AVI) de [Montant mensuel, ex: 615€ minimum] sera mise en place conformément aux exigences consulaires. »",
    keyAdvice: "Maîtrisez sur le bout des doigts le montant mensuel réglementaire (minimum 615 €/mois) et la situation de votre garant.",
  },
  {
    id: 'q_finance_2',
    category: 'FINANCEMENT_LOGEMENT',
    categoryLabel: 'Financement & Logement',
    question: "Où allez-vous loger lors de votre arrivée en France ?",
    hiddenIntent: "Évaluer l'anticipation logistique pour éviter le piège du sans-logement à la rentrée universitaire.",
    trapToAvoid: "« Je verrai sur place à l'aéroport ».",
    recommendedResponse: "« J'ai entamé des démarches auprès du CROUS et de résidences universitaires privées. Pour les premières semaines, j'ai une solution d'hébergement temporaire sécurisée chez [Famille / Ami / Résidence hôtelière] le temps de finaliser mon bail. »",
    keyAdvice: "Ayez toujours une adresse ou une piste concrète d'hébergement à citer le jour de l'entretien.",
  },

  // 5. Questions Pièges & Avenir
  {
    id: 'q_piege_1',
    category: 'PIEGES_AVENIR',
    categoryLabel: 'Questions Pièges & Plan B',
    question: "Que ferez-vous si aucune université française ne valide votre candidature cette année ?",
    hiddenIntent: "Tester la persévérance, la maturité et l'existence d'un plan alternatif crédible.",
    trapToAvoid: "Dire « Ma vie sera gâchée » ou « J'attendrai l'année prochaine sans rien faire ».",
    recommendedResponse: "« Si aucune candidature n'aboutit cette année, je poursuivrai mon cursus dans mon université actuelle tout en réalisant un stage professionnel pour renforcer mon dossier, et je retenterai ma chance l'an prochain avec un profil encore plus solide. »",
    keyAdvice: "Montrez que vous êtes proactif et que votre projet professionnel avance quelle que soit la décision consulaire.",
  },
  {
    id: 'q_piege_2',
    category: 'PIEGES_AVENIR',
    categoryLabel: 'Questions Pièges & Avenir',
    question: "Ne pensez-vous pas que votre niveau en français ou en anglais risque d'être un frein pour réussir ce Master ?",
    hiddenIntent: "Mettre sous pression le candidat pour observer sa confiance et son calme.",
    trapToAvoid: "Perdre ses moyens, s'énerver ou bredouiller.",
    recommendedResponse: "« Je suis conscient des exigences académiques. J'ai obtenu [Score au TCF/DELF ou note en langue], et je m'exerce quotidiennement à travers des lectures scientifiques pour garantir une intégration fluide dès les premiers cours. »",
    keyAdvice: "Gardez le sourire, restez calme et répondez avec des preuves tangibles (résultats, certifications, pratique).",
  },
];
