/**
 * imageOptimizer.ts
 * Utilidad para comprimir y optimizar automáticamente cualquier imagen que el usuario suba
 * o seleccione al crear o editar productos en la Panadería La Estrella del Socorro.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savedPercentage: number;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Optimiza automáticamente URLs de servicios conocidos como Unsplash o Cloudinary
 */
export function optimizeExternalImageUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();

  // Optimización para Unsplash
  if (trimmed.includes('images.unsplash.com') && !trimmed.includes('&w=')) {
    const separator = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${separator}auto=format&fit=crop&w=640&q=80`;
  }

  // Optimización para Cloudinary
  if (trimmed.includes('cloudinary.com') && trimmed.includes('/upload/') && !trimmed.includes('/w_')) {
    return trimmed.replace('/upload/', '/upload/w_640,c_limit,q_auto,f_auto/');
  }

  return trimmed;
}

/**
 * Comprime cualquier archivo de imagen (desde celular o computador) directamente en el navegador
 * reduciendo fotos de 10 MB a 30-50 KB sin pérdida perceptible de calidad en pantalla.
 */
export function compressImageFile(
  file: File,
  maxWidth = 640,
  maxHeight = 640,
  quality = 0.82
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('El archivo seleccionado no es una imagen válida.'));
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        // Calcular dimensiones proporcionales
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        // Crear canvas para el redimensionamiento y compresión
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo inicializar el procesador de imágenes.'));
        }

        // Fondo blanco para imágenes con transparencia convertidas a JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Suavizado de imagen de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar a JPEG optimizado
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Calcular tamaño aproximado del dataUrl
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const compressedSize = Math.round((base64Length * 3) / 4);
        const savedPercentage = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          savedPercentage,
        });
      };

      img.onerror = () => reject(new Error('Error al decodificar la imagen.'));
      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsDataURL(file);
  });
}
