'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

function csvCell(value: string | number): string {
  const s = String(value ?? '');
  // Échappe guillemets + entoure si séparateur/retour ligne/guillemet présent.
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function ExportOrdersButton({
  headers,
  rows,
  filename,
}: {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}) {
  function download() {
    const lines = [headers, ...rows].map((r) => r.map(csvCell).join(';'));
    // BOM UTF-8 pour qu'Excel lise correctement les accents.
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={download} disabled={rows.length === 0}>
      <Download className="h-4 w-4" />
      Exporter CSV
    </Button>
  );
}
