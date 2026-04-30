/**
 * Utilitaires d'image pour le Testo 270
 * Suppression de l'OCR automatique au profit d'un redimensionnement stable pour iPad
 */

/**
 * Compresser et redimensionner une photo avant stockage
 * Vise < 1Mo pour éviter de saturer l'IndexedDB
 */
export async function optimiserPhotoCapturee(imageBlob: Blob, maxWidth = 1280): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.floor(height * ratio);
      } else if (height > maxWidth) {
        const ratio = maxWidth / height;
        height = maxWidth;
        width = Math.floor(width * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Unable to get canvas context"));
      }
      
      // Prevent black images or orient issues mostly by resetting transform if needed, 
      // but standard drawImage handles basics.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium"; // 'medium' is more stable on Safari iPad
      ctx.fillStyle = "#FFFFFF"; // Solid background format
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Qualité 0.75, image/jpeg pour max compatibilité
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback to original if compression fails silently
          resolve(imageBlob);
        }
      }, "image/jpeg", 0.75);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      console.warn("Failed to load image for compression, returning original");
      resolve(imageBlob); // Fallback to original
    };

    img.src = url;
  });
}

/**
 * Convertit un Blob en DataURL pour affichage/stockage
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
