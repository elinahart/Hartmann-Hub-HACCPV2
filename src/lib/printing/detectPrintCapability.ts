import { PrintCapability } from '../../types/printing';

export function detectPrintCapability(): PrintCapability {
  // Détection basique pour Safari iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (!window.print) {
    return 'unsupported';
  }

  if (isIOS && isSafari) {
    return 'supported';
  }

  return 'unknown';
}
