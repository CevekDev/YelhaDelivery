import 'server-only';
import QRCode from 'qrcode';

/**
 * Génère un QR code au format SVG (chaîne) côté serveur. Rendu inline dans la
 * carte « Partager » du dashboard, téléchargeable pour flyers/vitrine.
 */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#1A1A1A', light: '#ffffff' },
  });
}
