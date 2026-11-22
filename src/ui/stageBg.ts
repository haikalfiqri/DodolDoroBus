/**
 * Per-stage backgrounds. Put images in public/art/bg/ named after the stage id:
 *   act1.png ... act4.png          -> map picture
 *   act1_battle.png ... act4_battle.png -> picture used during the fight (falls back to the map picture)
 * (.png / .webp also work). A stage without an image keeps the default meadow.
 */
const found = new Map<string, Promise<string | null>>()
const EXT = ['jpg', 'png', 'webp']

// decode() resolves only for a real, fully decoded image (a missing file served as HTML rejects), and warms the cache
const probe = (u: string) => new Promise<boolean>((ok) => { const i = new Image(); i.src = u; i.decode().then(() => ok(true), () => ok(false)) })

// 7 stages share the 4 act pictures (hovering a stage in another act swipes to that act's scene)
const ACT = ['act1', 'act1', 'act2', 'act2', 'act3', 'act3', 'act4']
const alias = (id: string) => { const m = /^c1s(\d+)(_battle)?$/.exec(id); return m && ACT[+m[1] - 1] ? ACT[+m[1] - 1] + (m[2] ?? '') : id }

export function stageBg(raw: string): Promise<string | null> {
  const id = alias(raw)
  if (!found.has(id)) found.set(id, (async () => { for (const e of EXT) { const u = `/art/bg/${id}.${e}`; if (await probe(u)) return u } return null })())
  return found.get(id)!
}

/** Load + decode every picture a list of stages needs, so the first swipe never stalls. */
export function preloadStageBgs(ids: string[]): void {
  for (const id of ids) { void stageBg(id); void stageBg(`${id}_battle`) }
}

const SWIPE_MS = 750
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Map background. show(stageId) slides the new picture in from the right (right -> left) while the old one
 * drifts a little the other way. Layers are only removed once the new one fully covers them, so quick
 * hover changes retarget smoothly instead of snapping.
 */
export function mapBgSwiper(host: HTMLElement) {
  const stack = document.createElement('div')
  stack.className = 'bgstack'
  host.prepend(stack)
  let token = 0, cur: string | null | undefined

  async function show(id: string, instant = false): Promise<void> {
    const my = ++token
    const url = await stageBg(id)
    if (my !== token || url === cur) return
    cur = url
    host.classList.toggle('hasbg', !!url)
    const el = document.createElement('div')
    el.className = 'bgl' + (url ? '' : ' def')
    if (url) el.style.backgroundImage = `url("${url}")`
    const older = Array.from(stack.children) as HTMLElement[]
    if (instant || reduced() || !older.length) { stack.replaceChildren(el); return }
    el.style.transition = 'none'
    el.style.transform = 'translate3d(100%,0,0)'
    stack.append(el)
    void el.offsetWidth
    requestAnimationFrame(() => {
      el.style.transition = ''
      el.style.transform = 'translate3d(0,0,0)'
      older.forEach((l) => { l.style.transform = 'translate3d(-6%,0,0) scale(1.12)' })
    })
    let cleaned = false
    const clean = () => { if (cleaned) return; cleaned = true; older.forEach((l) => l.remove()) }
    el.addEventListener('transitionend', (e) => { if (e.target === el && e.propertyName === 'transform') clean() })
    setTimeout(clean, SWIPE_MS + 150)
    while (stack.children.length > 6) stack.firstElementChild!.remove()
  }
  return { show }
}

/**
 * Battle scene: uses `<stageId>_battle.jpg` (another view of the same world as the map picture);
 * falls back to the map picture. Slides in from the right when the battle starts.
 */
export async function paintScene(scene: HTMLElement, id: string): Promise<void> {
  const bat = await stageBg(`${id}_battle`)
  const url = bat ?? (await stageBg(id))
  if (!url || !scene.isConnected) return
  scene.classList.toggle('baked', !!bat)   // battle pictures have the two platforms drawn in
  const el = document.createElement('div')
  el.className = 'scene-bg'; el.style.backgroundImage = `url("${url}")`
  scene.classList.add('hasbg'); scene.prepend(el)
}
