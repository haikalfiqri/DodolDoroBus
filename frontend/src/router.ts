/**
 * Tiny screen switcher. Each screen is a function that draws into `root`.
 * Add a screen: write src/screens/xxx.ts, then add it to SCREENS in main.ts.
 */
export type Screen = (root: HTMLElement, params: Record<string, string>) => void | Promise<void>

let root: HTMLElement
let screens: Record<string, Screen> = {}

export function initRouter(el: HTMLElement, all: Record<string, Screen>): void {
  root = el
  screens = all
}

export async function go(name: string, params: Record<string, string> = {}): Promise<void> {
  const screen = screens[name]
  if (!screen) throw new Error('unknown screen: ' + name)
  root.innerHTML = ''
  root.onclick = null
  root.dataset.screen = name
  try {
    await screen(root, params)
  } catch (e) {
    console.error(e)
    root.innerHTML = `<div class="pnl"><b>에러</b><pre>${String((e as Error).message)}</pre><button class="btn" onclick="location.reload()">다시 시도</button></div>`
  }
}
