import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredData, setStoredData } from './db';

type Language = 'fr' | 'en';

const translations = {
  fr: {
    // Navigation
    nav_dashboard: "Accueil",
    nav_receptions: "Réception",
    nav_tracabilite: "Traçabilité",
    nav_temperatures: "Températures",
    nav_viandes: "Cuisson Alimentaire",
    nav_cleaning: "Plan de nettoyage",
    nav_desserts: "Étiquettes DLC",
    nav_prep: "Préparation",
    nav_oil: "Huiles",
    nav_inventaire: "Inventaire",
    nav_mobile_sessions: "Sessions Mobiles",
    nav_products: "Catalogue",
    nav_logout: "Me déconnecter",
    nav_settings: "Paramètres",
    nav_profile: "Mon Profil",

    // Common
    btn_validate: "Valider",
    btn_cancel: "Annuler",
    btn_reset: "Réinitialiser",
    btn_close: "Fermer",
    btn_delete: "Supprimer",
    btn_edit: "Modifier",
    btn_save: "Enregistrer",
    btn_back: "Retour",
    btn_copy: "Copier",
    btn_manage: "Gérer",
    
    // Roles
    role_manager: "MANAGER",
    role_guest: "INVITÉ",
    
    // Time
    time_ago_mins: "Il y a {mins} min",
    time_ago_hrs: "Il y a {hrs}h",
    time_ago_dayplus: "Plus de 24h",

    // Settings
    settings_title: "Réglages",
    settings_advanced: "Configuration Avancée",
    settings_personalize: "Personnaliser le restaurant",
    settings_personalize_desc: "Équipe, Imprimante, Stockage...",
    settings_change_pin: "Changer mon code PIN",
    settings_pin_desc: "Ce code vous permet de vous connecter à l'application. Choisissez 4 chiffres faciles à retenir.",
    settings_new_pin: "Nouveau code PIN",
    settings_confirm_pin: "Confirmation",
    settings_about: "À propos",
    settings_language: "Langue",
    
    // About
    about_version: "Version",
    about_author: "Créé par",
    about_free: "Cette application est 100% gratuite",
    about_license: "Licence Open Source",
    about_tech: "Technologies",
    about_updated: "Mise à jour le",
    about_support: "Support / Contact",
    about_whats_new: "Voir les nouveautés",
    
    // Identity Tab
    identity_base_info: "Informations de Base",
    identity_resto_name: "Nom de l'établissement",
    identity_city: "Ville / Secteur",
    identity_monogram_text: "Texte Spécifique (Monogramme)",
    identity_auto_value: "Valeur Automatique",
    identity_monogram_hint: "Laissez vide pour utiliser l'initiale du nom automatiquement.",
    identity_design_lab: "Studio de Design Direct",
    identity_design_lab_desc: "Édition interactive en temps réel",
    identity_header_preview: "Aperçu du Header",
    identity_edit_monogram: "Édition monogramme",
    identity_palette_predefined: "Palettes prédéfinies",
    identity_primary_color: "Couleur Primaire (Action)",
    identity_secondary_color: "Couleur Secondaire (Accent)",
    identity_ui_colors: "Couleurs de l'Interface",
    identity_active_valid: "Valide & Actif",
    identity_accent_shade: "Teinte d'accent",
    identity_style_signature: "Style Signature",
    identity_shape_round: "Cercle",
    identity_shape_square: "Carré",
    identity_shape_free: "Libre",
    identity_bg: "Fond",
    identity_content: "Contenu",
    identity_brand_icon: "Icône de Marque",
    
    // Dashboard
    dashboard_good_morning: "Bonjour",
    dashboard_good_evening: "Bonsoir",
    dashboard_mobile_btn: "Mobile",
    dashboard_download_zip: "Télécharger ZIP",
    dashboard_day_progress: "Journée",
    dashboard_tasks_planned: "Tâches planifiées",
    dashboard_tasks_remaining: "Tâches restantes",
    dashboard_last_action: "Dernière action",
    dashboard_last_temp: "Dernier relevé Froid",
    dashboard_lots_count: "{count} lot(s)",
    dashboard_openings_count: "{count} ouv.",
    dashboard_readings_count: "{count} relevé(s)",
    dashboard_tasks_count: "{count} tâche(s)",
    dashboard_bins_count: "{count} bac(s)",
    dashboard_products_count: "{count} prd.",
    
    // Status
    status_up_to_date: "À jour",
    status_pending: "En attente",
    status_done: "Fait",
    status_to_do: "À faire",
    status_connected: "Connecté",
    
    // Warnings
    warning_ios_storage: "Vos données pourraient être supprimées par iOS. Pensez à exporter régulièrement votre PDF HACCP.",
    warning_storage_full: "Stockage presque plein. Effectuez un archivage mensuel pour libérer de l'espace.",

    // Mobile Collection
    mobile_sync_active: "Sessions actives",
    mobile_sync_create: "Créer une session",
    mobile_sync_manual: "Import Manuel",
    mobile_sync_none: "Aucune session active.",
    mobile_sync_waiting: "En attente",
    mobile_sync_uploaded: "Archive reçue",
    mobile_sync_imported: "Importé",
    mobile_sync_preview: "Prévisualiser",
    mobile_sync_delete: "Supprimer la session",

    // Mobile App
    mobile_app_syncing: "Synchronisation en cours",
    mobile_app_sync_desc: "Récupération des configurations de l'iPad...",
    mobile_app_setup_desc: "Saisissez votre prénom et nom. Ils seront associés à toutes vos saisies effectuées depuis ce téléphone.",
    mobile_app_start_btn: "Commencer la saisie",
    mobile_app_exit_btn: "Annuler et Quitter",
    mobile_app_mode: "Mode Collecte",
    mobile_app_allowed_modules: "Modules autorisés",
    mobile_app_ready_export: "Prêt à exporter",
    mobile_app_elements_count: "{count} élément(s) saisi(s)",
    mobile_app_sent_success: "Envoyé avec succès vers l'iPad",
    mobile_app_resend: "Renvoyer vers l'iPad",
    mobile_app_manual_download: "Au cas où: Télécharger manuellement (ZIP)",
    mobile_app_clear_device: "Vider l'appareil",
    mobile_app_sending: "Envoi en cours...",
    mobile_app_send_btn: "Envoyer vers l'iPad",
    
    // Errors
    err_pin_length: "Le code PIN doit faire 4 chiffres.",
    err_pin_mismatch: "Les codes ne correspondent pas.",
    err_generic: "Une erreur est survenue.",
  },
  en: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_receptions: "Receiving",
    nav_tracabilite: "Traceability",
    nav_temperatures: "Temperatures",
    nav_viandes: "Food Cooking",
    nav_cleaning: "Cleaning Plan",
    nav_desserts: "Shelf Life Labels",
    nav_prep: "Preparations",
    nav_oil: "Oils",
    nav_inventaire: "Inventory",
    nav_mobile_sessions: "Mobile Sessions",
    nav_products: "Catalog",
    nav_logout: "Log out",
    nav_settings: "Settings",
    nav_profile: "My Profile",

    // Common
    btn_validate: "Validate",
    btn_cancel: "Cancel",
    btn_reset: "Reset",
    btn_close: "Close",
    btn_delete: "Delete",
    btn_edit: "Edit",
    btn_save: "Save",
    btn_back: "Back",
    btn_copy: "Copy",
    btn_manage: "Manage",

    // Roles
    role_manager: "MANAGER",
    role_guest: "GUEST",

    // Time
    time_ago_mins: "{mins} min ago",
    time_ago_hrs: "{hrs}h ago",
    time_ago_dayplus: "More than 24h",

    // Settings
    settings_title: "Settings",
    settings_advanced: "Advanced Configuration",
    settings_personalize: "Customize Restaurant",
    settings_personalize_desc: "Team, Printer, Storage...",
    settings_change_pin: "Change my PIN code",
    settings_pin_desc: "This code allows you to log in to the application. Choose 4 easy-to-remember digits.",
    settings_new_pin: "New PIN code",
    settings_confirm_pin: "Confirmation",
    settings_about: "About",
    settings_language: "Language",

    // About
    about_version: "Version",
    about_author: "Created by",
    about_free: "This application is 100% free",
    about_license: "Open Source License",
    about_tech: "Technologies",
    about_updated: "Last updated on",
    about_support: "Support / Contact",
    about_whats_new: "What's new",

    // Identity Tab
    identity_base_info: "Base Information",
    identity_resto_name: "Establishment Name",
    identity_city: "City / Sector",
    identity_monogram_text: "Specific Text (Monogram)",
    identity_auto_value: "Automatic Value",
    identity_monogram_hint: "Leave empty to use the name's initial automatically.",
    identity_design_lab: "Direct Design Studio",
    identity_design_lab_desc: "Real-time interactive editing",
    identity_header_preview: "Header Preview",
    identity_edit_monogram: "Edit monogram",
    identity_palette_predefined: "Predefined Palettes",
    identity_primary_color: "Primary Color (Action)",
    identity_secondary_color: "Secondary Color (Accent)",
    identity_ui_colors: "Interface Colors",
    identity_active_valid: "Valid & Active",
    identity_accent_shade: "Accent shade",
    identity_style_signature: "Signature Style",
    identity_shape_round: "Circle",
    identity_shape_square: "Square",
    identity_shape_free: "Free",
    identity_bg: "Background",
    identity_content: "Content",
    identity_brand_icon: "Brand Icon",

    // Dashboard
    dashboard_good_morning: "Good morning",
    dashboard_good_evening: "Good evening",
    dashboard_mobile_btn: "Mobile",
    dashboard_download_zip: "Download ZIP",
    dashboard_day_progress: "Day Progress",
    dashboard_tasks_planned: "Tasks planned",
    dashboard_tasks_remaining: "Tasks remaining",
    dashboard_last_action: "Last action",
    dashboard_last_temp: "Last Cold Reading",
    dashboard_lots_count: "{count} lot(s)",
    dashboard_openings_count: "{count} op.",
    dashboard_readings_count: "{count} reading(s)",
    dashboard_tasks_count: "{count} task(s)",
    dashboard_bins_count: "{count} bin(s)",
    dashboard_products_count: "{count} prd.",

    // Status
    status_up_to_date: "Up to date",
    status_pending: "Pending",
    status_done: "Done",
    status_to_do: "To do",
    status_connected: "Connected",

    // Warnings
    warning_ios_storage: "Your data might be deleted by iOS. Remember to regularly export your HACCP PDF.",
    warning_storage_full: "Storage almost full. Perform a monthly archive to free up space.",

    // Mobile Collection
    mobile_sync_active: "Active sessions",
    mobile_sync_create: "Create session",
    mobile_sync_manual: "Manual Import",
    mobile_sync_none: "No active sessions.",
    mobile_sync_waiting: "Waiting",
    mobile_sync_uploaded: "Archive received",
    mobile_sync_imported: "Imported",
    mobile_sync_preview: "Preview",
    mobile_sync_delete: "Delete session",

    // Mobile App
    mobile_app_syncing: "Syncing in progress",
    mobile_app_sync_desc: "Retrieving iPad configurations...",
    mobile_app_setup_desc: "Enter your first and last name. They will be associated with all your entries from this phone.",
    mobile_app_start_btn: "Start entry",
    mobile_app_exit_btn: "Cancel and Exit",
    mobile_app_mode: "Collection Mode",
    mobile_app_allowed_modules: "Allowed modules",
    mobile_app_ready_export: "Ready to export",
    mobile_app_elements_count: "{count} element(s) entered",
    mobile_app_sent_success: "Successfully sent to iPad",
    mobile_app_resend: "Resend to iPad",
    mobile_app_manual_download: "In case: Download manually (ZIP)",
    mobile_app_clear_device: "Clear device",
    mobile_app_sending: "Sending...",
    mobile_app_send_btn: "Send to iPad",

    // Errors
    err_pin_length: "PIN code must be 4 digits.",
    err_pin_mismatch: "Codes do not match.",
    err_generic: "An error occurred.",
  }
};

type TranslationKey = keyof typeof translations.fr;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, any>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>(() => {
    return getStoredData<Language>('app_language', 'fr');
  });

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    setStoredData('app_language', lang);
  };

  const t = (key: TranslationKey, params?: Record<string, any>): string => {
    let text = translations[language][key] || translations.fr[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
