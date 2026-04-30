import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, Input, Select } from '../components/ui/LightUI';
import { ProductDef } from '../types';
import { getStoredData, setStoredData } from '../lib/db';
import { Trash2, Edit2, Download, Upload, Check, X, Search, Plus, Save, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { styleBoutonPrimaire } from '../lib/utils';
import { getIconeCategorie, CATEGORIES_CONFIG } from '../lib/categoriesIcones';

import { getMergedProducts } from '../lib/croustyConfig';
import { useCatalogue } from '../providers/CatalogueProvider';

export default function ProductManager() {
  const { config, updateConfig } = useConfig();
  const { produits, setProduits } = useCatalogue();
  
  const [recherche, setRecherche] = useState("");
  const [categorieActive, setCategorieActive] = useState("Tous");
  const [tri, setTri] = useState<"nom" | "dlc" | "categorie">("nom");
  const [vue, setVue] = useState<"grille" | "liste">("grille");
  const [produitEnEdition, setProduitEnEdition] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const estManager = currentUser?.role === "manager";

  const saveProducts = (updated: ProductDef[]) => {
    // Update both context and catalog provider
    setProduits(updated);
    updateConfig({ produits: updated });
  };

  const updateProduit = (id: string, updates: Partial<ProductDef>) => {
    saveProducts(produits.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduit = (id: string) => {
    saveProducts(produits.filter(p => p.id !== id));
  };

  const currentCats = useMemo(() => {
    const all = produits.map(p => p.category || "Non catégorisé");
    return ["Tous", ...Array.from(new Set(all))];
  }, [produits]);

  const produitsFiltres = useMemo(() => {
    return produits
      .filter(p => {
        const matchRecherche = (p.name || "").toLowerCase().includes((recherche || "").toLowerCase());
        const matchCategorie = categorieActive === "Tous" 
          ? true 
          : (p.category || "Non catégorisé") === categorieActive;
        return matchRecherche && matchCategorie;
      })
      .sort((a, b) => {
        if (tri === "nom") return (a.name || "").localeCompare(b.name || "", 'fr', { sensitivity: 'base' });
        if (tri === "categorie") {
           const catA = (a.category || "Non catégorisé");
           const catB = (b.category || "Non catégorisé");
           if (catA !== catB) return catA.localeCompare(catB, 'fr', { sensitivity: 'base' });
           return (a.name || "").localeCompare(b.name || "", 'fr', { sensitivity: 'base' });
        }
        if (tri === "dlc") {
          const aHours = a.dlcUnit === 'days' ? a.dlcValue * 24 : a.dlcUnit === 'mois' ? a.dlcValue * 720 : a.dlcValue;
          const bHours = b.dlcUnit === 'days' ? b.dlcValue * 24 : b.dlcUnit === 'mois' ? b.dlcValue * 720 : b.dlcValue;
          if (aHours !== bHours) return aHours - bHours;
          return (a.name || "").localeCompare(b.name || "", 'fr', { sensitivity: 'base' });
        }
        return 0;
      });
  }, [produits, recherche, categorieActive, tri]);

  const creerNouveau = () => {
    const newId = Date.now().toString();
    saveProducts([{
      id: newId,
      name: "",
      category: categorieActive !== "Tous" ? categorieActive : "Desserts",
      dlcValue: 24,
      dlcUnit: "hours"
    }, ...produits]);
    setProduitEnEdition(newId);
    setVue("liste"); // Switch to list view for easier row-level creation
  };

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="pt-8 pb-32 px-4 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
          📦 Catalogue DLC
        </h2>
      </div>

      {/* Barre de recherche */}
      <div style={{ position: "relative", marginBottom: "12px" }}>
        <span style={{
          position: "absolute", left: "12px", top: "50%",
          transform: "translateY(-50%)", color: "#9CA3AF"
        }}><Search size={20} /></span>
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          style={{
            width: "100%", height: "48px",
            paddingLeft: "42px", paddingRight: "42px",
            borderRadius: "12px",
            border: "2px solid #F3F4F6",
            fontSize: "16px", background: "#F9FAFB", outline: "none", fontWeight: "bold"
          }}
        />
        {recherche && (
          <button
            onClick={() => setRecherche("")}
            style={{
              position: "absolute", right: "12px", top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none",
              color: "#9CA3AF", fontSize: "16px", cursor: "pointer"
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Chips list */}
      <div style={{
        display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px",
        marginBottom: "12px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch"
      }}>
        {currentCats.map(cat => (
          <button
            key={cat}
            onClick={() => setCategorieActive(cat)}
            style={{
              flexShrink: 0, padding: "8px 16px", borderRadius: "20px", border: "2px solid",
              borderColor: categorieActive === cat ? "var(--color-primary)" : "#E5E7EB",
              background: categorieActive === cat ? "var(--color-primary)" : "white",
              color: categorieActive === cat ? "white" : "#374151",
              fontWeight: categorieActive === cat ? "bold" : "normal",
              fontSize: "14px", whiteSpace: "nowrap"
            }}
          >
            {cat === "Tous" ? `Tous (${produits.length})` : cat}
          </button>
        ))}
      </div>

      {/* Tri and View Switch */}
      <div className="flex items-center justify-between mb-4">
        <select
          value={tri}
          onChange={e => setTri(e.target.value as any)}
          style={{
            height: "40px", borderRadius: "10px",
            border: "2px solid #E5E7EB", background: "white",
            fontSize: "14px", padding: "0 12px", fontWeight: "bold",
            color: "#4B5563", outline: "none"
          }}
        >
          <option value="nom">Trier par : Nom A→Z</option>
          <option value="dlc">Trier par : DLC Courte</option>
          <option value="categorie">Trier par : Catégorie</option>
        </select>
        <div className="flex bg-white rounded-lg border-2 border-gray-100 p-1 gap-1">
          <button 
            onClick={() => setVue('grille')}
            className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-lg transition-colors ${vue === 'grille' ? 'bg-[#FF2A9D] text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            ⊞
          </button>
          <button 
            onClick={() => setVue('liste')}
            className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-lg transition-colors ${vue === 'liste' ? 'bg-[#FF2A9D] text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Empty State */}
      {produitsFiltres.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <p className="text-6xl mb-4">🔍</p>
          <p className="font-black text-gray-800 text-xl">
            {recherche ? `Aucun résultat pour "${recherche}"` : "Catalogue vide"}
          </p>
          {estManager && !recherche && (
            <p className="text-gray-400 font-bold mt-2">Commencez par ajouter votre premier produit.</p>
          )}
        </div>
      )}

      {/* Grid View */}
      {vue === 'grille' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {produitsFiltres.map((p, index) => (
            <div 
              key={p.id} 
              className="animate-card-in" 
              style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
            >
              <CarteProduit
                produit={p}
                enEdition={produitEnEdition === p.id}
                canEdit={estManager}
                onEditer={() => estManager && setProduitEnEdition(p.id)}
                onFermer={() => setProduitEnEdition(null)}
                onSauvegarder={(data: any) => { updateProduit(p.id, data); setProduitEnEdition(null); }}
                onSupprimer={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setConfirmDelete(p.id);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {vue === 'liste' && (
        <div className="flex flex-col gap-2">
          {produitsFiltres.map((p, index) => (
            <div 
              key={p.id} 
              className="animate-card-in" 
              style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
            >
              <LigneProduit
                produit={p}
                enEdition={produitEnEdition === p.id}
                canEdit={estManager}
                onEditer={(e: React.MouseEvent) => { e.stopPropagation(); estManager && setProduitEnEdition(p.id); }}
                onFermer={() => setProduitEnEdition(null)}
                onSauvegarder={(data: any) => { updateProduit(p.id, data); setProduitEnEdition(null); }}
                onSupprimer={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setConfirmDelete(p.id);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 text-center mb-2">Supprimer le produit ?</h3>
            <p className="text-gray-500 text-center font-medium mb-6">
              Voulez-vous vraiment supprimer <span className="font-bold text-gray-800">"{produits.find(p => p.id === confirmDelete)?.name}"</span> ? cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-12 bg-gray-100 text-gray-600 rounded-xl font-bold active:scale-95 transition-transform"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  deleteProduit(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="flex-1 h-12 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-transform"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Action Button */}
      {estManager && createPortal(
        <button
          onClick={creerNouveau}
          className="fixed bottom-[100px] right-6 w-16 h-16 rounded-full shadow-lg shadow-[#FF2A9D]/30 flex items-center justify-center text-white active:scale-95 transition-all z-[300]"
          style={{ background: "var(--color-primary)" }}
        >
          <Plus size={32} />
        </button>,
        document.body
      )}
    </div>
  );
}

// Subcomponents

function EditorForm({ prefill, onSave, onFermer, isGrid }: any) {
  const [name, setName] = useState(prefill.name || "");
  const [cat, setCat] = useState(prefill.category || "Desserts");
  const [val, setVal] = useState(prefill.dlcValue || 24);
  const [unit, setUnit] = useState(prefill.dlcUnit || "hours");

  const save = () => {
    if(!name.trim() || !val) return;
    onSave({ name, category: cat, dlcValue: Number(val), dlcUnit: unit });
  };

  const categories = Object.keys(CATEGORIES_CONFIG);

  return (
    <div 
      className="space-y-5 relative" 
      style={isGrid ? {
        gridColumn: "span 2",
        width: "100%",
        padding: "20px",
        borderRadius: "16px",
        border: "2px solid var(--color-primary)",
        background: "white",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)"
      } : {
        width: "100%",
        padding: "20px",
        borderRadius: "16px",
        border: "2px solid var(--color-primary)",
        background: "white",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)"
      }}
    >
      <h3 className="font-black text-xl text-gray-800 tracking-tight">
        {prefill.name ? "Modifier le produit" : "Nouveau produit"}
      </h3>
      
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nom du produit</label>
        <Input placeholder="Ex: Tiramisu" value={name} onChange={(e: any) => setName(e.target.value)} className="font-black text-lg h-14" />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Catégorie</label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {categories.map((c) => {
            const conf = CATEGORIES_CONFIG[c as keyof typeof CATEGORIES_CONFIG];
            const IconCmp = conf.icone;
            const isSelected = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer h-16 ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              >
                <IconCmp size={24} color={isSelected ? 'var(--color-primary)' : conf.couleur} className="mb-1" />
                <span className={`text-[8px] font-bold text-center leading-tight ${isSelected ? 'text-[var(--color-primary)]' : 'text-gray-500'}`}>{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Valeur DLC</label>
        <div className="flex gap-3">
          <Input type="number" min="1" value={val} onChange={(e: any) => setVal(e.target.value)} className="w-1/2 font-black text-lg h-14" />
          <Select value={unit} onChange={(e: any) => setUnit(e.target.value)} className="w-1/2 font-black text-lg h-14">
            <option value="hours">Heures</option>
            <option value="days">Jours</option>
            <option value="mois">Mois</option>
          </Select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
         <button onClick={onFermer} className="flex-1 h-14 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-200 active:scale-95 transition-transform">Annuler</button>
         <button onClick={save} disabled={!name} className="flex-1 h-14 text-white rounded-xl font-bold uppercase tracking-widest text-sm disabled:opacity-50 active:scale-95 transition-transform shadow-lg shadow-[var(--color-primary)]/30" style={{ background: "var(--color-primary)" }}>OK</button>
      </div>
    </div>
  );
}

function CarteProduit({ produit, enEdition, canEdit, onEditer, onFermer, onSauvegarder, onSupprimer }: any) {
  if (enEdition) {
    return <EditorForm prefill={produit} onSave={onSauvegarder} onFermer={onFermer} isGrid={true} />;
  }
  
  const dlcText = `+${produit.dlcValue}${['days', 'jours'].includes(produit.dlcUnit) ? 'j' : produit.dlcUnit === 'mois' ? 'm' : 'h'}`;
  const conf = getIconeCategorie(produit.category || "Non catégorisé");
  const IconCmp = conf.icone;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative group flex flex-col h-full active:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-4">
         <div className="w-12 h-12 rounded-full flex items-center justify-center opacity-90 shadow-sm shrink-0" style={{ backgroundColor: `${conf.couleur}15`, color: conf.couleur }}>
            <IconCmp size={24} />
         </div>
      </div>
      
      <div className="mt-auto">
        <h3 className="font-black text-gray-800 text-lg leading-tight mb-1">{produit.name || "Nouveau"}</h3>
        <p className="text-xs text-gray-400 font-bold uppercase mb-3 truncate">{produit.category || "Non catégorisé"}</p>
        {(produit.conservation || produit.note) && (
          <div className="mb-3">
            {produit.conservation && <p className="text-[10px] text-gray-500 font-bold uppercase">❄️ {produit.conservation}</p>}
            {produit.note && <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{produit.note}</p>}
          </div>
        )}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm font-black w-auto">
           <Clock size={14} className="opacity-70"/> {dlcText}
        </div>
      </div>
      
      {canEdit && (
         <div className="absolute top-2 right-2 flex gap-1 z-10" onClick={e => e.stopPropagation()}>
           <button 
              type="button"
              onClick={onEditer} 
              className="w-11 h-11 flex items-center justify-center bg-white shadow-sm border border-gray-100 rounded-xl text-[var(--color-primary)] active:scale-95 transition-transform" 
              aria-label="Modifier" 
              style={{ minWidth: 44, minHeight: 44, pointerEvents: 'auto' }}
            >
             <Edit2 size={18} />
           </button>
           <button 
              type="button"
              onClick={onSupprimer} 
              className="w-11 h-11 flex items-center justify-center bg-white shadow-sm border border-gray-100 rounded-xl text-red-500 active:scale-95 transition-transform" 
              aria-label="Supprimer" 
              style={{ minWidth: 44, minHeight: 44, pointerEvents: 'auto' }}
            >
             <Trash2 size={18} />
           </button>
         </div>
      )}
    </div>
  );
}

function LigneProduit({ produit, enEdition, canEdit, onEditer, onFermer, onSauvegarder, onSupprimer }: any) {
  if (enEdition) {
    return <EditorForm prefill={produit} onSave={onSauvegarder} onFermer={onFermer} isGrid={false} />;
  }

  const dlcText = `+${produit.dlcValue}${['days', 'jours'].includes(produit.dlcUnit) ? 'j' : produit.dlcUnit === 'mois' ? 'm' : 'h'}`;
  const conf = getIconeCategorie(produit.category || "Non catégorisé");
  const IconCmp = conf.icone;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${conf.couleur}15`, color: conf.couleur }}>
        <IconCmp size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-gray-800 text-lg truncate">{produit.name || "Nouveau"}</h3>
        <p className="text-xs text-gray-400 font-bold uppercase truncate">
          {produit.category || "Non catégorisé"}
          {produit.conservation && <span className="ml-2 text-gray-500">· ❄️ {produit.conservation}</span>}
          {produit.note && <span className="ml-2 text-gray-400 normal-case font-normal hidden sm:inline">({produit.note})</span>}
        </p>
      </div>
      <div className="px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 font-black whitespace-nowrap">
        {dlcText}
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
          <button 
            type="button"
            onClick={onEditer} 
            aria-label="Modifier" 
            style={{ minWidth: 44, minHeight: 44, pointerEvents: 'auto' }} 
            className="w-11 h-11 flex items-center justify-center text-[var(--color-primary)] active:bg-gray-100 bg-gray-50 rounded-xl transition-colors"
          >
            <Edit2 size={20} />
          </button>
          <button 
            type="button"
            onClick={onSupprimer} 
            aria-label="Supprimer" 
            style={{ minWidth: 44, minHeight: 44, pointerEvents: 'auto' }} 
            className="w-11 h-11 flex items-center justify-center text-red-500 active:bg-gray-100 bg-gray-50 rounded-xl transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
