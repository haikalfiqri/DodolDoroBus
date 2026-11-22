import { api } from '../api'
import type { Answer, AnswerRes, BattleState, FinishRes, Question, StageSummary } from '../types'
import { $, $$, esc, modal, closeModal, onAct, sleep, splash, talk, toast, showError } from '../ui/dom'
import { anomalySprite, CAT_ICON, CAT_KO, eggSprite, FORM_KO, petImg, RARITY_KO, TYPE_KO } from '../ui/sprites'
import { getMe, go } from '../main'
import skillsJson from '../../content/skills.json'
import { sfx } from '../ui/sound'

/**
 * Battle: startBattle -> [ useSkill -> answer (pet question) -> answer (anomaly dodge) ] x rounds -> finish.
 * The server picks every question, keeps the answer key and decides every effect. This screen only draws.
 */
export async function battleScreen(body: HTMLElement, params: Record<string, string>): Promise<void> {
  const me = getMe()!
  const [stages, start] = await Promise.all([api.stages(1), api.startBattle(params.ghost ? { stageId: params.stageId, petId: me.partner!.id, mode: 'GHOST', ghostOf: params.ghost } : { stageId: params.stageId, petId: me.partner!.id, mode: 'STORY' })])
  const stage = stages.find((s) => s.id === params.stageId) as StageSummary
  let state: BattleState = start.state
  let question: Question | null = null
  let picks: number[] = []
  let pixels: number[] = []
  let gone: number[] = []
  let busy = false
  let timer: ReturnType<typeof setInterval> | null = null
  let deadline = 0
  let lastQ: Question | null = null
  const say = (t: string) => t.replaceAll('{pet}', state.pet.nickname).replaceAll('{player}', me.nickname)

  body.innerHTML = `<div class="battle">
    <div class="btop"><span>${state.ghost ? `👻 ${esc(state.ghost.nickname)}의 기록 ${state.ghost.score}점에 도전 · ` : '1장 · '}${esc(stage.nameKo)}</span><span class="c" id="round"></span>
      <div class="timer" id="tmr" style="visibility:hidden"><span id="tl"></span><div class="tb"><i id="tf"></i></div><b id="ts"></b></div>
      <button class="tb-btn" data-act="sound" id="snd">${sfx.on ? '🔊' : '🔇'}</button><button class="tb-btn" data-act="report" title="문제 신고">🚩</button><button class="tb-btn" data-act="exit">나가기</button></div>
    <div class="scene ${stage.isBoss ? 'boss' : ''}" id="scene">
      <div class="plat o"></div><div class="anomaly" id="op">${anomalySprite(stage.id, stage.isBoss)}</div>
      <div class="plat m"></div><div class="me" id="mePet">${petImg(state.pet.speciesId, state.pet.form)}</div>
      <div class="panel o"><div class="nm"><b>${esc(stage.anomalyKo)}</b><span class="tag">${stage.isBoss ? 'BOSS' : '이상 현상'}</span></div>
        <div class="hp"><em class="g">불안정</em><div class="bar gauge"><i id="gBar"></i></div></div><div class="num" id="gNum"></div></div>
      <div class="panel m"><div class="nm"><b>${esc(state.pet.nickname)}</b><span class="tag">Lv.${state.pet.level} ${FORM_KO[state.pet.form]}</span></div>
        <div class="hp"><em>에너지</em><div class="bar"><i id="eBar"></i></div></div><div class="row between small"><span class="combo" id="combo"></span><b id="eNum"></b></div></div>
      <div id="fx"></div>
    </div>
    <div class="bottom" id="bottom"></div></div>`
  const scene = $('#scene', body), bottom = $('#bottom', body)

  function panels(): void {
    const s = state
    $('#round', body).textContent = `라운드 ${Math.min(s.round, s.maxRounds)} / ${s.maxRounds}`
    $('#gBar', body).style.width = `${(Math.max(0, s.gauge) / s.maxGauge) * 100}%`
    $('#gNum', body).textContent = `${Math.max(0, s.gauge)} / ${s.maxGauge}`
    const e = $('#eBar', body)
    e.style.width = `${(Math.max(0, s.energy) / s.maxEnergy) * 100}%`
    e.style.background = s.energy / s.maxEnergy <= 0.25 ? '#dc2626' : s.energy / s.maxEnergy <= 0.5 ? '#f59e0b' : ''
    $('#eNum', body).textContent = `${Math.max(0, s.energy)} / ${s.maxEnergy}`
    $('#combo', body).innerHTML = `콤보 <b>×${s.combo.toFixed(1)}</b>`
  }
  function callout(t: string, warn = false): void {
    $$('.callout', scene).forEach((c) => c.remove())
    const d = document.createElement('div'); d.className = 'callout' + (warn ? ' warn' : ''); d.textContent = t
    scene.appendChild(d); setTimeout(() => d.remove(), 2200)
  }
  function pop(who: 'me' | 'op', text: string, cls = ''): void {
    const d = document.createElement('div'); d.className = 'pop ' + cls; d.textContent = text
    d.style.cssText = who === 'op' ? 'right:16%;top:8%' : 'left:16%;bottom:46%'
    $('#fx', body).appendChild(d); setTimeout(() => d.remove(), 1700)
  }
  function anim(who: 'me' | 'op', cls: string): void {
    const el = who === 'me' ? $('#mePet', body) : $('#op', body)
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600)
  }

  /* ---------- timer ---------- */
  function startTimer(sec: number, label: string): void {
    stopTimer()
    deadline = Date.now() + sec * 1000
    const t = $('#tmr', body); t.style.visibility = 'visible'; $('#tl', body).textContent = label
    const tick = () => {
      const left = Math.max(0, deadline - Date.now())
      $('#tf', body).style.width = `${(left / (sec * 1000)) * 100}%`
      $('#ts', body).textContent = `${Math.ceil(left / 1000)}초`
      t.classList.toggle('low', left < 5000)
      if (left <= 0) { stopTimer(); void submit(null) }
    }
    tick(); timer = setInterval(tick, 250)
  }
  function stopTimer(): void { if (timer) clearInterval(timer); timer = null; const t = body.querySelector<HTMLElement>('#tmr'); if (t) t.style.visibility = 'hidden' }

  /* ---------- drawing the bottom panel ---------- */
  function drawSkills(): void {
    question = null
    bottom.innerHTML = `<div class="qhead"><b>⚔ 내 차례: 스킬을 골라요</b><span class="small mute">맞히면 게이지 -(위력 × 콤보 ×${state.combo.toFixed(1)}) · 틀려도 벌칙 없음</span></div>
      <div class="skills">${state.pet.skills.map((k) => `<button class="skill ${k.category === state.pet.type ? 'match' : ''} ${k.signature ? 'sig' : ''}" data-act="skill" data-id="${k.id}">
        <span class="row between"><b>${CAT_ICON[k.category]} ${esc(k.nameKo)}</b>${k.signature ? '<span class="tag">시그니처</span>' : ''}</span>
        <span class="small"><span class="tag cat-${k.category}">${CAT_KO[k.category]}</span> ${k.category === state.pet.type ? '타입 보너스 +20%' : ''}</span>
        <span class="pw">위력 ${Math.round(k.power * state.combo)}</span></button>`).join('')}</div>`
  }
  function drawQuestion(): void {
    const q = question!
    const p = q.payload
    const dodge = state.phase === 'ANOMALY_QUESTION'
    let inner = ''
    switch (p.kind) {
      case 'choice4':
        inner = `<div class="choices">${p.choices.map((c, i) => `<button class="ch ${gone.includes(i) ? 'gone' : ''}" data-act="ans" data-v="${i}"><b>${i + 1}</b>${esc(c)}</button>`).join('')}</div>`; break
      case 'ox':
        inner = `<div class="choices"><button class="ch ox" data-act="ox" data-v="O">O</button><button class="ch ox" data-act="ox" data-v="X">X</button></div>`; break
      case 'puzzle':
        inner = `<div class="puzseq">${p.seq.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
          <div class="choices">${p.choices.map((c, i) => `<button class="ch ${gone.includes(i) ? 'gone' : ''}" data-act="ans" data-v="${i}"><b>${i + 1}</b>${esc(c)}</button>`).join('')}</div>`; break
      case 'keyword':
        inner = `<form class="row" id="kwf"><input class="inp" id="kw" style="max-width:320px" autocomplete="off" placeholder="정답을 입력해요"><button class="btn">확인 ▶</button></form>`; break
      case 'order': case 'command_order': {
        const cmd = p.kind === 'command_order'
        inner = `<div class="small mute" style="margin-bottom:6px">${cmd ? '🤖 명령 블록을 실행할 순서대로 눌러요' : '순서대로 눌러서 칸을 채워요'} · 채운 칸을 누르면 빠져요</div>
          <div class="slots">${p.items.map((_, k) => { const x = picks[k]; return `<button class="slot ${x !== undefined ? 'on' : ''} ${cmd ? 'cmd' : ''}" data-act="unpick" data-k="${k}"><b>${k + 1}</b>${x !== undefined ? esc(p.items[x]) : '<span class="mute">비어 있음</span>'}</button>` }).join('')}</div>
          <div class="choices">${p.items.map((t, i) => picks.includes(i) ? '' : `<button class="ch" data-act="pick" data-v="${i}">${cmd ? '▶ ' : ''}${esc(t)}</button>`).join('')}</div>
          <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn out sm" data-act="reset">↺ 다시</button><button class="btn" data-act="send" ${picks.length < p.items.length ? 'disabled' : ''}>확인 ▶</button></div>`; break
      }
      case 'pixel_art': {
        const n = p.size
        if (pixels.length !== n * n) pixels = Array(n * n).fill(0)
        inner = `<div class="pix"><div><div class="small mute">목표</div><div class="pgrid target" style="grid-template-columns:repeat(${n},14px)">${p.target.join('').split('').map((c) => `<i class="${c === '1' ? 'on' : ''}"></i>`).join('')}</div></div>
          <div><div class="small mute">칸을 눌러 색칠해요</div><div class="pgrid" style="grid-template-columns:repeat(${n},30px)">${pixels.map((v, i) => `<i class="${v ? 'on' : ''}" data-act="px" data-i="${i}"></i>`).join('')}</div></div>
          <div style="align-self:end"><button class="btn" data-act="sendPx">확인 ▶</button></div></div>`; break
      }
    }
    bottom.innerHTML = `<div class="qhead"><span>${dodge ? '<span class="tag" style="background:#fecaca">💨 피하기</span>' : '<span class="tag" style="background:#fde68a">⚔ 공격</span>'}
        <span class="tag cat-${q.category}">${CAT_KO[q.category]}</span> <span class="tag">${TYPE_KO[q.missionType]}</span></span>
        <span class="small mute">${dodge ? `맞히면 회피 + 콤보 · 틀리면 에너지 -${stage.isBoss ? 20 : 15}` : '맞히면 게이지가 내려가요'}</span></div>
      <div class="qtext">${esc(q.prompt)}</div>${inner}
      ${q.hintAvailable && !dodge && !gone.length ? `<div style="margin-top:8px"><button class="btn out sm" data-act="hint">🔎 리코의 분석 (3셀): 오답 하나 지우기</button></div>` : ''}`
    const f = bottom.querySelector<HTMLFormElement>('#kwf')
    if (f) { f.onsubmit = (e) => { e.preventDefault(); void submit($<HTMLInputElement>('#kw', body).value) }; $<HTMLInputElement>('#kw', body).focus() }
  }
  function answerText(q: Question, a: Answer): string {
    const p = q.payload
    if (a === null) return '-'
    if ((p.kind === 'choice4' || p.kind === 'puzzle') && typeof a === 'number') return String(p.choices[a])
    if ((p.kind === 'order' || p.kind === 'command_order') && Array.isArray(a)) return a.map((i, k) => `${k + 1}. ${p.items[i as number]}`).join('  →  ')
    if (p.kind === 'pixel_art') return '목표 그림과 똑같이'
    return String(a)
  }
  function drawFeedback(r: AnswerRes, q: Question): void {
    const over = r.state.phase === 'WON' || r.state.phase === 'LOST'
    bottom.innerHTML = `<div class="feedback"><div>
        <span class="verdict ${r.correct ? 'ok' : 'no'}">${r.correct ? '⭕ 정답!' : '❌ 아쉬워요'}</span> <b style="margin-left:8px">${esc(r.effect.noteKo)}</b>
        <div class="explain"><b>📘 해설</b> ${esc(r.explanation)}<div class="small" style="margin-top:4px"><b>정답:</b> ${esc(answerText(q, r.correctAnswer))}</div></div>
        ${r.correct ? '' : '<div class="small mute" style="margin-top:6px">틀려도 괜찮아요! 해설을 읽고 다음에 맞혀 봐요.</div>'}</div>
      <div style="display:grid;gap:8px"><button class="btn big ${over ? 'gold' : ''}" data-act="next" id="nextBtn">${over ? '결과 보기 ▶' : r.nextQuestion ? '⚠ 상대 차례 ▶' : '다음 라운드 ▶'}</button></div></div>`
    setTimeout(() => body.querySelector<HTMLButtonElement>('#nextBtn')?.focus(), 50)
  }

  /* ---------- flow ---------- */
  let pending: AnswerRes | null = null
  async function turnStart(): Promise<void> {
    panels()
    if (state.phase === 'PICK_SKILL') {
      await splash(scene, `ROUND ${state.round}`, state.round === state.maxRounds ? '마지막 라운드!' : '', 900)
      drawSkills()
    }
  }
  async function submit(a: Answer): Promise<void> {
    if (!question || busy) return
    busy = true; stopTimer()
    const q = question
    try {
      const r = await api.answer(state.battleId, q.id, a)
      lastQ = q
      const dodge = state.phase === 'ANOMALY_QUESTION'
      state = r.state; pending = r; question = null; picks = []; pixels = []; gone = []
      if (r.correct) sfx.good(); else sfx.bad()
      if (!dodge) {
        if (r.effect.kind === 'DAMAGE') { anim('op', 'hit'); pop('op', `-${r.effect.amount}`); sfx.hit() } else pop('op', '빗나감', 'dim')
      } else if (r.effect.kind === 'DODGE') pop('me', '회피!')
      else { anim('me', 'hit'); pop('me', `-${r.effect.amount}`, 'bad'); sfx.hit() }
      panels()
      drawFeedback(r, q)
      if (state.phase === 'WON') { await sleep(600); $('#op', body).classList.add('ko'); void splash(scene, '잠재웠다!', '', 1300); sfx.win() }
      if (state.phase === 'LOST') { void splash(scene, state.energy <= 0 ? '에너지 0' : '라운드 끝', '괜찮아, 다시 도전!', 1300) }
    } catch (e) { showError(e) } finally { busy = false }
  }
  async function next(): Promise<void> {
    if (busy || !pending) return
    const r = pending
    pending = null
    if (state.phase === 'WON' || state.phase === 'LOST') return finish()
    if (r.nextQuestion) {
      question = r.nextQuestion
      callout(`${stage.anomalyKo}의 공격! 문제를 맞혀서 피해요!`, true); anim('op', 'lunge-op'); sfx.warn()
      drawQuestion(); startTimer(question.timeLimitS, '피하기')
      return
    }
    await turnStart()
  }
  async function finish(): Promise<void> {
    stopTimer()
    busy = true
    try {
      const r = await api.finish(state.battleId)
      drawResult(r)
    } catch (e) { showError(e); busy = false }
  }

  /* ---------- result ---------- */
  function drawResult(r: FinishRes): void {
    const nextStage = stages.find((s) => s.order === stage.order + 1)
    const p = r.pet
    const pct = p.xpToNext ? Math.round((p.xp / p.xpToNext) * 100) : 100
    const lines = r.dialogue.map((l) => talk(l.speaker, say(l.text))).join('')
    const sk = r.levelUp?.newSkillId ? skillsJson.skills.find((s) => s.id === r.levelUp!.newSkillId) : null
    body.innerHTML = `<div class="result"><div class="conf" id="conf"></div>
      <div class="left"><div class="big ${r.won ? '' : 'lose'}">${r.won ? '클리어!' : '다시 도전!'}</div>
        ${r.won ? `<div class="stars">${'★'.repeat(r.stars)}<span>${'★'.repeat(3 - r.stars)}</span></div>` : ''}
        <div class="rpet">${petImg(p.speciesId, p.form)}</div>
        <div><b>${esc(p.nickname)}</b> · 남은 에너지 ${r.record.energyLeft} · 정답률 ${r.record.accuracy}%</div>
        <div class="small">${r.ghost ? `점수 = 남은 에너지 × 10 + 정답률 × 5 + 남은 라운드 × 50` : r.won ? (r.stars === 3 ? '에너지 80 이상 → ★★★' : r.stars === 2 ? '에너지 50 이상 → ★★ (80 이상이면 ★★★)' : '클리어 ★ (에너지 50 이상이면 ★★)') : '실패해도 잃는 건 없어요'}</div>
      </div>
      <div class="right">
        ${lines}
        ${r.ghost ? `<div class="box"><h3>👻 친구 기록 도전</h3><div class="rw"><span>내 점수</span><b>${r.ghost.mine}</b></div><div class="rw"><span>${esc(state.ghost?.nickname ?? '친구')}의 기록</span><b>${r.ghost.theirs}</b></div>
          <p><b style="color:${r.ghost.won ? '#16a34a' : '#b45309'}">${r.ghost.won ? '🏆 이겼어요!' : '아쉽게 졌어요. 다시 도전!'}</b></p></div>` : ''}
        <div class="box"><h3>🎁 보상</h3>
          <div class="rw"><span>경험치</span><b>+${r.xpGained} XP</b></div>
          ${r.won ? (r.practiceMode ? '<div class="rw"><span>셀</span><b>오늘 보상 한도 도달 (연습 모드)</b></div>' : `<div class="rw"><span>셀 → 우편함 ✉</span><b>${r.cellsMailed}셀${r.firstClearOfDayBonus ? ' (오늘 첫 클리어 +5 포함)' : ''}</b></div>`) : ''}
          ${r.egg ? `<div class="egg-got" style="margin-top:6px"><i class="e">${eggSprite(r.egg.rarity)}</i><div><b>${RARITY_KO[r.egg.rarity]} 알 획득!</b><div class="small">${esc(r.eggNoteKo)} · ${r.egg.inNest ? '둥지에 넣었어요' : '알 상자로 갔어요'}</div></div></div>` : r.eggNoteKo ? `<div class="small mute">🥚 ${esc(r.eggNoteKo)}</div>` : ''}
          ${r.unlocksKo.map((u) => `<div class="rw"><b>${esc(u)}</b></div>`).join('')}
        </div>
        <div class="box"><h3>${esc(p.nickname)} <span class="tag">Lv.${p.level} ${FORM_KO[p.form]}</span><small>${p.xp} / ${p.xpToNext || 'MAX'} XP</small></h3>
          <div class="bar xp"><i style="width:${pct}%"></i></div>
          ${r.levelUp ? `<p><b style="color:#16a34a">🎉 레벨 업! Lv.${r.levelUp.from} → Lv.${r.levelUp.to}</b>${r.levelUp.newForm ? ` · <b style="color:#7c3aed">✨ ${FORM_KO[r.levelUp.newForm]} 모습으로 성장!</b>` : ''}${sk ? ` · <b style="color:#b45309">⚡ 시그니처 스킬: ${esc(sk.name_ko)}</b>` : ''}</p>` : ''}
        </div>
        <div class="row">${r.won && r.cellsMailed ? '<button class="btn gold" data-act="mail">✉ 우편함</button>' : ''}
          ${r.egg ? '<button class="btn purple" data-act="room">🏠 마이룸</button>' : ''}
          ${r.ghost ? '<button class="btn purple" data-act="br">⚔ 배틀룸</button>' : r.won && nextStage ? `<button class="btn" data-act="again" data-id="${nextStage.id}">다음: ${esc(nextStage.nameKo)} ▶</button>` : ''}
          ${!r.won && !r.ghost ? `<button class="btn" data-act="again" data-id="${stage.id}">다시 도전</button>` : ''}
          <button class="btn out" data-act="map">1장 지도</button></div>
      </div></div>`
    if (r.won) {
      const col = ['#fbbf24', '#3b82f6', '#14b8a6', '#f472b6', '#a78bfa', '#fff']
      $('#conf', body).innerHTML = Array.from({ length: 50 }, () => `<i style="left:${Math.random() * 100}%;background:${col[Math.floor(Math.random() * 6)]};animation-duration:${3 + Math.random() * 4}s;animation-delay:${Math.random() * 3}s"></i>`).join('')
    }
  }

  /* ---------- clicks ---------- */
  onAct(body, {
    skill: async (el) => {
      if (busy || state.phase !== 'PICK_SKILL') return
      busy = true
      try {
        const k = state.pet.skills.find((s) => s.id === el.dataset.id)!
        const r = await api.useSkill(state.battleId, k.id)
        state = r.state; question = r.question; gone = []; picks = []; pixels = []
        callout(`${state.pet.nickname}의 ${k.nameKo}!`); anim('me', 'lunge-me'); sfx.go()
        drawQuestion(); startTimer(question.timeLimitS, '미션')
      } catch (e) { showError(e) } finally { busy = false }
    },
    ans: (el) => { submitMark(el); void submit(Number(el.dataset.v)) },
    ox: (el) => { submitMark(el); void submit(el.dataset.v as 'O' | 'X') },
    pick: (el) => { picks.push(Number(el.dataset.v)); sfx.tick(); drawQuestion() },
    unpick: (el) => { const k = Number(el.dataset.k); if (picks[k] !== undefined) { picks.splice(k, 1); drawQuestion() } },
    reset: () => { picks = []; drawQuestion() },
    send: () => void submit([...picks]),
    px: (el) => { const i = Number(el.dataset.i); pixels[i] = pixels[i] ? 0 : 1; el.classList.toggle('on') },
    sendPx: () => void submit([...pixels]),
    hint: async () => {
      try { const h = await api.hint(state.battleId); gone.push(h.removeChoiceIndex); toast(`리코: 이건 확실히 아니야! (보유 ${h.cells}셀)`); drawQuestion() } catch (e) { showError(e) }
    },
    next: () => void next(),
    sound: (el) => { sfx.toggle(); el.textContent = sfx.on ? '🔊' : '🔇' },
    report: () => {
      const q = question ?? lastQ
      if (!q) { toast('신고할 문제가 아직 없어요'); return }
      const m = modal(`<h2>🚩 이 문제를 신고할까요?</h2><p class="mute">${esc(q.prompt)}</p>
        ${['정답이 틀린 것 같아요', '문제가 이상해요', '너무 어려워요', '기타'].map((r, i) => `<label class="row"><input type="radio" name="rr" value="${r}" ${i ? '' : 'checked'}>${r}</label>`).join('')}
        <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn out" data-act="close">취소</button><button class="btn red" data-act="send">신고하기</button></div>`)
      onAct(m, { close: closeModal, send: async () => { await api.reportQuestion(q.id, (m.querySelector<HTMLInputElement>('input[name=rr]:checked')!).value); closeModal(); toast('신고했어요. 운영팀이 확인할 거예요') } })
    },
    exit: () => {
      const m = modal(`<h2>배틀에서 나갈까요?</h2><p>이번 배틀은 기록되지 않아요. <b>벌칙은 없어요.</b></p><div class="row" style="justify-content:flex-end"><button class="btn out" data-act="close">계속하기</button><button class="btn red" data-act="leave">나가기</button></div>`)
      onAct(m, { close: closeModal, leave: () => { closeModal(); stopTimer(); go('map') } })
    },
    mail: () => go('mail'), room: () => go('room'), map: () => go('map'), br: () => go('battleroom'),
    again: (el) => go('battle', { stageId: el.dataset.id! }),
  })
  function submitMark(el: HTMLElement): void { el.style.outline = '3px solid #3b82f6' }

  // keyboard: 1-4 for choices / skills, O/X, Enter = next
  const onKey = (e: KeyboardEvent) => {
    if (!body.isConnected) { document.removeEventListener('keydown', onKey); return }
    if (document.getElementById('modal') || (e.target as HTMLElement).tagName === 'INPUT') return
    const n = Number(e.key)
    if (question && (question.payload.kind === 'choice4' || question.payload.kind === 'puzzle') && n >= 1 && n <= 4 && !gone.includes(n - 1)) void submit(n - 1)
    else if (question?.payload.kind === 'ox' && /^[oOxX]$/.test(e.key)) void submit(e.key.toUpperCase() as 'O' | 'X')
    else if (!question && state.phase === 'PICK_SKILL' && n >= 1 && n <= 4 && bottom.querySelector('.skills')) (bottom.querySelectorAll<HTMLElement>('.skill')[n - 1])?.click()
    else if (e.key === 'Enter' && pending) void next()
  }
  document.addEventListener('keydown', onKey)

  // intro lines (first attempt only), then round 1
  panels()
  if (start.intro.length) {
    let i = 0
    const ov = document.createElement('div'); ov.className = 'intro-ov'
    const show = () => { ov.innerHTML = `<div style="width:min(720px,100%);display:grid;gap:10px">${talk(start.intro[i].speaker, say(start.intro[i].text))}<div class="row" style="justify-content:flex-end"><button class="btn gold" id="ib">${i < start.intro.length - 1 ? '다음 ▶' : '시험 시작! ⚔'}</button></div></div>` ; ov.querySelector<HTMLButtonElement>('#ib')!.onclick = () => { if (++i < start.intro.length) show(); else { ov.remove(); void turnStart() } } }
    show(); scene.appendChild(ov)
  } else await turnStart()
}
