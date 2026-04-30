export const APP_NAME = "Hartmann Hub";
export const APP_VERSION = "3.0.2";
export const APP_AUTHOR = "Elina Hartmann";
export const APP_CONTACT = "elina.hartmann.pro@gmail.com";
export const APP_DESCRIPTION = "Solution complète de gestion HACCP, traçabilité et pilotage opérationnel professionnel.";
export const APP_LAST_UPDATE = "30 Avril 2026";

export const APP_CHANGELOG = [
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
