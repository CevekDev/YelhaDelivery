'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { savePushSubscription } from '@/app/push/actions';

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

export function PushSubscribe() {
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
    if (Notification.permission === 'granted') setState('granted');
    else if (Notification.permission === 'denied') setState('denied');
  }, []);

  if (!VAPID || state === 'unsupported') return null;

  if (state === 'granted') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold text-success">
        <BellRing className="h-4 w-4" /> Notifications activées
      </span>
    );
  }

  if (state === 'denied') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Bell className="h-4 w-4" /> Notifications bloquées
      </span>
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
      await savePushSubscription({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      });
      setState('granted');
    } catch {
      setState('idle');
    }
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={state === 'working'}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-60"
    >
      <Bell className="h-4 w-4" />
      {state === 'working' ? 'Activation…' : 'Activer les notifications'}
    </button>
  );
}
