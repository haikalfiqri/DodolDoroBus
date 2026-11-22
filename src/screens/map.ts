import { api } from '../api'
import type { StageSummary } from '../types'
import { esc, modal, closeModal, onAct, stars, toast } from '../ui/dom'
import { anomalySprite, CAT_KO, eggSprite, RARITY_KO, treeSprite, TYPE_KO } from '../ui/sprites'
import { getMe, go } from '../main'
import { mapBgSwiper, preloadStageBgs } from '../ui/stageBg'

const POS: Record<number, [number, number]> = { 1: [9, 76], 2: [25, 50], 3: [40, 76], 4: [54, 48], 5: [68, 74], 6: [82, 50], 7: [84, 18] }

export async function mapScreen(body: HTMLElement): Promise<void> {
  const me = getMe()!
  const stages = await api.stages(1)
  const state = (s: StageSummary) => (s.locked ? 'lock' : s.firstCleared ? 'done' : 'open')
  const pts = stages.map((s) => POS[s.order].join(',')).join(' ')
  const nodes = stages.map((s) => {
    const [x, y] = POS[s.order], st = state(s)
    return `<button class="node ${st} ${s.isBoss ? 'boss' : ''}" style="left:${x}%;top:${y}%" data-act="stage" data-id="${s.id}">
      <span class="dot">${st === 'lock' ? '🔒' : s.isBoss ? '👁' : s.order}${s.eggSlot ? `<i class="egg">${eggSprite(s.firstClearEgg ?? 'common')}</i>` : ''}</span>
      <span class="lb">${esc(s.nameKo)}</span><span class="st">${st === 'lock' ? '' : stars(s.bestStars)}</span></button>`
  }).join('')
  const deco = [[3, 40], [14, 62], [33, 36], [47, 64], [61, 34], [74, 62], [93, 66], [30, 90], [60, 90]].map(([x, y]) => `<i class="tree" style="left:${x}%;top:${y}%">${treeSprite()}</i>`).join('')
  const list = stages.map((s) => `<button class="srow ${state(s)}" data-act="stage" data-id="${s.id}"><span class="n">${state(s) === 'lock' ? '🔒' : s.isBoss ? '👁' : s.order}</span>
    <div><b>${esc(s.nameKo)}</b><small class="mute" style="display:block">${esc(s.anomalyKo)} · 게이지 ${s.gauge}${s.eggSlot ? ' · 🥚' : ''}</small></div><span>${stars(s.bestStars)}</span></button>`).join('')
  const cleared = stages.filter((s) => s.firstCleared).length
  body.innerHTML = `<div class="mapwrap"><div>
      <div class="smap"><span class="ttl">1장 · 신비한 초대, 사파리</span><i class="cloud" style="left:20%;top:8%;width:10%"></i><i class="cloud" style="left:46%;top:13%;width:7%"></i><i class="cave"></i>${deco}
        <svg class="path" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#a16207" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>${nodes}</div>
      <div class="slist">${list}</div>
      <p class="small mute">★ 클리어 · ★★ 남은 에너지 50 이상 · ★★★ 80 이상 · 🥚 알 스테이지 · 실패해도 벌칙 없이 다시 도전!</p></div>
    <aside style="display:grid;gap:12px;align-content:start">
      <div class="box"><h3>📖 1장 진행</h3><div class="bar xp"><i style="width:${Math.round((cleared / 7) * 100)}%"></i></div><p class="small">${cleared} / 7 스테이지 클리어</p></div>
      <div class="box soft"><h3>👁 코덱스의 호의</h3><p class="small">보스를 다시 깰 때마다 +1. 50이 되면 신화 알 확정!</p><div class="bar gauge"><i style="width:${me.mythicPity * 2}%"></i></div><p class="small center">${me.mythicPity} / 50</p></div>
      <div class="box soft"><h3>📚 다른 장</h3>${['2장 멈춰버린 기계의 노래', '3장 잊혀진 시간 속으로', '4장 구름 너머의 진실', '5장 코덱스의 선택'].map((c) => `<div class="small mute">🔒 ${c}</div>`).join('')}</div>
      <button class="btn out" data-act="hub">← 홈</button></aside></div>`
  // background follows the stage under the cursor (swipes right -> left); starts on the stage you are up to
  const smap = body.querySelector<HTMLElement>('.smap')!
  const bg = mapBgSwiper(smap)
  void bg.show((stages.find((s) => !s.locked && !s.firstCleared) ?? stages[0]).id, true)
  preloadStageBgs(stages.map((s) => s.id))
  let peekT = 0   // hover intent: sweeping the mouse across several nodes only swipes to the one you stop on
  body.querySelectorAll<HTMLElement>('.node').forEach((n) => {
    const peek = () => { clearTimeout(peekT); peekT = window.setTimeout(() => void bg.show(n.dataset.id!), 70) }
    n.addEventListener('mouseenter', peek); n.addEventListener('focus', peek)
  })
  onAct(body, {
    hub: () => go('hub'),
    stage: (el) => {
      const s = stages.find((x) => x.id === el.dataset.id)!
      void bg.show(s.id)
      if (s.locked) { toast('앞 스테이지를 먼저 깨야 열려요'); return }
      openCard(s)
    },
  })

  function openCard(s: StageSummary) {
    const m = modal(`<div class="stage-card"><div class="row between"><h2>${s.isBoss ? '👁 보스 · ' : `스테이지 ${s.order} · `}${esc(s.nameKo)}</h2><span>${stars(s.bestStars)}</span></div>
      <div class="grid2"><div class="anom">${anomalySprite(s.id, s.isBoss)}</div>
        <div><div class="rw"><span>이상 현상</span><b>${esc(s.anomalyKo)}</b></div><div class="rw"><span>불안정 게이지</span><b>${s.gauge}</b></div>
          <div class="rw"><span>라운드</span><b>${s.maxRounds}</b></div><div class="rw"><span>분야</span><span>${s.categories.map((c) => `<span class="tag cat-${c}">${CAT_KO[c]}</span>`).join(' ')}</span></div>
          <div class="rw"><span>미션</span><span class="small">${s.missionTypes.map((t) => TYPE_KO[t]).join(' · ')}</span></div></div></div>
      ${s.eggSlot ? `<div class="box soft" style="margin-top:10px"><b>🥚 알 보상</b>${s.firstCleared ? '' : `<div class="drops"><div><i class="e">${eggSprite(s.firstClearEgg!)}</i>첫 클리어: <b>${RARITY_KO[s.firstClearEgg!]} 알 확정</b></div></div>`}
        <div class="small mute" style="margin-top:6px">다시 깨기 드롭 확률 (★★ 이상, 보상 배틀일 때)</div>
        <div class="drops">${(s.dropRates ?? []).map((d) => `<div><i class="e">${eggSprite(d.rarity)}</i>${RARITY_KO[d.rarity]} <b>${d.percent}%</b></div>`).join('')}</div></div>` : ''}
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn out" data-act="close">닫기</button><button class="btn big gold" data-act="go">⚔ 출전!</button></div></div>`)
    onAct(m, { close: closeModal, go: () => { closeModal(); go('battle', { stageId: s.id }) } })
  }
}
