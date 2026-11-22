import { api, type TrialAnswer, type TrialQ } from '../api'
import { $, esc, onAct, splash, talk, toast } from '../ui/dom'
import { CAT_KO } from '../ui/sprites'
import { go } from '../main'
import stagesJson from '../../content/stages.json'
const STAGE_KO: Record<string, string> = Object.fromEntries(stagesJson.stages.map((x) => [x.id, x.name_ko]))
import { sfx } from '../ui/sound'

/** Battle Room · Weekly Trial: same 8 questions for everyone this week, best score counts. */
export async function battleRoomScreen(body: HTMLElement): Promise<void> {
  const lobby = await api.battleRoom()
  const fr = lobby.unlocked ? await api.friends() : null
  if (!lobby.unlocked) {
    body.innerHTML = `<div class="row between" style="margin-bottom:12px"><h2>🔒 배틀룸</h2><button class="btn out sm" data-act="hub">← 홈</button></div>
      ${talk('codex', '배틀룸은 1장 보스 "사파리 동굴"을 잠재운 대원에게만 열린다.')}`
    onAct(body, { hub: () => go('hub') })
    return
  }
  body.innerHTML = `<div class="row between" style="margin-bottom:12px"><h2>⚔ 배틀룸 · 이번 주 시험</h2><button class="btn out sm" data-act="hub">← 홈</button></div>
    <div class="grid2"><div style="display:grid;gap:12px;align-content:start">
      ${talk('codex', `이번 주 시험은 모두에게 똑같은 ${lobby.questions}문제다. 빨리, 연속으로 맞힐수록 점수가 높지. 다른 대원이 접속해 있지 않아도 기록으로 겨룰 수 있다.`)}
      <div class="box"><h3>📜 규칙</h3><div class="small">· 문제마다 ${lobby.timeLimitS}초 · 정답 100점 + 남은 초 × 5점<br>· 연속 정답으로 콤보 (최대 ×2.0) → 최고 콤보 × 50점 보너스<br>· 몇 번이든 도전 가능, <b>가장 높은 점수</b>가 기록돼요 · 매주 월요일 0시 초기화</div>
        <div class="row" style="margin-top:10px"><button class="btn big gold" data-act="start">⚔ 도전하기</button><span class="small">내 최고 ${lobby.myBest ?? '-'}점 ${lobby.myRank ? `· ${lobby.myRank}등` : ''} · 도전 ${lobby.myRuns}번</span></div></div></div>
      <div class="box"><h3>🏆 이번 주 랭킹 <small>${lobby.weekStart} 주</small></h3>
        <table class="t"><tr><th>#</th><th>대원</th><th>점수</th></tr>${lobby.top.map((t, i) => `<tr style="${t.me ? 'background:#fef9c3' : ''}"><td>${['🥇', '🥈', '🥉'][i] ?? i + 1}</td><td>${esc(t.nickname)}${t.me ? ' (나)' : ''}</td><td><b>${t.score}</b></td></tr>`).join('') || '<tr><td colspan="3" class="mute center">아직 기록이 없어요. 첫 번째가 되어 봐요!</td></tr>'}</table></div></div>
    <div class="box" style="margin-top:16px"><h3>👻 친구 기록 도전 <small>친구가 접속해 있지 않아도 OK · 같은 문제로 점수 겨루기</small></h3>
      <div class="row between"><span>내 친구 코드: <b style="font-size:20px;letter-spacing:3px">${fr!.code}</b></span>
        <form class="row" id="ff"><input class="inp" id="fc" maxlength="6" placeholder="친구 코드 6자리" style="width:160px;text-transform:uppercase"><button class="btn sm">친구 추가</button></form></div>
      ${fr!.friends.length ? `<table class="t" style="margin-top:10px"><tr><th>친구</th><th>스테이지</th><th>친구 기록</th><th>내 기록</th><th></th></tr>
        ${fr!.friends.flatMap((f) => f.records.map((r) => { const mine = fr!.mine.find((m) => m.stageId === r.stageId)
          return `<tr><td>${esc(f.nickname)}</td><td>${STAGE_KO[r.stageId] ?? r.stageId}</td><td><b>${r.score}</b>점 ${'★'.repeat(r.stars)}</td><td>${mine ? `${mine.score}점` : '-'}</td>
            <td><button class="btn sm purple" data-act="ghost" data-stage="${r.stageId}" data-code="${f.friend_code}" ${mine ? '' : 'disabled title="먼저 이 스테이지를 깨요"'}>도전</button></td></tr>` })).join('') || '<tr><td colspan="5" class="mute center">친구가 아직 깬 스테이지가 없어요</td></tr>'}</table>`
        : '<p class="small mute">친구 코드를 서로 넣으면 친구의 스테이지 최고 기록에 도전할 수 있어요. 이기면 10셀, 져도 3셀 (친구당 하루 2번).</p>'}</div>`
  const ff = body.querySelector<HTMLFormElement>('#ff')
  if (ff) ff.onsubmit = async (e) => { e.preventDefault(); try { const r = await api.addFriend($<HTMLInputElement>('#fc', body).value); toast(`${r.nickname}와(과) 친구가 됐어요!`); go('battleroom') } catch (er) { toast((er as Error).message, true) } }
  onAct(body, { hub: () => go('hub'), start: () => run(body), ghost: (el) => go('battle', { stageId: el.dataset.stage!, ghost: el.dataset.code! }) })
}

async function run(body: HTMLElement): Promise<void> {
  const st = await api.trialStart()
  const runId = st.runId
  let cur: TrialQ | null = st
  let score = 0, combo = 1, timer: ReturnType<typeof setInterval> | null = null, busy = false
  body.innerHTML = `<div class="row between" style="margin-bottom:10px"><h2>⚔ 이번 주 시험</h2><div class="row"><span class="chip" style="background:#1f1a30;color:#fff">점수 <b id="sc">0</b></span><span class="chip" style="background:#1f1a30;color:#fff">콤보 <b id="cb">×1.0</b></span></div></div>
    <div class="box" id="tq" style="position:relative;min-height:300px"></div>`
  const box = $('#tq', body)
  const stop = () => { if (timer) clearInterval(timer); timer = null }
  const draw = (q: TrialQ) => {
    const p = q.question.payload
    box.innerHTML = `<div class="qhead"><span><span class="tag">${q.index + 1} / ${q.total}</span> <span class="tag cat-${q.question.category}">${CAT_KO[q.question.category]}</span></span>
        <div class="timer" style="color:#1f1a30"><div class="tb" style="border-color:#1f1a30"><i id="tf"></i></div><b id="ts"></b></div></div>
      <div class="qtext">${esc(q.question.prompt)}</div>
      ${p.kind === 'choice4' ? `<div class="choices">${p.choices.map((c, i) => `<button class="ch" data-act="a" data-v="${i}"><b>${i + 1}</b>${esc(c)}</button>`).join('')}</div>`
        : '<div class="choices"><button class="ch ox" data-act="a" data-v="O">O</button><button class="ch ox" data-act="a" data-v="X">X</button></div>'}`
    const end = Date.now() + q.question.timeLimitS * 1000
    stop()
    const tick = () => { const left = Math.max(0, end - Date.now()); const f = box.querySelector<HTMLElement>('#tf'); if (!f) return stop(); f.style.width = `${(left / (q.question.timeLimitS * 1000)) * 100}%`; $('#ts', box).textContent = `${Math.ceil(left / 1000)}초`; if (left <= 0) { stop(); void answer(null) } }
    tick(); timer = setInterval(tick, 200)
  }
  const answer = async (a: string | number | null) => {
    if (busy || !cur) return
    busy = true; stop()
    try {
      const r: TrialAnswer = await api.trialAnswer(runId, a)
      score = r.score; combo = r.combo
      $('#sc', body).textContent = String(score); $('#cb', body).textContent = `×${combo.toFixed(1)}`
      if (r.correct) sfx.good(); else sfx.bad()
      box.querySelectorAll<HTMLButtonElement>('.ch').forEach((b) => {
        b.disabled = true
        const v = b.dataset.v!
        if (String(r.correctAnswer) === v) b.classList.add('right'); else if (String(a) === v) b.classList.add('wrong')
      })
      box.insertAdjacentHTML('beforeend', `<div class="explain">${r.correct ? `⭕ +${100 + r.timeLeft * 5}점 (남은 ${r.timeLeft}초)` : '❌'} · ${esc(r.explanation)}</div>
        <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn ${r.done ? 'gold' : ''}" data-act="next">${r.done ? '결과 보기 ▶' : '다음 ▶'}</button></div>`)
      cur = r.next
      if (r.done) cur = null
      nextDone = r.done
    } finally { busy = false }
  }
  let nextDone = false
  onAct(body, {
    a: (el) => void answer(el.dataset.v === 'O' || el.dataset.v === 'X' ? el.dataset.v : Number(el.dataset.v)),
    next: async () => {
      if (nextDone) {
        await splash(body, `${score}점!`, '이번 주 기록', 1100)
        toast(`이번 주 시험 ${score}점`)
        go('battleroom')
      } else if (cur) draw(cur)
    },
  })
  draw(st)
}
