import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
