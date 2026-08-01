'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { saveOrderPushSubscription } from '@/app/r/[slug]/suivi/[id]/actions';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = 'idle' | 'unsupported' | 'granted' | 'denied' | 'working';

/**
 * Opt-in CLIENT aux notifications push pour SA commande (page de suivi).
 * Proposé, jamais imposé : rien ne se déclenche sans clic explicite.
 */
export function OrderPushSubscribe({ orderId }: { orderId: string }) {
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !VAPID
    ) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') setState('denied');
  }, []);

  if (!VAPID || state === 'unsupported') return null;

  if (state === 'granted') {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm text-success">
        <BellRing className="h-4 w-4 shrink-0" />
        Notifications activées — vous serez prévenu à chaque étape.
      </div>
    );
  }

  async function enable() {
    try {
      setState('working');
      const reg = await navigator.serviceWorker.register('/sw.js');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState(perm === 'denied' ? 'denied' : 'idle');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID as string),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const res = await saveOrderPushSubscription(orderId, {
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      });
      setState(res.ok ? 'granted' : 'idle');
    } catch {
      setState('idle');
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--site-text)]">
            Être prévenu des mises à jour ?
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--site-muted)]">
            Recevez une notification à la confirmation, au départ et à la livraison.
          </p>
        </div>
        {state === 'denied' ? (
          <span className="shrink-0 text-xs text-[color:var(--site-muted)]">Notifications bloquées</span>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={state === 'working'}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-4 py-2 text-sm font-bold text-[color:var(--site-accent-fg)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Bell className="h-4 w-4" />
            {state === 'working' ? 'Activation…' : 'Activer'}
          </button>
        )}
      </div>
    </div>
  );
}
