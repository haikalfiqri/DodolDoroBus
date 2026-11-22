import { api } from '../api'
import type { Pet } from '../types'
import { $, esc, onAct, splash, talk } from '../ui/dom'
import { eggSprite, MOOD_COL, MOOD_KO, petImg } from '../ui/sprites'
import { getMe, go } from '../main'
import dialogue from '../../content/dialogue/ch1.json'

const line = (step: string) => dialogue.onboarding.find((l) => l.step === step)!

/** Codex's letter -> Naty's starter egg (tap 3x) -> hatch -> name -> mood colours -> map */
export async function onboardingScreen(body: HTMLElement): Promise<void> {
  const me = getMe()!
  let step = 0, taps = 0
  let pet: Pet | null = null
  const fill = (t: string) => t.replaceAll('{player}', me.nickname).replaceAll('{pet}', pet?.nickname ?? '').replaceAll('{taps}', String(taps))

  const draw = () => {
    let h = ''
    if (step === 0) {
      h = `<div class="letter"><div class="seal">DOROLAND · 입단 초대장</div><h2>신입 대원 ${esc(me.nickname)}에게</h2>
        <p>${esc(fill(line('letter').text))}</p><button class="btn big" style="width:100%" data-act="next">${line('letter').button} ▶</button></div>`
    } else if (step === 1) {
      h = `<p class="small">1 / 3 · 광장의 스타터 알</p>
        <button class="egg-tap" id="egg" data-act="tap" aria-label="알 두드리기">${eggSprite('common')}</button>
        ${talk('naty', taps === 0 ? line('egg').text : fill(line('egg_tap').text))}`
    } else if (step === 2 && pet) {
      h = `<p class="small">2 / 3 · 이름 짓기</p><div class="hatch-pet">${petImg(pet.speciesId, 'baby')}</div>
        ${talk('naty', line('hatched').text + '\n' + line('name').text)}
        <form class="row" id="nf" style="width:100%;justify-content:center"><input class="inp" id="nm" maxlength="8" value="${esc(pet.nickname)}" style="max-width:220px">
        <button class="btn">${line('name').button} ▶</button></form>`
    } else if (step === 3 && pet) {
      h = `<p class="small">3 / 3 · 네이티의 안내</p><div class="hatch-pet" style="width:150px;height:150px">${petImg(pet.speciesId, 'baby')}</div>
        ${talk('naty', fill(line('mood').text))}
        <div class="moods">${Object.keys(MOOD_COL).map((m) => `<span class="mood"><i style="background:${MOOD_COL[m]}"></i>${MOOD_KO[m]}</span>`).join('')}</div>
        <button class="btn big gold" data-act="done">${line('mood').button} ▶</button>`
    }
    body.innerHTML = `<div class="ob"><div class="ob-inner">${h}</div></div>`
    const f = body.querySelector<HTMLFormElement>('#nf')
    if (f) f.onsubmit = async (e) => {
      e.preventDefault()
      const n = $<HTMLInputElement>('#nm', body).value.trim()
      if (n && pet && n !== pet.nickname) pet = await api.renamePet(pet.id, n)
      step = 3; draw()
    }
  }
  onAct(body, {
    next: () => { step = 1; draw() },
    tap: async () => {
      if (taps >= 3) return
      taps++
      if (taps < 3) { draw(); $('#egg', body).classList.add('shake'); return }
      const res = await api.onboarding('')   // server picks dog / cat / rabbit and saves the pet
      pet = res.pet
      await splash(body.firstElementChild as HTMLElement, '짠!', `${pet.nickname}이(가) 태어났어요`, 1300)
      step = 2; draw()
    },
    done: () => go('map'),
  })
  draw()
}
