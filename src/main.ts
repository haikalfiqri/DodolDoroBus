import './styles.css'
import { api, ApiError } from './api'
import type { Me } from './types'
import { esc, onAct, showError } from './ui/dom'
import { MOOD_COL } from './ui/sprites'
import { sfx } from './ui/sound'
import { loginScreen } from './screens/login'
import { onboardingScreen } from './screens/onboarding'
import { hubScreen } from './screens/hub'
import { mapScreen } from './screens/map'
import { battleScreen } from './screens/battle'
import { roomScreen } from './screens/room'
import { mailScreen, shopScreen, reportScreen } from './screens/economy'
import { adminScreen } from './screens/admin'
import { battleRoomScreen } from './screens/battleroom'

/** A screen draws into `body` (the area under the top bar). */
export type Screen = (body: HTMLElement, params: Record<string, string>) => Promise<void> | void
const SCREENS: Record<string, { fn: Screen; bar: boolean; flush?: boolean }> = {
  login: { fn: loginScreen, bar: false, flush: true },
  onboarding: { fn: onboardingScreen, bar: false, flush: true },
  hub: { fn: hubScreen, bar: true, flush: true },
  map: { fn: mapScreen, bar: true, flush: true },
  battle: { fn: battleScreen, bar: false, flush: true },
  room: { fn: roomScreen, bar: true },
  mail: { fn: mailScreen, bar: true },
  shop: { fn: shopScreen, bar: true },
  report: { fn: reportScreen, bar: true },
  admin: { fn: adminScreen, bar: true },
  battleroom: { fn: battleRoomScreen, bar: true },
}

let me: Me | null = null
export const getMe = () => me
export async function refreshMe(): Promise<Me> { me = await api.me(); drawBar(); return me }

const app = document.getElementById('app')!
app.innerHTML = '<div class="frame"><div id="bar"></div><div class="body" id="body"></div></div>'
const bar = document.getElementById('bar')!
const body = document.getElementById('body')!
let current = ''

function drawBar(): void {
  const s = SCREENS[current]
  if (!s?.bar || !me) { bar.innerHTML = ''; return }
  const p = me.partner
  const student = me.role === 'STUDENT'
  const face = p ? `<img class="pet" src="/art/px/pet_${p.speciesId}_${p.form}.png" alt="">` : '<span>👤</span>'
  const badge = (n: number) => (n ? `<u>${n}</u>` : '')
  bar.innerHTML = `<div class="topbar">
    <button class="logo" data-act="home">코덱스의 시험</button>
    <span class="sp"></span>
    ${student ? `<span class="chip cell" title="셀">🔹 <b>${me.cells}</b></span>
    <button class="tb-icon" data-act="mail" aria-label="우편함">✉${badge(me.unclaimedMail)}</button>` : '<span class="chip">🛠 관리자</span>'}
    <div class="profile">
      <button class="avatar" data-act="profile" aria-label="프로필 메뉴" aria-haspopup="menu">${face}${student ? badge(me.unclaimedMail) : ''}</button>
      <div class="pmenu" role="menu" hidden>
        <div class="pm-head"><div class="avatar big">${face}</div><div><b>${esc(me.nickname)}</b>
          ${p ? `<div class="small"><i class="mood-dot" style="background:${MOOD_COL[p.mood]}"></i>${esc(p.nickname)} · Lv.${p.level}</div>` : ''}</div></div>
        ${student ? `<button role="menuitem" data-act="mail">✉ 우편함 ${me.unclaimedMail ? `<span class="pm-badge">${me.unclaimedMail}</span>` : ''}</button>
        <button role="menuitem" data-act="room" ${me.unlocked.myRoom ? '' : 'disabled'}>🏠 마이룸</button>
        <button role="menuitem" data-act="shop" ${me.unlocked.shop ? '' : 'disabled'}>🛍 상점</button>
        <button role="menuitem" data-act="report">📈 리포트</button>` : '<button role="menuitem" data-act="home">🛠 관리자 페이지</button>'}
        <button role="menuitem" data-act="sound">${sfx.on ? '🔊 소리 끄기' : '🔇 소리 켜기'}</button>
        <hr><button role="menuitem" class="danger" data-act="logout">로그아웃</button>
      </div>
    </div></div>`
}
function closeMenu(): void {
  bar.querySelector('.pmenu')?.setAttribute('hidden', '')
  bar.querySelector('.avatar')?.setAttribute('aria-expanded', 'false')
}
onAct(bar, {
  home: () => go(me?.role === 'ADMIN' ? 'admin' : 'hub'),
  mail: () => go('mail'),
  room: () => go('room'),
  shop: () => go('shop'),
  report: () => go('report'),
  sound: () => { sfx.toggle(); drawBar() },
  profile: (el) => {
    const open = bar.querySelector('.pmenu')?.toggleAttribute('hidden') === false
    el.setAttribute('aria-expanded', String(open))
  },
  logout: async () => { await api.logout(); me = null; go('login') },
})
// close the profile menu on any click outside it, or Esc
document.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.profile')) closeMenu() })
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu() })

export async function go(name: string, params: Record<string, string> = {}): Promise<void> {
  const s = SCREENS[name] ?? SCREENS.hub
  current = name
  location.hash = name === 'login' ? '' : name
  body.className = 'body' + (s.flush ? ' flush' : '')
  body.innerHTML = '<div class="empty">불러오는 중…</div>'
  body.onclick = null
  document.getElementById('modal')?.remove()
  try {
    if (name !== 'login') await refreshMe()
    else drawBar()
    body.innerHTML = ''
    await s.fn(body, params)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) { me = null; current = 'login'; drawBar(); body.className = 'body flush'; body.innerHTML = ''; await loginScreen(body); return }
    showError(e)
    body.innerHTML = `<div class="empty"><p>${esc((e as Error).message)}</p><button class="btn" onclick="location.reload()">다시 시도</button></div>`
  }
}

/** Decide the first screen: login, onboarding, admin or hub. */
export async function start(): Promise<void> {
  try {
    me = await api.me()
  } catch {
    return go('login')
  }
  if (me.role === 'ADMIN') return go('admin')
  if (!me.onboarded) return go('onboarding')
  const h = location.hash.slice(1)
  return go(h && SCREENS[h] && !['login', 'onboarding', 'battle'].includes(h) ? h : 'hub')
}
// browser back/forward and typed #hash links
window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1)
  if (me && h && h !== current && SCREENS[h] && !['login', 'onboarding', 'battle'].includes(h)) void go(h)
})
void start()
