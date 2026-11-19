import { api } from '../api/client'
import { esc, onAct } from '../components/dom'
import { go, type Screen } from '../router'

/** Placeholder chapter map: a list. Build the real map from the prototype (renderMap + openStage). */
export const mapScreen: Screen = async (root) => {
  const stages = await api.stages(1)
  root.innerHTML = `<div class="pnl"><div class="row between"><h2>1장 · 신비한 초대, 사파리</h2><button class="btn out sm" data-act="home">← 홈</button></div>
    ${stages.map((s) => `<div class="row between stage">
      <span>${s.isBoss ? '👑' : s.order}. <b>${esc(s.nameKo)}</b> <small class="mute">${esc(s.anomalyKo)} · 게이지 ${s.gauge} · ${s.maxRounds}R</small>
      ${s.eggSlot ? `<small>🥚 ${s.firstCleared ? '드롭 ' + s.dropRates!.map((d) => `${d.rarity} ${d.percent}%`).join(' / ') : '첫 클리어: ' + s.firstClearEgg}</small>` : ''}</span>
      <span>${'★'.repeat(s.bestStars)}${'☆'.repeat(3 - s.bestStars)}</span>
      <button class="btn sm" data-act="play" data-id="${s.id}" ${s.locked ? 'disabled' : ''}>${s.locked ? '🔒' : '출전'}</button></div>`).join('')}</div>`
  onAct(root, {
    home: () => void go('home'),
    play: (el) => void go('battle', { stageId: el.dataset.id! }),
  })
}
