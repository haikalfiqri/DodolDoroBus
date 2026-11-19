import { api } from '../api/client'
import { esc, onAct, toast } from '../components/dom'
import { petArtUrl } from '../content'
import { go, type Screen } from '../router'

/** Wiring check: /me, onboarding, mailbox. Shows the pattern every screen follows:
 *  1) fetch what you need  2) draw  3) handle clicks -> call api -> redraw */
export const homeScreen: Screen = async (root) => {
  const me = await api.me()
  if (!me.onboarded) {
    root.innerHTML = `<div class="pnl"><h2>온보딩 (임시)</h2><p>스타터 알에서 펫이 태어나요. 이름을 지어 주세요.</p>
      <input id="petName" maxlength="8" placeholder="펫 이름"> <button class="btn" data-act="onboard">시작</button></div>`
    onAct(root, {
      onboard: async () => {
        await api.onboarding((root.querySelector<HTMLInputElement>('#petName')!).value)
        void go('home')
      },
    })
    return
  }
  const mail = await api.mail()
  const p = me.partner!
  root.innerHTML = `<div class="pnl row">
      <img src="${petArtUrl(p.speciesId, p.form)}" width="110" height="110" alt="">
      <div><h2>${esc(p.nickname)} <small>Lv.${p.level} · ${p.mood}</small></h2>
      <div>🪙 ${me.cells}셀 · 오늘 보상 배틀 ${me.today.rewardedBattles}/10 · 받은 셀 ${me.today.cellsEarned}/60</div>
      <button class="btn" data-act="map">🗺 1장 지도</button></div></div>
    <div class="pnl"><h3>✉ 우편함</h3>${mail.map((m) => `<div class="row between"><span>${esc(m.title)}</span><b>+${m.amount}</b>${m.claimed ? '<span class="mute">받음</span>' : `<button class="btn sm" data-act="claim" data-id="${m.id}">받기</button>`}</div>`).join('') || '<p class="mute">우편 없음</p>'}</div>`
  onAct(root, {
    map: () => void go('map'),
    claim: async (el) => {
      const r = await api.claimMail(el.dataset.id!)
      toast(`+${r.claimed}셀`)
      void go('home')
    },
  })
}
