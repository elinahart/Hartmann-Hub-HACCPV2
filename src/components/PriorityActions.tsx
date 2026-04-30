import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getStoredData, setStoredData } from '../lib/db';
import { createSignature } from '../lib/permissions';
import { styleBoutonPrimaire } from '../lib/utils';
import { ArrowLeft, Clock, Trash2, Flame, AlertTriangle, Thermometer, Sparkles, Tag, ChevronRight, AlertCircle, CheckCircle2, ClipboardList } from 'lucide-react';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import TemperaturesChecklist from '../modules/TemperaturesChecklist';
import { useConfig } from '../contexts/ConfigContext';

// Types
export interface ActionPrioritaire {
  id: string;
  module: string;
  niveau: "critique" | "urgent" | "info";
  label: string;
  icon?: React.ReactNode;
  donnees: any;
}

export interface EtatApp {
  cuves: { id: string | number; nom: string; valeur: number }[];
  temp: { matinFait: boolean; soirFait: boolean };
  etiquettes: { id: string; produit: string; expirée: boolean; dateExpiration: string }[];
  cuisson: { faitAujourdhui: boolean };
  nettoyage: { complet: boolean };
}

// Composant Modal Générique
export function Modal({ isOpen, onClose, titre, icon, children }: { isOpen: boolean, onClose: () => void, titre: string, icon?: React.ReactNode, children: React.ReactNode }) {
  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Overlay sombre par dessus TOUT including sidebar */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 300,
          backdropFilter: "blur(2px)",
          animation: "fadeIn 0.2s ease"
        }}
      />

      {/* Modale centrée */}
      <div style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(560px, 90vw)",
        maxHeight: "80vh",
        background: "white",
        borderRadius: "20px",
        zIndex: 301,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        animation: "popIn 0.25s ease"
      }}>

        {/* Header fixe */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #F3F4F6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0
        }}>
          <h3 style={{ fontWeight: "900", fontSize: "18px", margin: 0, color: "var(--crousty-dark)", display: "flex", alignItems: "center", gap: "8px" }}>
            {icon && <span style={{ color: "#DC2626" }}>{icon}</span>}
            {titre}
          </h3>
          <button onClick={onClose} style={{
            width: "32px", height: "32px",
            borderRadius: "50%",
            background: "#F3F4F6",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6B7280"
          }}>
            ✕
          </button>
        </div>

        {/* Contenu scrollable */}
        <div style={{
          overflowY: "auto",
          padding: "20px",
          flex: 1,
          overscrollBehavior: "contain"
        }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

// Modale Huiles
function ModaleHuiles({ donnees, onClose, currentUser, onSaveSuccess }: any) {
  const { aChanger, aSurveiller } = donnees;
  const toutesLesCuves = [...aChanger, ...aSurveiller];
  const [cuveActive, setCuveActive] = useState(0);
  const [valeurs, setValeurs] = useState<Record<string, { entier: string; decimal: string }>>({});
  const [huilesChangees, setHuilesChangees] = useState<Record<string, boolean>>({});
  const [responsable, setResponsable] = useState(currentUser?.initiales || "");
  const [membres, setMembres] = useState<any[]>([]);

  useEffect(() => {
    const users = getStoredData<any[]>('crousty_users', []);
    setMembres(users);
  }, []);
  
  const cuve = toutesLesCuves[cuveActive];
  const estAChanger = aChanger.some((c: any) => c.id === cuve?.id);

  const handleEnregistrer = () => {
    const currentOils = getStoredData<any[]>('crousty_oil_checklist', []);
    const now = new Date();
    
    // Créer une nouvelle entrée pour mémoriser ces actions
    const newEntry: any = {
      id: Date.now().toString(),
      date: now.toISOString(),
      cuves: {
        1: { testValue: '', temperature: '' },
        2: { testValue: '', temperature: '' },
        3: { testValue: '', temperature: '' },
        4: { testValue: '', temperature: '' },
      },
      changed: false,
      actionsCorrectives: '',
      responsable: responsable,
      signature: createSignature(currentUser || { name: 'Inconnu', pin: '0000', id: '0' } as any)
    };

    let hasChanges = false;
    let madeChange = false;

    toutesLesCuves.forEach((c: any) => {
      const v = valeurs[c.id];
      if (v?.entier || huilesChangees[c.id]) {
        hasChanges = true;
        const val = v?.entier ? parseFloat(`${v.entier}.${v.decimal || "0"}`).toString() : c.valeur.toString();
        
        newEntry.cuves[c.id as 1|2|3|4] = {
          testValue: val,
          temperature: ''
        };
        
        if (huilesChangees[c.id]) {
           madeChange = true;
           newEntry.changed = true;
           newEntry.actionsCorrectives += `Changement d'huile cuve ${c.id}. `;
        }
      }
    });

    if (hasChanges) {
      const updated = [newEntry, ...currentOils];
      setStoredData('crousty_oil_checklist', updated);
      onSaveSuccess();
    }
    onClose();
  };

  const toutesTraitees = toutesLesCuves.every(
    (c: any) => valeurs[c.id]?.entier
  );
  const peutValider = toutesTraitees && responsable;

  return (
    <div>
      {/* Tabs si plusieurs cuves */}
      {toutesLesCuves.length > 1 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {toutesLesCuves.map((c: any, i: number) => (
            <button
              key={c.id}
              onClick={() => setCuveActive(i)}
              style={{
                flex: 1, height: "40px", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                border: cuveActive === i ? "none" : "2px solid #E5E7EB",
                background: cuveActive === i
                  ? (aChanger.some((x: any) => x.id === c.id) ? "#FEE2E2" : "#FEF3C7")
                  : "white",
                fontWeight: cuveActive === i ? "bold" : "normal",
                fontSize: "14px",
                whiteSpace: "nowrap"
              }}
            >
              {c.nom} {aChanger.some((x: any) => x.id === c.id) ? <AlertCircle size={14} className="text-red-500" /> : <AlertTriangle size={14} className="text-yellow-500" />}
              {valeurs[c.id]?.entier ? <CheckCircle2 size={14} className="text-green-500" /> : ""}
            </button>
          ))}
        </div>
      )}

      {/* Contenu cuve active */}
      {cuve && (
        <div style={{
          background: estAChanger ? "#FFF5F5" : "#FFFBEB",
          borderRadius: "12px", padding: "16px",
          marginBottom: "16px",
          border: `1px solid ${estAChanger ? '#FECACA' : '#FDE68A'}`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontWeight: "900", fontSize: "16px" }}>{cuve.nom}</span>
            <span style={{ color: estAChanger ? "#DC2626" : "#D97706", fontWeight: "900", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
              {estAChanger ? <><AlertCircle size={16} /> CHANGER</> : <><AlertTriangle size={16} /> SURVEILLER</>} ({cuve.valeur}%)
            </span>
          </div>

          {/* Checkbox huile changée */}
          {estAChanger && (
            <label style={{ display: "flex", alignItems: "center",
                            gap: "12px", marginBottom: "16px",
                            background: huilesChangees[cuve.id] ? "#DCFCE7" : "white", 
                            padding: "12px", borderRadius: "8px", cursor: "pointer", 
                            border: `2px solid ${huilesChangees[cuve.id] ? '#16A34A' : '#E5E7EB'}` }}>
              <input
                type="checkbox"
                checked={huilesChangees[cuve.id] || false}
                onChange={e => setHuilesChangees(prev => ({
                  ...prev, [cuve.id]: e.target.checked
                }))}
                style={{ width: "24px", height: "24px", accentColor: "#16A34A" }}
              />
              <span style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={18} className={huilesChangees[cuve.id] ? "text-green-600" : "text-gray-300"} /> J'ai changé l'huile
              </span>
            </label>
          )}

          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "8px", fontWeight: "bold" }}>
             {estAChanger ? "Nouvelle valeur après changement :" : "Nouvelle mesure :"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="number" inputMode="numeric"
              placeholder="--" min="0" max="40"
              value={valeurs[cuve.id]?.entier || ""}
              onChange={e => setValeurs(p => ({
                ...p, [cuve.id]: {
                  ...p[cuve.id], entier: e.target.value
                }
              }))}
              style={{
                width: "80px", fontSize: "32px", fontWeight: "900",
                textAlign: "center", height: "56px",
                borderRadius: "8px",
                border: "2px solid #E5E7EB"
              }}
            />
            <span style={{ fontSize: "24px", fontWeight: "bold" }}>.</span>
            <input
              type="number" inputMode="numeric"
              placeholder="0" min="0" max="9"
              value={valeurs[cuve.id]?.decimal || ""}
              onChange={e => setValeurs(p => ({
                ...p, [cuve.id]: {
                  ...p[cuve.id], decimal: e.target.value
                }
              }))}
              style={{
                width: "64px", fontSize: "32px", fontWeight: "900",
                textAlign: "center", height: "56px",
                borderRadius: "8px",
                border: "2px solid #E5E7EB"
              }}
            />
            <span style={{ fontSize: "16px", color: "#6B7280", fontWeight: "bold" }}>% TPM</span>
          </div>
        </div>
      )}

      {/* Responsable */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "8px", fontWeight: "bold" }}>
          Responsable
        </p>
        <select
          value={responsable}
          onChange={e => setResponsable(e.target.value)}
          style={{
            width: "100%", height: "52px",
            borderRadius: "10px",
            border: "2px solid #E5E7EB",
            fontSize: "16px", padding: "0 12px",
            background: "white", fontWeight: "bold"
          }}
        >
          <option value="">Sélectionner...</option>
          {membres.map((m: any) => (
            <option key={m.id} value={m.initiales}>
              {m.initiales} — {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Boutons */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={onClose} style={{
          flex: 1, height: "52px", borderRadius: "16px",
          border: "2px solid #E5E7EB", background: "white",
          fontSize: "16px", fontWeight: "bold", color: "#4B5563"
        }}>
          Annuler
        </button>
        <button
          onClick={handleEnregistrer}
          disabled={!peutValider}
          style={styleBoutonPrimaire(!peutValider)}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// Modale Étiquettes
function ModaleEtiquettes({ donnees, onClose, onRefresh, currentUser }: any) {
  const { expirées } = donnees;
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [responsable, setResponsable] = useState(currentUser?.initiales || "");
  const [membres, setMembres] = useState<any[]>([]);

  useEffect(() => {
    const users = getStoredData<any[]>('crousty_users', []);
    if (users) setMembres(users);
  }, []);

  const total = expirées.length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const allChecked = checkedCount === total && total > 0;
  const peutValider = checkedCount > 0 && responsable;

  const handleToggle = (id: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [id]: checked }));
  };

  const handleToggleAll = (e: any) => {
    const isChecked = e.target.checked;
    const newObj: any = {};
    expirées.forEach((ex: any) => {
       newObj[ex.id] = isChecked;
    });
    setCheckedItems(newObj);
  };

  const handleConfirm = () => {
     const currentDesserts = getStoredData<any[]>('crousty_desserts', []);
     const updated = currentDesserts.filter(d => !checkedItems[d.id]);
     setStoredData('crousty_desserts', updated);
     if (onRefresh) onRefresh();
     onClose();
  };

  const getHoursExceeded = (dateString: string) => {
     const diffMs = new Date().getTime() - new Date(dateString).getTime();
     const h = Math.floor(diffMs / (1000 * 60 * 60));
     return h > 0 ? h : 0;
  };

  return (
    <div>
      <p style={{ fontSize: "14px", color: "#4B5563", marginBottom: "16px", fontWeight: "bold", lineHeight: "1.5" }}>
        Confirmez que ces produits ont été retirés et jetés.
      </p>

      <div style={{ marginBottom: "20px" }}>
        {expirées.map((e: any) => {
          const hours = getHoursExceeded(e.rawDate);
          return (
          <label key={e.id} style={{
            display: "flex", alignItems: "flex-start", gap: "12px",
            padding: "16px", borderRadius: "12px", marginBottom: "8px",
            background: checkedItems[e.id] ? "#F9FAFB" : "white",
            border: "1px solid", borderColor: checkedItems[e.id] ? "#E5E7EB" : "#F3F4F6",
            cursor: "pointer", transition: "all 0.2s"
          }}>
            <input
              type="checkbox"
              checked={checkedItems[e.id] || false}
              onChange={(evt) => handleToggle(e.id, evt.target.checked)}
              style={{ width: "22px", height: "22px", marginTop: "2px", accentColor: "#DC2626" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "900", color: checkedItems[e.id] ? "#9CA3AF" : "#111827", fontSize: "16px", transition: "color 0.2s" }}>{e.produit}</div>
              <div style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>
                Expiré le {e.dateExpiration}
              </div>
              <div style={{ color: "#DC2626", fontSize: "14px", fontWeight: "bold", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={16} /> DLC dépassée de {hours}h
              </div>
            </div>
          </label>
        );})}
      </div>

      <div style={{ borderTop: "2px solid #F3F4F6", borderBottom: "2px solid #F3F4F6", padding: "16px 0", marginBottom: "20px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={handleToggleAll}
            style={{ width: "22px", height: "22px", accentColor: "#111827" }}
          />
          <span style={{ fontWeight: "bold", fontSize: "16px", color: "#111827" }}>
            Tout cocher ({checkedCount}/{total})
          </span>
        </label>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "8px", fontWeight: "bold" }}>
          Responsable
        </p>
        <select
          value={responsable}
          onChange={e => setResponsable(e.target.value)}
          style={{
            width: "100%", height: "52px",
            borderRadius: "10px",
            border: "2px solid #E5E7EB",
            fontSize: "16px", padding: "0 12px",
            background: "white", fontWeight: "bold"
          }}
        >
          <option value="">Sélectionner...</option>
          {membres.map((m: any) => (
            <option key={m.id} value={m.initiales}>
              {m.initiales} — {m.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={onClose} style={{
          flex: 1, height: "52px", borderRadius: "16px",
          border: "2px solid #E5E7EB", background: "white",
          fontSize: "16px", fontWeight: "bold", color: "#4B5563"
        }}>
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          disabled={!peutValider}
          style={{...styleBoutonPrimaire(!peutValider), flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}
        >
          <CheckCircle2 size={20} /> Confirmer ({checkedCount}/{total})
        </button>
      </div>
    </div>
  );
}

// Modale Navigation
function ModaleNavigation({ destination, onClose, onNaviguer, children }: any) {
  return (
    <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
      <p style={{ color: "#4B5563", marginBottom: "24px", fontSize: "16px", lineHeight: "1.5", fontWeight: "bold" }}>
        {children || "Veuillez accéder au module complet pour finaliser cette tâche correctement."}
      </p>
      <button onClick={() => { onNaviguer(destination); onClose(); }}
        style={{...styleBoutonPrimaire(), width: "100%"}}
      >
        Ouvrir le module
      </button>
    </div>
  );
}

// Configuration dynamique par défaut des zones de températures
const ZONES_TEMPERATURE = [
  { id: 'Négatif', nom: 'NÉGATIF', type: 'negatif', seuilMax: -18 },
  { id: 'Positif', nom: 'POSITIF', type: 'positif', seuilMin: 0, seuilMax: 4 },
  { id: 'Frigo Cuisine', nom: 'FRIGO CUISINE', type: 'positif', seuilMin: 0, seuilMax: 4 },
  { id: 'Congèle Cuisine', nom: 'CONGÈLE CUISINE', type: 'negatif', seuilMax: -18 },
  { id: 'Saladette Sauces', nom: 'SALADETTE SAUCES', type: 'positif', seuilMin: 0, seuilMax: 4 },
  { id: 'Saladette Desserts', nom: 'SALADETTE DESSERTS', type: 'positif', seuilMin: 0, seuilMax: 4 },
  { id: 'Frigo Boisson 1', nom: 'FRIGO BOISSON 1', type: 'positif', seuilMin: 0, seuilMax: 8 },
  { id: 'Frigo Boisson DADA', nom: 'FRIGO BOISSON DADA', type: 'positif', seuilMin: 0, seuilMax: 8 }
];

function getStatutZone(valeur: number | null, zone: any) {
  if (valeur === null || isNaN(valeur)) return "vide";
  if (zone.type === "negatif" && valeur <= zone.seuilMax) return "conforme";
  if (zone.type === "positif" && valeur >= zone.seuilMin && valeur <= zone.seuilMax) return "conforme";
  return "horsNorme";
}

function ModaleReleveTemperatures({
  onClose,
  créneau,
  currentUser,
  onValider
}: any) {
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [actionCorrective, setActionCorrective] = useState("");
  const [responsable, setResponsable] = useState(currentUser?.initiales || "");
  const [membres, setMembres] = useState<any[]>([]);

  useEffect(() => {
    const users = getStoredData<any[]>('crousty_users', []);
    if (users) setMembres(users);
  }, []);

  const zonesHorsNorme = ZONES_TEMPERATURE.filter(z => {
    const vStr = valeurs[z.id];
    if (vStr === undefined || vStr === "") return false;
    const v = parseFloat(vStr.replace(',', '.'));
    return !isNaN(v) && getStatutZone(v, z) === "horsNorme";
  });

  const auMoinsUneValeur = Object.values(valeurs).some(v => {
    if (v === undefined || v === "") return false;
    return !isNaN(parseFloat(String(v).replace(',', '.')));
  });

  const peutValider = auMoinsUneValeur 
    && responsable 
    && (zonesHorsNorme.length === 0 || actionCorrective.trim() !== "");

  const handleValider = async () => {
    const currentTemp = getStoredData<any[]>('crousty_temp_checklist', []);
    
    const correctiveActions: Record<string, string> = {};
    zonesHorsNorme.forEach(z => {
      correctiveActions[z.id] = actionCorrective;
    });

    const equipementsPropres: Record<string, string> = {};
    Object.entries(valeurs).forEach(([k, v]) => {
      if (v !== undefined && v !== "") {
        equipementsPropres[k] = parseFloat(String(v).replace(',', '.')).toString();
      }
    });

    const membreObj = membres.find(m => m.initiales === responsable) || currentUser;

    const now = new Date();
    let computedDate = new Date();
    if (créneau === 'matin' && now.getHours() >= 15) {
      computedDate.setHours(11, 0, 0, 0);
    } else if (créneau === 'soir' && now.getHours() < 15) {
      computedDate.setHours(18, 0, 0, 0);
    }

    const newEntry = {
      id: Date.now().toString(),
      date: computedDate.toISOString(),
      equipments: equipementsPropres,
      correctiveActions,
      productTemperatures: {},
      globalObservation: "",
      responsable: membreObj?.name || responsable,
      signature: createSignature(membreObj)
    };

    setStoredData('crousty_temp_checklist', [newEntry, ...currentTemp]);
    
    // Fallback simple pour le toast
    alert(`✅ Relevé ${créneau} enregistré par ${membreObj?.initiales || responsable}`);

    if (onValider) onValider();
    if (onClose) onClose();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ 
        background: "#F3F4F6", padding: "12px 16px", borderRadius: "12px", 
        marginBottom: "8px", fontWeight: "bold", color: "#4B5563", fontSize: "14px",
        display: "flex", alignItems: "center", gap: "8px"
      }}>
        <Clock size={18} className="text-gray-500" />
        Créneau : {créneau === 'matin' ? 'MATIN (7h00 - 12h00)' : 'SOIR (17h00 - 23h00)'}
      </div>

      {ZONES_TEMPERATURE.map(zone => {
        const valStr = valeurs[zone.id] ?? "";
        let valNum: number | null = null;
        if (valStr !== "") {
          valNum = parseFloat(valStr.replace(',', '.'));
        }
        const statut = getStatutZone(valNum, zone);

        return (
          <div key={zone.id} style={{
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "6px",
            background: statut === "conforme"  ? "#F0FFF4"
                      : statut === "horsNorme" ? "#FFF5F5"
                      : "#F9FAFB",
            border: "1px solid",
            borderColor: statut === "conforme"  ? "#86EFAC"
                        : statut === "horsNorme" ? "#FECACA"
                        : "#F3F4F6"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px"
            }}>
              <div>
                <span style={{ fontWeight: "900", fontSize: "14px", color: statut === "horsNorme" ? "#991B1B" : "#111827" }}>
                  {zone.nom}
                </span>
                <span style={{
                  fontSize: "12px", color: "#6B7280", fontWeight: "bold",
                  marginLeft: "8px",
                  background: "#E5E7EB", padding: "2px 6px", borderRadius: "4px"
                }}>
                  {zone.type === "negatif"
                    ? `≤ ${zone.seuilMax}°C`
                    : `${zone.seuilMin} à ${zone.seuilMax}°C`}
                </span>
              </div>
              <span style={{ fontSize: "18px" }}>
                {statut === "conforme"  ? "✅"
               : statut === "horsNorme" ? "⚠️"
               : ""}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button 
                onClick={() => {
                  setValeurs(prev => {
                    const currentStr = prev[zone.id];
                    let currentVal = currentStr ? parseFloat(currentStr.replace(',', '.')) : 0;
                    if (isNaN(currentVal)) currentVal = 0;
                    return { ...prev, [zone.id]: (Math.round((currentVal - 1) * 10) / 10).toString() };
                  });
                }}
                style={{
                  width: "48px", height: "48px", borderRadius: "8px",
                  background: "#E5E7EB", color: "#4B5563", fontSize: "24px", fontWeight: "bold",
                  display: "flex", alignItems: "center", justifyContent: "center", border: "none",
                  cursor: "pointer", touchAction: "manipulation"
                }}>
                -
              </button>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="--"
                value={valStr}
                onChange={e => setValeurs(p => ({
                  ...p, [zone.id]: e.target.value
                }))}
                style={{
                  width: "100px", height: "48px",
                  fontSize: "24px", fontWeight: "900",
                  textAlign: "center", borderRadius: "8px",
                  border: "2px solid",
                  borderColor: statut === "horsNorme"
                    ? "#FECACA" : "#E5E7EB",
                  outline: "none",
                  color: statut === "horsNorme" ? "#DC2626" : "#111827",
                  background: "white"
                }}
              />
              <button 
                onClick={() => {
                  setValeurs(prev => {
                    const currentStr = prev[zone.id];
                    let currentVal = currentStr ? parseFloat(currentStr.replace(',', '.')) : 0;
                    if (isNaN(currentVal)) currentVal = 0;
                    return { ...prev, [zone.id]: (Math.round((currentVal + 1) * 10) / 10).toString() };
                  });
                }}
                style={{
                  width: "48px", height: "48px", borderRadius: "8px",
                  background: "#E5E7EB", color: "#4B5563", fontSize: "24px", fontWeight: "bold",
                  display: "flex", alignItems: "center", justifyContent: "center", border: "none",
                  cursor: "pointer", touchAction: "manipulation"
                }}>
                +
              </button>
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "#6B7280" }}>°C</span>
              {statut === "conforme" && <span style={{ marginLeft: "auto", fontWeight: "bold", color: "#16A34A", fontSize: "14px" }}>Conforme</span>}
            </div>
          </div>
        );
      })}

      {zonesHorsNorme.length > 0 && (
        <div style={{ marginTop: "12px", marginBottom: "8px" }}>
          <p style={{
            fontSize: "14px", fontWeight: "900",
            color: "#DC2626", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px"
          }}>
            <AlertCircle size={18} /> Action corrective obligatoire
          </p>
          <textarea
            placeholder="Ex: Frigo en panne, technicien appelé..."
            value={actionCorrective}
            onChange={e => setActionCorrective(e.target.value)}
            style={{
              width: "100%", minHeight: "80px",
              borderRadius: "10px", padding: "12px",
              border: "2px solid #FECACA",
              fontSize: "15px", resize: "none",
              background: "#FEF2F2", outline: "none", fontWeight: "bold"
            }}
          />
        </div>
      )}

      <div style={{ marginTop: "16px", marginBottom: "20px" }}>
        <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "8px", fontWeight: "bold" }}>
          Responsable
        </p>
        <select
          value={responsable}
          onChange={e => setResponsable(e.target.value)}
          style={{
            width: "100%", height: "52px",
            borderRadius: "10px",
            border: "2px solid #E5E7EB",
            fontSize: "16px", padding: "0 12px",
            background: "white", fontWeight: "bold"
          }}
        >
          <option value="">Sélectionner...</option>
          {membres.map((m: any) => (
            <option key={m.id} value={m.initiales}>
              {m.initiales} — {m.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={onClose} style={{
          flex: 1, height: "52px", borderRadius: "16px",
          border: "2px solid #E5E7EB", background: "white",
          fontSize: "16px", fontWeight: "bold", color: "#4B5563"
        }}>
          Annuler
        </button>
        <button
          onClick={handleValider}
          disabled={!peutValider}
          style={{...styleBoutonPrimaire(!peutValider), flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}
        >
          <CheckCircle2 size={20} /> Valider le relevé
        </button>
      </div>
    </div>
  );
}

// Logic Component
export function ActionPrioritaireList({ currentUser, onNavigate, onUpdateStats }: { currentUser: any, onNavigate: (view: string) => void, onUpdateStats: () => void }) {
  const [actions, setActions] = useState<ActionPrioritaire[]>([]);
  const [selectedAction, setSelectedAction] = useState<ActionPrioritaire | null>(null);
  const { config } = useConfig();

  const calculateEtat = (): EtatApp => {
    const now = new Date();
    const interval = { start: startOfDay(now), end: endOfDay(now) };

    // Cuves
    const oilEntries = getStoredData<any[]>('crousty_oil_checklist', []);
    const oilTodayEntries = oilEntries.filter((o: any) => isWithinInterval(new Date(o.date), interval))
                                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let cuves: any[] = [];
    if (oilTodayEntries.length > 0) {
      const latestOil = oilTodayEntries[0];
      [1, 2, 3, 4].forEach(num => {
         const valStr = latestOil.cuves?.[num]?.testValue;
         const val = parseFloat(valStr);
         if (!isNaN(val)) cuves.push({ id: num, nom: `Cuve ${num}`, valeur: val });
      });
    }

    // Temperatures
    const tempEntries = getStoredData<any[]>('crousty_temp_checklist', []);
    const tempsTodayEntries = tempEntries.filter((t: any) => isWithinInterval(new Date(t.date), interval));
    const matinFait = tempsTodayEntries.some(t => new Date(t.date).getHours() < 15);
    const soirFait = tempsTodayEntries.some(t => new Date(t.date).getHours() >= 15);

    // Etiquettes (Desserts)
    const dlcs = getStoredData<any[]>('crousty_desserts', []);
    let etiquettes: any[] = [];
    dlcs.forEach(d => {
      const isPast = new Date(d.dlcCalc) < now;
      if (isPast) {
        const dt = new Date(d.dlcCalc);
        const formattedDate = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')} à ${dt.getHours().toString().padStart(2, '0')}h${dt.getMinutes().toString().padStart(2, '0')}`;
        etiquettes.push({ id: d.id, produit: d.produitText || 'Produit', expirée: true, dateExpiration: formattedDate, rawDate: d.dlcCalc });
      }
    });

    // Cuisson
    const viandes = getStoredData<any[]>('crousty_viandes', []);
    const cuissonFait = viandes.filter((v: any) => isWithinInterval(new Date(v.date), interval)).length > 0;

    // Nettoyage
    const cleaning = getStoredData<any[]>('crousty_cleaning', []);
    const cleaningFait = cleaning.filter((c: any) => isWithinInterval(new Date(c.date), interval)).length > 0;

    return {
      cuves,
      temp: { matinFait, soirFait },
      etiquettes,
      cuisson: { faitAujourdhui: cuissonFait },
      nettoyage: { complet: cleaningFait }
    };
  };

  const calculerActions = (etat: EtatApp): ActionPrioritaire[] => {
    const list: ActionPrioritaire[] = [];
    const h = new Date().getHours();

    // HUILES
    const aChanger = etat.cuves.filter(c => c.valeur > 23);
    const aSurveiller = etat.cuves.filter(c => c.valeur >= 20 && c.valeur <= 23);

    if (aChanger.length > 0 || aSurveiller.length > 0) {
      const parties = [];
      if (aChanger.length) parties.push(`${aChanger.length} à changer`);
      if (aSurveiller.length) parties.push(`${aSurveiller.length} à surveiller`);
      list.push({
        id: "huiles", module: "huiles",
        niveau: aChanger.length > 0 ? "critique" : "urgent",
        label: `Huiles — ${parties.join(" · ")}`,
        icon: <Flame size={20} />,
        donnees: { aChanger, aSurveiller }
      });
    }

    // TEMPERATURES
    if (!etat.temp.matinFait && h >= 8) {
      list.push({
        id: "temp-matin", module: "temperatures",
        niveau: h >= 10 ? "critique" : "urgent",
        label: "Relevé températures matin en retard",
        icon: <Thermometer size={20} />,
        donnees: { créneau: "matin" }
      });
    }
    if (!etat.temp.soirFait && h >= 18) {
      list.push({
        id: "temp-soir", module: "temperatures",
        niveau: h >= 20 ? "critique" : "urgent",
        label: "Relevé températures soir en retard",
        icon: <Thermometer size={20} />,
        donnees: { créneau: "soir" }
      });
    }

    // ÉTIQUETTES
    const expirées = etat.etiquettes.filter(e => e.expirée);
    if (expirées.length > 0) {
      list.push({
        id: "etiquettes", module: "etiquettes", niveau: "urgent",
        label: `Vérifiez que les ${expirées.length} produits périmés ont bien été jetés`,
        icon: <Trash2 size={20} />,
        donnees: { expirées }
      });
    }

    // CUISSON
    if (!etat.cuisson.faitAujourdhui) {
      list.push({
        id: "cuisson", module: "viandes", niveau: "info",
        label: "Cuisson alimentaire en attente",
        icon: <Flame size={20} />,
        donnees: {}
      });
    }

    // NETTOYAGE
    if (!etat.nettoyage.complet && h >= 17) {
      list.push({
        id: "nettoyage", module: "cleaning", niveau: "info",
        label: "Plan de nettoyage à compléter",
        icon: <Sparkles size={20} />,
        donnees: {}
      });
    }

    // INVENTAIRE
    if (config.inventaire.rappelActif) {
      const nowInfo = new Date();
      let label = "Faire l'inventaire";
      let isLate = false;
      let inventoryNeededNow = false;

      const invEntries = getStoredData<any[]>('crousty_inventory', []);
      let lastRequiredDate = startOfDay(nowInfo);

      if (config.inventaire.frequence.toLowerCase() === 'quotidien') {
         lastRequiredDate = startOfDay(nowInfo);
         const inventoryDoneSince = invEntries.some((inv: any) => new Date(inv.date) >= lastRequiredDate);
         if (!inventoryDoneSince && h >= 8) {
           inventoryNeededNow = true;
           isLate = h >= 14;
           label = isLate ? "Inventaire quotidien en retard" : "Inventaire quotidien en attente";
         }
      } else if (config.inventaire.frequence.toLowerCase() === 'hebdomadaire') {
         const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
         const targetDayIdx = days.indexOf(config.inventaire.jourSemaine.toLowerCase());
         let lastTargetDay = new Date(nowInfo);
         lastTargetDay.setDate(nowInfo.getDate() - ((nowInfo.getDay() - targetDayIdx + 7) % 7));
         lastRequiredDate = startOfDay(lastTargetDay);
         
         const inventoryDoneSince = invEntries.some((inv: any) => new Date(inv.date) >= lastRequiredDate);
         if (!inventoryDoneSince) {
            inventoryNeededNow = true;
            // It's late if we are past the target day, or on the target day past 14h
            isLate = nowInfo.getTime() > lastRequiredDate.getTime() + (14 * 60 * 60 * 1000);
            label = isLate ? "Inventaire hebdomadaire en retard" : "Inventaire hebdomadaire en attente";
         }
      } else if (config.inventaire.frequence.toLowerCase() === 'mensuel') {
         const firstDayOfMonth = new Date(nowInfo.getFullYear(), nowInfo.getMonth(), 1);
         lastRequiredDate = startOfDay(firstDayOfMonth);
         
         const inventoryDoneSince = invEntries.some((inv: any) => new Date(inv.date) >= lastRequiredDate);
         if (!inventoryDoneSince) {
            inventoryNeededNow = true;
            isLate = nowInfo.getDate() > 1 || h >= 14;
            label = isLate ? "Inventaire mensuel en retard" : "Inventaire mensuel en attente";
         }
      }

      if (inventoryNeededNow) {
        let niveau = "info";
        if (isLate) niveau = "urgent";
        list.push({
          id: "inventaire", module: "inventaire", niveau: niveau as any,
          label: label,
          icon: <ClipboardList size={20} />,
          donnees: {}
        });
      }
    }

    return list
      .sort((a, b) => {
        const p = { critique: 0, urgent: 1, info: 2 };
        return p[a.niveau] - p[b.niveau];
      })
      .slice(0, 5);
  };

  const refreshActions = () => {
    const etat = calculateEtat();
    setActions(calculerActions(etat));
    if (onUpdateStats) onUpdateStats();
  };

  useEffect(() => {
    refreshActions();
    // Refresh toutes les minutes
    const interval = setInterval(refreshActions, 60000);
    return () => clearInterval(interval);
  }, []);

  if (actions.length === 0) return null;

  return (
    <>
      <div className="bg-white rounded-3xl p-5 mb-6 shadow-sm border border-gray-100">
        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-tight text-sm">
          <Flame size={18} className="text-crousty-pink" /> 
          Actions Prioritaires ({actions.length})
        </h2>
        
        <div className="flex flex-col gap-2">
          {actions.map((act) => {
            const isCrit = act.niveau === 'critique';
            const isUrg = act.niveau === 'urgent';
            return (
              <button
                key={act.id}
                onClick={() => setSelectedAction(act)}
                className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between border active:scale-[0.98] transition-transform
                  ${isCrit ? 'bg-[#FFF5F5] border-[#FECACA]' : isUrg ? 'bg-[#FFFBEB] border-[#FDE68A]' : 'bg-[#F3F4F6] border-[#E5E7EB]'}
                `}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`shrink-0 ${isCrit ? 'text-[#DC2626]' : isUrg ? 'text-[#D97706]' : 'text-gray-500'}`}>
                    {act.icon}
                  </div>
                  <span className={`font-black flex-1 pr-4 min-w-0 truncate ${isCrit ? 'text-[#DC2626]' : isUrg ? 'text-[#D97706]' : 'text-gray-700'}`}>
                    {act.label}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCrit ? 'bg-[#FEE2E2] text-[#DC2626]' : isUrg ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-gray-200 text-gray-600'}`}>
                    <ChevronRight size={18} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <Modal
        isOpen={!!selectedAction}
        onClose={() => setSelectedAction(null)}
        icon={selectedAction?.icon}
        titre={
          selectedAction?.module === "etiquettes" ? "Produits périmés — À jeter" : 
          selectedAction?.module === "temperatures" ? (selectedAction.donnees.créneau === "matin" ? `🌅 Relevé Matin` : `🌆 Relevé Soir`) : 
          (selectedAction?.label || "Action requise")
        }
      >
        {selectedAction?.module === "huiles" && (
          <ModaleHuiles 
            donnees={selectedAction.donnees} 
            onClose={() => setSelectedAction(null)} 
            currentUser={currentUser}
            onSaveSuccess={refreshActions}
          />
        )}
        
        {selectedAction?.module === "etiquettes" && (
          <ModaleEtiquettes 
            donnees={selectedAction.donnees} 
            onClose={() => setSelectedAction(null)} 
            onRefresh={refreshActions}
            currentUser={currentUser}
          />
        )}
        
        {selectedAction?.module === "temperatures" && (
           <ModaleReleveTemperatures 
             créneau={selectedAction.donnees.créneau}
             onClose={() => setSelectedAction(null)}
             currentUser={currentUser}
             onValider={refreshActions}
           />
        )}

        {(selectedAction?.module === "viandes" || selectedAction?.module === "cleaning" || selectedAction?.module === "inventaire") && (
          <ModaleNavigation 
            destination={selectedAction.module} 
            onClose={() => setSelectedAction(null)} 
            onNaviguer={onNavigate}
          >
            {selectedAction.module === "viandes" && "L'enregistrement des cuissons demande un passage en revue de toutes les viandes cuites."}
            {selectedAction.module === "cleaning" && "Le plan de nettoyage a besoin d'être validé tâche par tâche pour garantir l'hygiène du restaurant."}
            {selectedAction.module === "inventaire" && "Effectuez l'inventaire complet pour pouvoir l'exporter et l'envoyer au supérieur."}
          </ModaleNavigation>
        )}
      </Modal>
    </>
  );
}
