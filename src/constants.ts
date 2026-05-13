export const APP_NAME = "Hartmann Hub";
export const APP_VERSION = "3.2.1";
export const APP_AUTHOR = "Elina Hartmann";
export const APP_CONTACT = "elina.hartmann.pro@gmail.com";
export const APP_DESCRIPTION = "Solution complète de gestion HACCP, traçabilité et pilotage opérationnel professionnel.";
export const APP_LAST_UPDATE = "13 Mai 2026";

export const APP_CHANGELOG = [
  {
    version: "3.2.1",
    date: "13 Mai 2026",
    changes: [
      "Bouclier de Données (IndexedDB) : Nouveau système de sauvegarde en double pour éviter les pertes de relevés si le navigateur vide son cache temporaire.",
      "Alertes Prédictives de Rupture (Intelligence Proactive) : Le système analyse vos consommations et vous alerte sur l'accueil si un produit risque de manquer aujourd'hui ou demain.",
      "Optimisation de l'affichage des alertes : Une seule ligne claire résume les risques avec une vue détaillée disponible au clic.",
      "Nouveau Logo Cosmique : Mise à jour de l'identité visuelle avec un design moderne et futuriste.",
    ]
  },
  {
    version: "3.5.0",
    date: "12 Mai 2026",
    changes: [
      "Tri Prédictif Intelligent : les catégories les plus pertinentes remontent automatiquement en haut de liste selon l'heure (matin/midi/soir).",
      "Badges HACCP dynamiques : des pastilles rouges vous alertent sur le menu latéral quand une action est oubliée ou en retard.",
      "Correction des commandes : les produits sans fournisseur sont désormais listés sous 'Non assigné'.",
      "Optimisation du scroll : correction du scroll de la barre latérale sur iPad."
    ]
  },
  {
    version: "3.2.0",
    date: "12 Mai 2026",
    changes: [
      "Nouveau module : Commandes Fournisseurs basé sur l'IA de l'inventaire !",
      "Génération automatique de bons de commande PDF et brouillons d'e-mails par fournisseur."
    ]
  },
  {
    version: "3.1.2",
    date: "12 Mai 2026",
    changes: [
      "Inventaire IA: Correction du bug empêchant le clic sur 'Corriger le stock' lors d'une anomalie",
    ]
  },
  {
    version: "3.1.1",
    date: "12 Mai 2026",
    changes: [
      "Inventaire IA: Possibilité de corriger ponctuellement l'état d'un stock directement depuis l'Anomalie sans avoir à refaire un inventaire",
      "Export PDF: Affichage optimisé des photos en annexes avec une référence aléatoire ajoutée aux tableaux pour lier textuellement chaque ligne à sa photo"
    ]
  },
  {
    version: "3.1.0",
    date: "12 Mai 2026",
    changes: [
      "Traçabilité & Export: Support des photos associées individuellement à chaque produit lors de l'export PDF",
      "Traçabilité: Adaptation du générateur de PDF HACCP pour intégrer automatiquement les multiples photos par produit d'une même session"
    ]
  },
  {
    version: "3.0.9",
    date: "12 Mai 2026",
    changes: [
      "Traçabilité: Lier les photos individuellement à chaque produit ajouté plutôt que globalement au formulaire entier",
      "Traçabilité: La validation du formulaire s'assure qu'une photo existe pour chaque ligne de produit ajoutée",
    ]
  },
  {
    version: "3.0.8",
    date: "12 Mai 2026",
    changes: [
      "IA Manager: Exclusion automatique des produits marqués N/A des analyses et rapports",
      "IA Manager: Harmonisation des indicateurs de fiabilité sur les données validées",
      "IA Manager: Correction des faux positifs sur les anomalies pour les produits hors périmètre"
    ]
  },
  {
    version: "3.0.7",
    date: "12 Mai 2026",
    changes: [
      "IA Manager: Mise en place de la gestion des droits par rôle (Managers vs Équipes)",
      "IA Manager: Accès en lecture seule pour les équipes (consultation des stocks et anomalies)",
      "IA Manager: Actions d'édition et mode intelligent réservés exclusivement aux managers",
      "Sécurité: Verrouillage des fonctionnalités sensibles côté interface pour les rôles non-administrateurs"
    ]
  },
  {
    version: "3.0.6",
    date: "11 Mai 2026",
    changes: [
      "Inventaire IA: Génération de rapports PDF automatiques et professionnels",
      "Inventaire IA: Personnalisation visuelle des rapports selon l'identité du restaurant",
      "Inventaire IA: Indicateurs de fiabilité et segmentation des risques (ruptures, anomalies)",
      "Réception: Amélioration de la saisie avec choix d'unités (Cartons, Unités, Kg...)",
      "Amélioration globale de la précision des calculs de consommation"
    ]
  },
  {
    version: "3.0.5",
    date: "7 Mai 2026",
    changes: [
      "Amélioration de l'inventaire intelligent basé sur l'IA avec affichage détaillé (stock attendu, consommation, autonomie)",
      "Détection automatique des anomalies et incohérences dans les stocks",
      "Tri de l'historique des huiles de la plus récente à la moins récente",
      "Correction des boutons du menu latéral pour une ouverture précise",
      "Verrouillage de l'arrière-plan lorsqu'une fenêtre est ouverte"
    ]
  },
  {
    version: "3.0.4",
    date: "30 Avril 2026",
    changes: [
      "Amélioration de la sélection (UI) des produits dans le module Reception comme dans Tracabilite",
      "Correction d'affichage de la traduction de 'Commentaires additionnels'"
    ]
  },
  {
    version: "3.0.3",
    date: "30 Avril 2026",
    changes: [
      "Possibilité de modifier une réception de livraison une fois enregistrée",
      "Ajout d'une sélection intelligente des produits de l'inventaire dans la saisie des livraisons"
    ]
  },
  {
    version: "3.0.2",
    date: "30 Avril 2026",
    changes: [
      "Mise en place d'une gestion intelligente de session et sécurité",
      "Verrouillage automatique de session après inactivité sur iPad ou tablettes partagées",
      "Détection des passages en arrière-plan avec demande du code PIN au retour si nécessaire",
      "Déconnexion totale des sessions expirées après un certain temps pour la protection des données"
    ]
  },
  {
    version: "3.0.1",
    date: "30 Avril 2026",
    changes: [
      "Amélioration de l'écran Gérer les produits avec une vue liste dédiée",
      "Ajout de la gestion détaillée des unités (stock vs achat) et conversion carton/unité",
      "Saisie rapide sur téléphone pour la date dans le module Traçabilité"
    ]
  },
  {
    version: "3.0.0",
    date: "30 Avril 2026",
    changes: [
      "Déploiement complet des traductions anglaises sur l'ensemble de l'application",
      "Amélioration majeure de l'ergonomie (Drag & Drop) sur iPad pour la réorganisation des cuves et zones de températures dans la configuration",
      "Interface utilisateur plus propre et adaptée aux gestes tactiles"
    ]
  },
  {
    version: "2.5.5",
    date: "29 Avril 2026",
    changes: [
      "Introduction de la synchronisation hors-ligne pour l'application Mobile",
      "Sauvegarde persistante cryptée des données si une perte de réseau survient",
      "Mécanisme de renvoi automatique (retry) qui s'exécute en arrière-plan lorsque la connexion revient",
      "Affichage clair des statuts de synchronisation pour s'assurer qu'aucune donnée n'est perdue"
    ]
  },
  {
    version: "2.5.4",
    date: "29 Avril 2026",
    changes: [
      "Amélioration de la personnalisation de la photo de profil dans les réglages",
      "Ajout d'une fenêtre de personnalisation offrant 4 options pour l'avatar",
      "Possibilité de prendre une photo directement depuis l'appareil",
      "Possibilité de choisir une icône personnalisée parmi une galerie SVG",
      "Possibilité de changer la couleur de fond du monogramme ou de l'icône"
    ]
  },
  {
    version: "2.5.3",
    date: "29 Avril 2026",
    changes: [
      "Correction du bug empêchant la sauvegarde des fournisseurs dans la base de données",
      "Le champ fournisseur dans Nouvelle Réception affiche désormais correctement la liste déroulante des fournisseurs",
      "Amélioration de l'option Personnalisé pour la saisie manuelle d'un fournisseur"
    ]
  },
  {
    version: "2.5.2",
    date: "29 Avril 2026",
    changes: [
      "Couleurs cohérentes avec le thème principal sur toute l'application",
      "Demande de confirmation sécurisée avant de désactiver un module",
      "Nom du restaurant pré-rempli dans les paramètres d'impression",
      "Filtre calendaire pour consulter le journal d'activité sur d'anciennes dates",
      "Ajout de la liste des fournisseurs et du mode personnalisé dans les réceptions",
      "Drag & Drop pour la réorganisation des cuves d'huiles et zones de températures",
      "Indicateur visuel pour signaler le contenu masqué dans la barre latérale sur mobile",
      "Possibilité d'ajouter des photos de profil personnalisées (avatar) pour les membres de l'équipe",
      "Nouvel écran de remplacement pour l'Assistant A.I. Manager sans données suffisantes",
      "Alertes visuelles (Toasts) ajoutées pour certifier qu'un changement de paramètre a bien pris effet"
    ]
  },
  {
    version: "2.5.1",
    date: "28 Avril 2026",
    changes: [
      "Correction d'un bug où la fenêtre TPM ne s'affichait pas après la prise de photo sur certains téléphones (fallback pour formats d'images non supportés)."
    ]
  },
  {
    version: "2.5.0",
    date: "28 Avril 2026",
    changes: [
      "Optimisation majeure des photos : compression accrue pour réduire la taille des fichiers avant envoi depuis les téléphones et iPads, tout en conservant la DLC lisible.",
      "Correction d'un bug critique lors de la prévisualisation des collectes mobiles sur iPad ('Corrupted zip').",
      "Ajout de la prise en charge des données mobiles hors ligne consolidées."
    ]
  },
  {
    version: "2.4.6",
    date: "28 Avril 2026",
    changes: [
      "Correction des plantages du bouton Prévisualiser.",
      "Amélioration de la sérialisation des exportations ZIP."
    ]
  }
];
