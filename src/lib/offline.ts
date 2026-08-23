/* ---------------------------------------------------------------------------
   Offline write queue.

   Nigerian classrooms lose connectivity constantly. A teacher who taps through
   thirty students and then discovers nothing saved will not use the product
   again. Writes go to a local queue first, flush immediately when online, and
   retry on reconnect. Nothing is ever lost to a dropped connection.
--------------------------------------------------------------------------- */

const KEY = 'daymark.queue.v1'

export type QueuedWrite = {
  id: string
  table: 'attendance' | 'lessons'
  rows: Record<string, unknown>[]
  onConflict?: string
  queuedAt: number
}

function read(): QueuedWrite[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as QueuedWrite[]
  } catch {
    return []
  }
}

function write(q: QueuedWrite[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q))
  } catch {
    /* storage full or blocked, nothing useful to do */
  }
}

export function enqueue(item: Omit<QueuedWrite, 'id' | 'queuedAt'>) {
  const q = read()
  q.push({ ...item, id: crypto.randomUUID(), queuedAt: Date.now() })
  write(q)
}

export function queueSize() {
  return read().length
}

export function clearQueue() {
  write([])
}

/** Flush everything. Returns how many writes went through. */
export async function flushQueue(
  send: (item: QueuedWrite) => Promise<{ error: unknown }>,
): Promise<number> {
  const q = read()
  if (q.length === 0) return 0

  const remaining: QueuedWrite[] = []
  let sent = 0

  for (const item of q) {
    const { error } = await send(item)
    if (error) remaining.push(item)
    else sent++
  }

  write(remaining)
  return sent
}

/** Call once on mount. Flushes on reconnect and every 30s while online. */
export function watchConnection(flush: () => void) {
  const onOnline = () => flush()
  window.addEventListener('online', onOnline)
  const timer = window.setInterval(() => {
    if (navigator.onLine) flush()
  }, 30_000)
  return () => {
    window.removeEventListener('online', onOnline)
    window.clearInterval(timer)
  }
}

/* ---------------------------------------------------------------------------
   Read-side cache.

   The write queue keeps taps safe. This keeps the screen usable: if a teacher
   reloads on a dead connection, they still see the roster and the marks they
   already made, clearly labelled as a saved copy.
--------------------------------------------------------------------------- */

const SNAP = 'daymark.snap.'

export function saveSnapshot<T>(key: string, value: T) {
  try {
    localStorage.setItem(SNAP + key, JSON.stringify({ at: Date.now(), value }))
  } catch {
    /* ignore */
  }
}

export function readSnapshot<T>(key: string): { value: T; at: number } | null {
  try {
    const raw = localStorage.getItem(SNAP + key)
    if (!raw) return null
    return JSON.parse(raw) as { value: T; at: number }
  } catch {
    return null
  }
}
