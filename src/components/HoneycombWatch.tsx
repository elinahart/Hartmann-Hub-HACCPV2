import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { getCouleurProfil } from '../lib/utils';
import { MembreEquipe } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { renderAvatarIcon } from './AvatarCustomizerModal';

interface Position { x: number; y: number; }

interface HoneycombWatchProps {
  membres: MembreEquipe[];
  onSelect: (membre: MembreEquipe) => void;
  animateEnter?: boolean;
}

const TAILLE_BASE = 72;
const TAILLE_MIN = 44;
const TAILLE_MAX = 92;
const COLS = 5;

const GAP_H = 28;
const GAP_V = 44;

const PAS_X = TAILLE_BASE + GAP_H; // 100
const PAS_Y = TAILLE_BASE + GAP_V; // 116
const DECALAGE = PAS_X / 2; // 50

export function HoneycombWatch({ membres, onSelect, animateEnter = false }: HoneycombWatchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<(HTMLDivElement | null)[]>([]);
  const offsetRef = useRef<Position>({ x: 0, y: 0 });
  const centreRef = useRef<Position>({ x: 0, y: 0 });
  const rafRef = useRef<number>();
  
  const [selectionVerrouille, setSelectionVerrouille] = useState(false);
  const selectionVerrouilleRef = useRef(false);
  
  const isDraggingRef = useRef(false);
  const touchStartTime = useRef(0);
  const startTouch = useRef<Position>({ x: 0, y: 0 });
  const startOffset = useRef<Position>({ x: 0, y: 0 });
  const lastTouch = useRef<Position>({ x: 0, y: 0 });
  const velocity = useRef<Position>({ x: 0, y: 0 });

  // Positions honeycomb
  const positions = useMemo(() =>
    membres.map((_, i) => {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      return {
        x: col * PAS_X + (row % 2 === 1 ? DECALAGE : 0),
        y: row * PAS_Y
      };
    }),
    [membres.length]
  );

  // Dimensions totales de la grille
  const totalLargeur = useMemo(() => {
    if (membres.length === 0) return 0;
    return (COLS - 1) * PAS_X + DECALAGE + TAILLE_BASE;
  }, [membres.length]);
  
  const totalHauteur = useMemo(() => {
    if (membres.length === 0) return 0;
    return (Math.ceil(membres.length / COLS) - 1) * PAS_Y + TAILLE_BASE;
  }, [membres.length]);

  // Update effect for selection lock state
  useEffect(() => {
    selectionVerrouilleRef.current = selectionVerrouille;
  }, [selectionVerrouille]);

  const getTaille = useCallback((pos: Position, currentOffset: Position) => {
    const cx = centreRef.current.x;
    const cy = centreRef.current.y;
    const ex = pos.x + currentOffset.x + cx - totalLargeur / 2 + TAILLE_BASE / 2;
    const ey = pos.y + currentOffset.y + cy - totalHauteur / 2 + TAILLE_BASE / 2;
    const dist = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
    const rayon = Math.sqrt(cx ** 2 + cy ** 2) * 0.6;
    const ratio = Math.pow(Math.max(0, 1 - dist / rayon), 0.5);
    return TAILLE_MIN + (TAILLE_MAX - TAILLE_MIN) * ratio;
  }, [totalLargeur, totalHauteur]);

  const updateBubbles = useCallback(() => {
    const currentOffset = offsetRef.current;
    const cx = centreRef.current.x;
    const cy = centreRef.current.y;
    
    membres.forEach((membre, i) => {
      const el = bubblesRef.current[i];
      if (!el) return;

      const pos = positions[i];
      const taille = getTaille(pos, currentOffset);

      const bx = pos.x + currentOffset.x + cx - totalLargeur / 2;
      const by = pos.y + currentOffset.y + cy - totalHauteur / 2;

      // GPU compositing transform
      const scale = taille / TAILLE_BASE;
      el.style.transform = `translate(${bx}px, ${by}px) scale(${scale})`;
      
      const zIndex = Math.round(taille);
      el.style.zIndex = String(zIndex);
      
      // Opacity scaling based on size
      if (!selectionVerrouilleRef.current) {
        el.style.opacity = taille < 50 ? String(0.4 + (taille - 44) / 60) : "1";
      }

      const nameEl = el.querySelector(".bubble-name") as HTMLElement;
      // Selecting all elements with .bubble-manager to show/hide crown + manager text
      const managerEls = el.querySelectorAll(".bubble-manager");
      
      if (nameEl) {
         // Inverse scale to keep text legible or rely on parent scale?
         // In this version, we let the parent scale handle the font sizes, but fade out small text.
         nameEl.style.opacity = taille > 55 ? "1" : "0";
         if (taille > 65) {
             nameEl.style.color = taille > 75 ? "#111827" : "#374151";
         } else {
             nameEl.style.color = "#9CA3AF";
         }
      }
      
      if (managerEls) {
         managerEls.forEach(managerEl => {
            (managerEl as HTMLElement).style.opacity = String(Math.max(0, (taille - 60) / 40));
         });
      }

    });
  }, [membres, positions, getTaille, totalLargeur, totalHauteur]);

  // Centre écran
  useEffect(() => {
    const updateCentre = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        centreRef.current = { x: r.width / 2, y: r.height / 2 };
        updateBubbles();
      }
    };
    // Ensure paint layout is ready
    setTimeout(updateCentre, 0);
    window.addEventListener("resize", updateCentre);
    return () => window.removeEventListener("resize", updateCentre);
  }, [updateBubbles]);

  const applyInertia = useCallback(() => {
    velocity.current.x *= 0.88;
    velocity.current.y *= 0.88;

    if (Math.abs(velocity.current.x) < 0.2 &&
        Math.abs(velocity.current.y) < 0.2) {
      rafRef.current = undefined;
      return;
    }

    offsetRef.current = {
      x: offsetRef.current.x + velocity.current.x,
      y: offsetRef.current.y + velocity.current.y
    };

    updateBubbles();

    rafRef.current = requestAnimationFrame(applyInertia);
  }, [updateBubbles]);

  const handleSelectLocal = useCallback((membre: MembreEquipe, i: number) => {
    if (selectionVerrouilleRef.current) return;
    setSelectionVerrouille(true);
    onSelect(membre);
    
    membres.forEach((m, idx) => {
       const el = bubblesRef.current[idx];
       if (!el) return;
       // We set box-shadow and style on the inner motion.div or the container itself
       if (idx === i) {
          el.style.transform += " scale(1.15)";
          // Select the first child (the motion.div inner wrap)
          const inner = el.firstElementChild as HTMLElement;
          if (inner) {
             inner.style.boxShadow = `0 0 0 3px white, 0 0 0 6px var(--color-primary), 0 8px 24px rgba(0,0,0,0.2)`;
          }
          el.style.zIndex = "1000";
       } else {
          el.style.opacity = "0.25";
          el.style.filter = "grayscale(60%)";
       }
    });
    
    setTimeout(() => {
      setSelectionVerrouille(false);
      membres.forEach((m, idx) => {
         const el = bubblesRef.current[idx];
         if (!el) return;
         const inner = el.firstElementChild as HTMLElement;
         if (inner) inner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
         el.style.filter = "none";
      });
      updateBubbles(); 
    }, 2000);
  }, [membres, onSelect, updateBubbles]);

  // Touch handlers (Passive: false for touchmove to allow e.preventDefault)
  const handleTouchStart = useCallback((e: TouchEvent | MouseEvent) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    touchStartTime.current = Date.now();
    startTouch.current = { x: clientX, y: clientY };
    startOffset.current = { ...offsetRef.current };
    lastTouch.current = { x: clientX, y: clientY };
    velocity.current = { x: 0, y: 0 };
    isDraggingRef.current = false;
    
    if (containerRef.current) {
        containerRef.current.style.cursor = "grabbing";
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (selectionVerrouilleRef.current) return;
    
    let clientX, clientY;
    if ('touches' in e) {
       clientX = e.touches[0].clientX;
       clientY = e.touches[0].clientY;
       if (e.cancelable) e.preventDefault();
    } else {
       if (!isDraggingRef.current && (e as MouseEvent).buttons !== 1) return;
       clientX = (e as MouseEvent).clientX;
       clientY = (e as MouseEvent).clientY;
    }

    const dx = clientX - startTouch.current.x;
    const dy = clientY - startTouch.current.y;
    if (!isDraggingRef.current && Math.sqrt(dx*dx + dy*dy) > 8) {
       isDraggingRef.current = true;
    }
    
    if ('touches' in e) isDraggingRef.current = true; // Touch drags immediately
    
    if (!isDraggingRef.current) return;

    velocity.current = {
      x: (clientX - lastTouch.current.x) * 0.6,
      y: (clientY - lastTouch.current.y) * 0.6
    };
    lastTouch.current = { x: clientX, y: clientY };
    
    offsetRef.current = {
      x: startOffset.current.x + dx,
      y: startOffset.current.y + dy
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateBubbles);
  }, [updateBubbles]);

  const handleTouchEnd = useCallback((e: TouchEvent | MouseEvent) => {
    if (selectionVerrouilleRef.current) return;
    
    if (containerRef.current) {
        containerRef.current.style.cursor = "grab";
    }
    
    const dur = Date.now() - touchStartTime.current;
    
    let clientX, clientY;
    if ('changedTouches' in e) {
       clientX = e.changedTouches[0].clientX;
       clientY = e.changedTouches[0].clientY;
    } else {
       clientX = (e as MouseEvent).clientX;
       clientY = (e as MouseEvent).clientY;
    }

    const dx = clientX - startTouch.current.x;
    const dy = clientY - startTouch.current.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dur < 250 && dist < 12 && !isDraggingRef.current) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const tx = clientX - rect.left;
      const ty = clientY - rect.top;

      for (let i = 0; i < membres.length; i++) {
        const pos = positions[i];
        const taille = getTaille(pos, offsetRef.current);
        const bx = pos.x + offsetRef.current.x + centreRef.current.x - totalLargeur/2 + TAILLE_BASE/2;
        const by = pos.y + offsetRef.current.y + centreRef.current.y - totalHauteur/2 + TAILLE_BASE/2;
        const d = Math.sqrt(Math.pow(tx - bx, 2) + Math.pow(ty - by, 2));
        
        if (d <= taille/2 + 8) {
          handleSelectLocal(membres[i], i);
          return;
        }
      }
      return;
    }

    if (isDraggingRef.current) {
        rafRef.current = requestAnimationFrame(applyInertia);
    }
    isDraggingRef.current = false;
  }, [membres, positions, getTaille, totalLargeur, totalHauteur, applyInertia, handleSelectLocal]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart as any, { passive: true });
    el.addEventListener("touchmove", handleTouchMove as any, { passive: false });
    el.addEventListener("touchend", handleTouchEnd as any, { passive: true });
    
    el.addEventListener("mousedown", handleTouchStart as any);
    el.addEventListener("mousemove", handleTouchMove as any);
    el.addEventListener("mouseup", handleTouchEnd as any);
    el.addEventListener("mouseleave", handleTouchEnd as any);
    
    return () => {
      el.removeEventListener("touchstart", handleTouchStart as any);
      el.removeEventListener("touchmove", handleTouchMove as any);
      el.removeEventListener("touchend", handleTouchEnd as any);
      
      el.removeEventListener("mousedown", handleTouchStart as any);
      el.removeEventListener("mousemove", handleTouchMove as any);
      el.removeEventListener("mouseup", handleTouchEnd as any);
      el.removeEventListener("mouseleave", handleTouchEnd as any);
      
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        touchAction: "none",
        cursor: "grab",
        willChange: "transform",
        WebkitFontSmoothing: "subpixel-antialiased"
      }}
    >
      {membres.map((m, i) => {
        const isPhoto = (m.avatarType === 'photo' && m.avatarUrl) || (!m.avatarType && m.avatarUrl);
        const isIcon = m.avatarType === 'icon';
        const couleur = isPhoto ? 'transparent' : (m.avatarColor || getCouleurProfil(m.name, m.role));

        return (
          <div
            key={m.id}
            ref={el => { bubblesRef.current[i] = el; }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${TAILLE_BASE}px`,
              height: `${TAILLE_BASE}px`,
              willChange: "transform, opacity, filter",
              transition: "opacity 0.15s ease, filter 0.15s ease",
              userSelect: "none",
              WebkitUserSelect: "none",
              transformOrigin: "center center",
              transform: "translate(-999px, -999px)", // Hide until positioned
            }}
          >
            <motion.div
              initial={animateEnter ? { opacity: 0, scale: 0.6 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: i * 0.02 }}
              style={{
                width: '100%', 
                height: '100%', 
                borderRadius: '50%',
                background: couleur, 
                backgroundImage: isPhoto ? `url(${m.avatarUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                willChange: "transform, opacity",
                cursor: "pointer"
              }}
            >
              {/* Initiales */}
              {(!isPhoto && !isIcon) ? (
                <span
                  className="bubble-text"
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: `${TAILLE_BASE * 0.3}px`,
                    pointerEvents: "none",
                    lineHeight: 1
                  }}
                >
                  {m.initiales || m.name.charAt(0).toUpperCase()}
                </span>
              ) : isIcon ? (
                <div style={{ color: "white", pointerEvents: "none" }}>
                  {renderAvatarIcon(m.avatarIcon, TAILLE_BASE * 0.4)}
                </div>
              ) : null}

              {/* Couronne Manager */}
              {m.role === "manager" && (
                <span 
                  className="bubble-manager"
                  style={{
                    position: "absolute",
                    top: "-4px", right: "-4px",
                    fontSize: `18px`,
                    pointerEvents: "none",
                    opacity: 0,
                    transition: "opacity 0.15s ease"
                }}>
                  👑
                </span>
              )}
            </motion.div>

            {/* Prénom — positionné sous la bulle, largeur fixe */}
            <div style={{
              position: "absolute",
              top: TAILLE_BASE + 6,
              left: "50%",
              transform: "translateX(-50%)",
              width: "90px",
              textAlign: "center",
              pointerEvents: "none"
            }}>
              <span 
                className="bubble-name"
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#374151",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                  opacity: 0,
                  transition: "opacity 0.15s ease, color 0.15s ease"
              }}>
                {m.name.split(" ")[0]}
              </span>
              {m.role === "manager" && (
                <span 
                  className="bubble-manager"
                  style={{ 
                    fontSize: "10px", 
                    color: "var(--color-primary)",
                    opacity: 0,
                    transition: "opacity 0.15s ease"
                  }}
                >
                  Manager
                </span>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}



