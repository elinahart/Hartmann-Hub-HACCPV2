export async function compressPhotoTLC(imageBlob: Blob | File, maxWidth = 800, quality = 0.5): Promise<string> {
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
      
      // Safari / iOS optimizations
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium";
      ctx.fillStyle = "#FFFFFF"; 
      ctx.fillRect(0, 0, width, height);

      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);

      // We prefer webp for size, but jpeg for max compatibility on older iOS. 
      // JPEG with 0.5 quality is incredibly light and sufficient for DLC reading.
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = url;
  });
}
