// Déclaration minimale pour le paquet `qrcode` (pas de @types installé).
// Couvre uniquement `toString` en SVG, seul usage côté serveur (lib/qrcode.ts).
declare module 'qrcode' {
  interface QRCodeToStringOptions {
    type?: 'svg' | 'utf8' | 'terminal';
    margin?: number;
    width?: number;
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';
    color?: { dark?: string; light?: string };
  }
  export function toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
  const _default: { toString: typeof toString };
  export default _default;
}
