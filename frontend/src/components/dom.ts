/** Escape text before putting it into innerHTML. Use it for every value that comes from data. */
export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/**
 * One click handler per screen: buttons carry data-act="name" (and data-* values).
 *   onAct(root, { claim: (el) => ..., start: (el) => ... })
 */
export function onAct(root: HTMLElement, handlers: Record<string, (el: HTMLElement, ev: MouseEvent) => void>): void {
  root.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]')
    if (!el || (el as HTMLButtonElement).disabled || !root.contains(el)) return
    handlers[el.dataset.act!]?.(el, ev)
  }
}

export function toast(msg: string): void {
  const t = document.createElement('div')
  t.className = 'toast'
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2800)
}
