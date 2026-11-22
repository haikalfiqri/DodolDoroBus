import { charSprite, CHAR_NAME } from './sprites'

export const $ = <E extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<E>(sel)!
export const $$ = <E extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<E>(sel)]
export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** One click handler per root: buttons carry data-act="name". */
export function onAct(root: HTMLElement, handlers: Record<string, (el: HTMLElement, ev: MouseEvent) => unknown>): void {
  root.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]')
    if (!el || (el as HTMLButtonElement).disabled || !root.contains(el)) return
    const fn = handlers[el.dataset.act!]
    if (fn) Promise.resolve(fn(el, ev)).catch(showError)
  }
}

export function toast(msg: string, bad = false): void {
  let box = document.getElementById('toasts')
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box) }
  const t = document.createElement('div')
  t.className = 'toast' + (bad ? ' bad' : '')
  t.textContent = msg
  box.appendChild(t)
  setTimeout(() => t.remove(), 2800)
}
export function showError(e: unknown): void {
  console.error(e)
  toast((e as Error).message ?? '문제가 생겼어요', true)
}

export function modal(html: string, wide = false): HTMLElement {
  closeModal()
  const bg = document.createElement('div')
  bg.className = 'modal-bg'
  bg.id = 'modal'
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}">${html}</div>`
  bg.addEventListener('click', (e) => { if (e.target === bg) closeModal() })
  document.body.appendChild(bg)
  return bg.firstElementChild as HTMLElement
}
export function closeModal(): void { document.getElementById('modal')?.remove() }

export function splash(parent: HTMLElement, text: string, sub = '', ms = 1000): Promise<void> {
  const d = document.createElement('div')
  d.className = 'splash'
  d.innerHTML = `<div>${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`
  parent.appendChild(d)
  return sleep(ms).then(() => d.remove())
}

export function talk(speaker: string, text: string): string {
  return `<div class="talk"><div class="face ${speaker}">${charSprite(speaker)}</div><div><div class="who ${speaker}">${CHAR_NAME[speaker] ?? speaker}</div><div class="txt">${esc(text)}</div></div></div>`
}
export const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)
