// Вэб: PNG татах (html-to-image, товч дарахад lazy import), хэвлэх/PDF (window.print), текст хуулах (SPEC §3, §8.5).
import { useState } from 'react';
import { View } from 'react-native';

import { t } from '@/lib/i18n-mn';
import { space } from '@/theme/tokens';

import { ActionButton } from './action-button';
import { INFOGRAPHIC_H, INFOGRAPHIC_W } from './infographic';

export function PngPrintActions({ getNode, filename }: { getNode: () => HTMLElement | null; filename: string }) {
  const [busy, setBusy] = useState(false);
  const g = t.infographic;

  async function downloadPng() {
    const node = getNode();
    if (!node) return;
    setBusy(true);
    try {
      await document.fonts.ready; // кирилл фонт бүрэн ачаалагдтал
      const { toPng } = await import('html-to-image');
      const url = await toPng(node, {
        width: INFOGRAPHIC_W,
        height: INFOGRAPHIC_H,
        canvasWidth: INFOGRAPHIC_W,
        canvasHeight: INFOGRAPHIC_H,
        pixelRatio: 1,
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View nativeID="report-actions" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      <ActionButton primary label={busy ? g.pngWorking : g.png} onPress={downloadPng} disabled={busy} />
      <ActionButton label={g.print} onPress={() => window.print()} />
    </View>
  );
}

export function CopyTextButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const s = t.share;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
    } catch {
      setState('fail');
    }
    setTimeout(() => setState('idle'), 2500);
  }
  return (
    <View nativeID="copy-text" aria-live="polite">
      <ActionButton label={state === 'ok' ? s.copied : state === 'fail' ? s.copyFailed : s.copy} onPress={copy} />
    </View>
  );
}
