import { PrintSettings } from '../../types/printing';

/**
 * Déclenche une impression système (AirPrint) via une iframe cachée.
 * Stratégie honnête : on utilise @page pour *suggérer* la taille à AirPrint,
 * mais Safari iOS peut l'ignorer ou imposer des marges.
 * Fallback : si l'iframe échoue, on ouvre dans un nouvel onglet.
 */
export async function triggerSystemPrint(
  htmlContent: string, 
  settings: PrintSettings
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const oldIframe = document.getElementById('print-iframe');
      if (oldIframe) {
        document.body.removeChild(oldIframe);
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const iframeWindow = iframe.contentWindow;
      const iframeDocument = iframe.contentDocument;

      if (!iframeWindow || !iframeDocument) {
        throw new Error("Impossible d'accéder à l'iframe d'impression");
      }

      let widthStr = '50mm';
      let heightStr = '30mm';
      
      if (settings.format === '62x29') {
        widthStr = '62mm';
        heightStr = '29mm';
      }

      const pageStyle = `
        @page {
          size: ${settings.orientation === 'landscape' ? `${heightStr} ${widthStr}` : `${widthStr} ${heightStr}`};
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          width: ${settings.orientation === 'landscape' ? heightStr : widthStr};
          height: ${settings.orientation === 'landscape' ? widthStr : heightStr};
          overflow: hidden;
          background: white;
          color: black;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
      `;

      iframeDocument.open();
      iframeDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Impression</title>
            <style>${pageStyle}</style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      iframeDocument.close();

      setTimeout(() => {
        iframeWindow.focus();
        iframeWindow.print();
        resolve(true);
      }, 500);

    } catch (error) {
      console.error('Erreur lors du triggerSystemPrint:', error);
      try {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
           printWindow.document.write(`<html><body>${htmlContent}</body><script>window.print(); window.close();</script></html>`);
           printWindow.document.close();
           resolve(true);
        } else {
           resolve(false);
        }
      } catch (e) {
        resolve(false);
      }
    }
  });
}
