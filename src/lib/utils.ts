import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function lighten(hex: string, amount: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch(e) { return hex; }
}

export function darken(hex: string, amount: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch(e) { return hex; }
}

export function alpha(hex: string, opacity: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } catch(e) { return `rgba(0,0,0,${opacity})`; }
}

export function getInitials(name: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

export function getCouleurProfil(nom: string, role?: string): string {
  if (role === 'manager') return 'var(--color-primary)';
  let hash = 0;
  for (let i = 0; i < nom.length; i++) {
    hash = nom.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

export const styleBoutonPrimaire = (disabled = false): any => ({
  background: disabled ? "#F3F4F6" : "var(--color-primary)",
  color: disabled ? "#9CA3AF" : "white",
  border: "none",
  borderRadius: "16px",
  height: "52px",
  fontSize: "16px",
  fontWeight: "900",
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "all 0.2s ease",
  opacity: disabled ? 0.6 : 1,
  boxShadow: disabled ? "none" : "0 4px 14px 0 rgba(255, 42, 157, 0.3)"
});
