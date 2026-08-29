import { supabase } from './supabase'

/**
 * Set after `npx web-push generate-vapid-keys`. The public key is safe to
 * ship in the client bundle by design — it identifies your server to the
 * push service, it does not authorize anything on its own.
 */
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

export async function pushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Ask for permission (if not already decided), subscribe with the push
 * service, and save the subscription against the signed-in user. Safe to
 * call again later — the unique constraint on (profile_id, endpoint) makes
 * this idempotent rather than creating duplicate rows.
 */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: 'Push is not supported on this device.' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: 'Notification permission was not granted.' }
  }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    })
  }

  const json = sub.toJSON()
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return { ok: false, error: 'Not signed in.' }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      profile_id: u.user.id,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
    { onConflict: 'profile_id,endpoint' },
  )

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

