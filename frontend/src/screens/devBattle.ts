import { api } from '../api/client'
import type { Answer, AnswerRes, BattleState, Question } from '../api/types'
import { esc, onAct } from '../components/dom'
import { fillText, petArtUrl } from '../content'
import { go, type Screen } from '../router'

/**
 * WIRING TEST for the battle API — plain on purpose. It shows the exact call order:
 *
 *   startBattle -> (intro lines) -> [ useSkill -> answer (pet) -> answer (anomaly) ] x rounds -> finish
 *
 * Replace this file with the real battle screen (prototype: renderBattle, qBody, evaluate).
 * Keep the same call order; only the drawing changes.
 */
export const devBattleScreen: Screen = async (root, params) => {
  const me = await api.me()
  const start = await api.startBattle({ stageId: params.stageId, petId: me.partner!.id, mode: 'STORY' })
  let state: BattleState = start.state
  let question: Question | null = null
  let feedback: AnswerRes | null = null
  let picks: number[] = [] // order / command_order / pixel_art input
  const say = (t: string) => fillText(t, state.pet.nickname, me.nickname)

  function draw(): void {
    const s = state
    const head = `<div class="pnl row between">
      <div><b>${esc(s.stageId)}</b> · 라운드 ${s.round}/${s.maxRounds} · 게이지 ${s.gauge}/${s.maxGauge} · 에너지 ${s.energy}/${s.maxEnergy} · 콤보 ×${s.combo.toFixed(1)}</div>
      <img src="${petArtUrl(s.pet.speciesId, s.pet.form)}" width="64" height="64" alt=""></div>`
    let body = ''
    if (start.intro.length) {
      body = `<div class="pnl">${start.intro.map((l) => `<p><b>${l.speaker}</b>: ${esc(say(l.text))}</p>`).join('')}<button class="btn" data-act="introDone">배틀 시작</button></div>`
    } else if (feedback) {
      body = `<div class="pnl ${feedback.correct ? 'ok' : 'no'}"><b>${feedback.correct ? '⭕ 정답' : '❌ 오답'}</b> · ${esc(feedback.effect.noteKo)}<br>
        <small>${esc(feedback.explanation)} · 정답: ${esc(JSON.stringify(feedback.correctAnswer))}</small><br><button class="btn" data-act="next">계속</button></div>`
    } else if (s.phase === 'PICK_SKILL') {
      body = `<div class="pnl"><h3>내 차례: 스킬 선택</h3>${s.pet.skills.map((k) => `<button class="btn out" data-act="skill" data-id="${k.id}">${esc(k.nameKo)} (${k.category}) 위력 ${k.power}</button>`).join(' ')}</div>`
    } else if (question) {
      body = `<div class="pnl"><h3>${s.phase === 'PET_QUESTION' ? '공격 문제' : '⚠ 회피 문제'} · ${question.missionType} · ${question.timeLimitS}초</h3><p><b>${esc(question.prompt)}</b></p>${answerInput(question)}</div>`
    }
    root.innerHTML = head + body
  }

  function answerInput(q: Question): string {
    const p = q.payload
    switch (p.kind) {
      case 'choice4':
        return p.choices.map((c, i) => `<button class="btn out" data-act="ans" data-v="${i}">${esc(c)}</button>`).join(' ')
      case 'puzzle':
        return `<p>${p.seq.map(esc).join(' , ')}</p>` + p.choices.map((c, i) => `<button class="btn out" data-act="ans" data-v="${i}">${esc(c)}</button>`).join(' ')
      case 'ox':
        return `<button class="btn out" data-act="ox" data-v="O">O</button> <button class="btn out" data-act="ox" data-v="X">X</button>`
      case 'keyword':
        return `<input id="kw"> <button class="btn" data-act="kw">확인</button>`
      case 'order':
      case 'command_order':
        return `<p>선택: ${picks.map((i) => esc(p.items[i])).join(' → ') || '-'}</p>` +
          p.items.map((t, i) => `<button class="btn out" data-act="pick" data-v="${i}" ${picks.includes(i) ? 'disabled' : ''}>${esc(t)}</button>`).join(' ') +
          ` <button class="btn" data-act="send" ${picks.length < p.items.length ? 'disabled' : ''}>확인</button>`
      case 'pixel_art':
        return `<p>목표: ${p.target.join(' / ')}</p><button class="btn" data-act="pixelCheat">(테스트) 목표대로 제출</button>`
    }
  }

  async function submit(a: Answer): Promise<void> {
    feedback = await api.answer(state.battleId, question!.id, a)
    state = feedback.state
    question = feedback.nextQuestion // anomaly question after a pet question, else null
    picks = []
    draw()
  }

  async function next(): Promise<void> {
    feedback = null
    if (state.phase === 'WON' || state.phase === 'LOST') {
      const r = await api.finish(state.battleId)
      root.innerHTML = `<div class="pnl"><h2>${r.won ? '잠재웠다!' : '아쉬워요'} ${'★'.repeat(r.stars)}</h2>
        ${r.dialogue.map((l) => `<p><b>${l.speaker}</b>: ${esc(say(l.text))}</p>`).join('')}
        <p>+${r.xpGained} XP ${r.levelUp ? `· 레벨 업 ${r.levelUp.from} → ${r.levelUp.to}` : ''} · 우편함 +${r.cellsMailed}셀 ${r.practiceMode ? '(연습 모드)' : ''}</p>
        ${r.egg ? `<p>🥚 ${r.egg.rarity} 알! ${esc(r.eggNoteKo)} (${r.egg.inNest ? '둥지' : '알 상자'})</p>` : `<p class="mute">${esc(r.eggNoteKo)}</p>`}
        ${r.unlocksKo.map((u) => `<p>🔓 ${esc(u)}</p>`).join('')}
        <pre class="mute">${esc(JSON.stringify(r, null, 1))}</pre><button class="btn" data-act="map">지도로</button></div>`
      return
    }
    draw()
  }

  onAct(root, {
    introDone: () => { start.intro = []; draw() },
    skill: async (el) => { const r = await api.useSkill(state.battleId, el.dataset.id!); state = r.state; question = r.question; draw() },
    ans: (el) => void submit(Number(el.dataset.v)),
    ox: (el) => void submit(el.dataset.v as 'O' | 'X'),
    kw: () => void submit(root.querySelector<HTMLInputElement>('#kw')!.value),
    pick: (el) => { picks.push(Number(el.dataset.v)); draw() },
    send: () => void submit(picks),
    pixelCheat: () => { const p = question!.payload; if (p.kind === 'pixel_art') void submit(p.target.join('').split('').map(Number)) },
    next: () => void next(),
    map: () => void go('map'),
  })
  draw()
}
