import { api, type AdminQuestion } from '../api'
import { $, esc, modal, closeModal, onAct, toast, showError } from '../ui/dom'
import { CAT_KO, TYPE_KO, RARITY_KO } from '../ui/sprites'

let tab: 'dash' | 'questions' | 'reports' | 'settings' | 'sql' = 'dash'
const filters: Record<string, string> = { status: '', category: '', type: '', search: '' }
const STATUS_KO: Record<string, string> = { draft: '초안', approved: '승인', hidden: '숨김' }

/** DORO operator page: question management (draft -> approved / hidden), reports, and live SQL stats. */
export async function adminScreen(body: HTMLElement): Promise<void> {
  const draw = async () => {
    const head = `<div class="row between" style="margin-bottom:12px"><h2>🛠 코덱스의 시험 · 운영 관리</h2>
      <div class="tabs" style="margin:0"><button class="tab ${tab === 'dash' ? 'on' : ''}" data-act="tab" data-t="dash">📊 현황</button>
      <button class="tab ${tab === 'questions' ? 'on' : ''}" data-act="tab" data-t="questions">📝 문제 관리</button>
      <button class="tab ${tab === 'reports' ? 'on' : ''}" data-act="tab" data-t="reports">🚩 신고</button>
      <button class="tab ${tab === 'settings' ? 'on' : ''}" data-act="tab" data-t="settings">⚙ 게임 설정</button>
      <button class="tab ${tab === 'sql' ? 'on' : ''}" data-act="tab" data-t="sql">🧪 SQL 실험실</button></div></div>`
    if (tab === 'dash') {
      const s = await api.admin.stats()
      const t = s.totals
      body.innerHTML = head + `<div class="adm">
        <div class="tiles">${[['학생', t.students], ['승인된 문제', t.approved], ['초안', t.drafts], ['미확인 신고', t.reports], ['배틀', t.battles], ['답한 문제', t.answers], ['펫', t.pets], ['부화한 알', t.hatched]].map(([k, v]) => `<div class="tile"><small>${k}</small><b>${v}</b></div>`).join('')}</div>
        <div class="grid2"><div class="box"><h3>분야별 (DIMC) <small>문제 수 · 학생 정답률</small></h3>
            <table class="t"><tr><th>분야</th><th>승인 문제</th><th>정답률</th></tr>${s.byCat.map((c: any) => `<tr><td>${c.name_ko}</td><td>${c.approved}</td><td>${c.accuracy}%</td></tr>`).join('')}</table>
            <div class="sql">SELECT c.name_ko, count(q.*) FILTER (WHERE q.status='approved'),
  avg(t.is_correct::int) FROM question_categories c
  LEFT JOIN questions q ON q.category_id = c.id ...</div></div>
          <div class="box"><h3>가장 어려운 문제 <small>2번 이상 나온 문제</small></h3>
            <table class="t"><tr><th>문제</th><th>답변</th><th>정답률</th></tr>${s.hardest.map((h: any) => `<tr><td>${esc(h.prompt)}</td><td>${h.answered}</td><td>${h.accuracy}%</td></tr>`).join('') || '<tr><td colspan="3" class="mute">아직 데이터가 없어요</td></tr>'}</table>
            <div class="sql">SELECT q.prompt, count(*), avg(t.is_correct::int) FROM battle_turns t
  JOIN questions q ON q.id = t.question_id GROUP BY q.id HAVING count(*) >= 2
  ORDER BY 3 LIMIT 5</div></div></div>
        <div class="box"><h3>학생 진행 <small>stage_progress · pets</small></h3><table class="t"><tr><th>닉네임</th><th>아이디</th><th>클리어 스테이지</th><th>펫</th><th>셀</th></tr>
          ${s.students.map((x: any) => `<tr><td>${esc(x.nickname)}</td><td>${esc(x.username)}</td><td>${x.stages} / 7</td><td>${x.pets}</td><td>${x.cells}</td></tr>`).join('')}</table></div></div>`
    } else if (tab === 'questions') {
      const rows = await api.admin.questions(filters)
      body.innerHTML = head + `<div class="row" style="margin-bottom:10px">
          <select class="inp" style="width:auto" data-f="status"><option value="">모든 상태</option>${Object.entries(STATUS_KO).map(([k, v]) => `<option value="${k}" ${filters.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <select class="inp" style="width:auto" data-f="category"><option value="">모든 분야</option>${Object.entries(CAT_KO).map(([k, v]) => `<option value="${k}" ${filters.category === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <select class="inp" style="width:auto" data-f="type"><option value="">모든 유형</option>${Object.entries(TYPE_KO).map(([k, v]) => `<option value="${k}" ${filters.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <input class="inp" style="width:200px" placeholder="문제 검색" value="${esc(filters.search)}" data-f="search">
          <span class="sp" style="flex:1"></span><button class="btn gold" data-act="new">+ 문제 추가</button></div>
        <p class="small mute">${rows.length}개 · 승인된 문제만 배틀에 나와요. 학생 화면에는 정답이 절대 가지 않아요 (서버가 채점).</p>
        <table class="t"><tr><th>ID</th><th>분야</th><th>유형</th><th>문제</th><th>정답률</th><th>상태</th><th></th></tr>
        ${rows.map((q) => `<tr class="${q.status}"><td class="small">${q.id}</td><td><span class="tag cat-${q.category_id}">${CAT_KO[q.category_id]}</span></td><td class="small">${TYPE_KO[q.mission_type_id]}</td>
          <td>${esc(q.prompt)}${q.reports ? ` <span class="tag" style="background:#fecaca">🚩${q.reports}</span>` : ''}</td><td class="small">${q.answered ? `${q.accuracy}% (${q.answered})` : '-'}</td>
          <td class="st-${q.status}">${STATUS_KO[q.status]}</td>
          <td style="white-space:nowrap">${q.status !== 'approved' ? `<button class="btn sm green" data-act="st" data-id="${q.id}" data-s="approved">승인</button>` : `<button class="btn sm out" data-act="st" data-id="${q.id}" data-s="hidden">숨김</button>`}
            <button class="btn sm out" data-act="edit" data-id="${q.id}">수정</button></td></tr>`).join('')}</table>`
      body.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-f]').forEach((el) => {
        el.addEventListener(el.tagName === 'INPUT' ? 'change' : 'change', () => { filters[el.dataset.f!] = el.value; void draw() })
      })
      ;(window as any).__rows = rows
    } else if (tab === 'sql') {
      const list = await api.admin.sqlList()
      body.innerHTML = head + `<p class="small mute">정해진 읽기 전용 쿼리만 실행돼요 (READ ONLY 트랜잭션). 발표 때 실제 DB 값을 바로 보여 줄 수 있어요.</p>
        <div class="grid2" style="grid-template-columns:280px 1fr"><div style="display:grid;gap:8px;align-content:start">${list.map((x) => `<button class="mbtn" data-act="runSql" data-id="${x.id}" style="padding:8px 10px"><span><b style="font-size:13px">${esc(x.title)}</b><small>${esc(x.why)}</small></span></button>`).join('')}</div>
        <div class="box" id="sqlOut"><p class="mute">왼쪽에서 쿼리를 골라요.</p></div></div>`
    } else if (tab === 'settings') {
      const st = await api.admin.settings()
      const slots = ['stage3', 'stage6', 'boss']
      const SLOT_KO: Record<string, string> = { stage3: '3스테이지', stage6: '6스테이지', boss: '보스' }
      body.innerHTML = head + `<p class="small mute">코드를 고치지 않고 숫자를 바꿀 수 있어요. 저장하면 바로 DB에 반영되고, 게임 서버는 1분 안에 새 값을 읽어요.</p>
        <div class="grid2"><div class="box"><h3>🗺 1장 스테이지</h3><table class="t"><tr><th>스테이지</th><th>게이지</th><th>라운드</th><th></th></tr>
          ${st.stages.map((s) => `<tr><td>${s.is_boss ? '👁 ' : ''}${esc(s.name_ko)}<br><span class="small mute">${esc(s.anomaly_ko)}</span></td>
            <td><input class="inp" style="width:70px" type="number" id="g-${s.id}" value="${s.gauge}"></td><td><input class="inp" style="width:56px" type="number" id="r-${s.id}" value="${s.max_rounds}"></td>
            <td><button class="btn sm" data-act="saveStage" data-id="${s.id}">저장</button></td></tr>`).join('')}</table></div>
        <div style="display:grid;gap:14px;align-content:start">
          <div class="box"><h3>🥚 첫 클리어 알</h3><table class="t">${slots.map((sl) => { const cur = st.eggs.find((e) => e.slot === sl)?.rarity_id
            return `<tr><td>${SLOT_KO[sl]}</td><td><select class="inp" data-egg="${sl}">${st.rarities.map((r) => `<option value="${r}" ${r === cur ? 'selected' : ''}>${RARITY_KO[r as 'common']}</option>`).join('')}</select></td></tr>` }).join('')}</table></div>
          <div class="box"><h3>🎲 다시 깨기 드롭 확률 (%)</h3><table class="t"><tr><th></th>${st.rarities.map((r) => `<th>${RARITY_KO[r as 'common']}</th>`).join('')}</tr>
            ${slots.map((sl) => `<tr><td>${SLOT_KO[sl]}</td>${st.rarities.map((r) => `<td><input class="inp" style="width:56px;padding:4px" type="number" step="0.5" min="0" max="100" data-drop="${sl}:${r}" value="${st.drops.find((d) => d.slot === sl && d.rarity_id === r)?.percent ?? 0}"></td>`).join('')}</tr>`).join('')}</table>
            <p class="small mute">칸을 바꾸면 바로 저장돼요. 학생 화면의 스테이지 카드에 그대로 보여요.</p></div>
          <div class="box"><h3>🛍 상점 가격</h3><table class="t">${st.shop.map((i) => `<tr><td>${esc(i.name_ko)}</td><td><input class="inp" style="width:70px" type="number" data-price="${i.id}" value="${i.price}"></td></tr>`).join('')}</table></div>
        </div></div>`
      body.querySelectorAll<HTMLSelectElement>('[data-egg]').forEach((el) => el.addEventListener('change', async () => { try { await api.admin.setFirstEgg(el.dataset.egg!, el.value); toast('저장했어요') } catch (e) { showError(e) } }))
      body.querySelectorAll<HTMLInputElement>('[data-drop]').forEach((el) => el.addEventListener('change', async () => { const [sl, r] = el.dataset.drop!.split(':'); try { await api.admin.setDrop(sl, r, Number(el.value)); toast('저장했어요') } catch (e) { showError(e); await draw() } }))
      body.querySelectorAll<HTMLInputElement>('[data-price]').forEach((el) => el.addEventListener('change', async () => { try { await api.admin.setPrice(el.dataset.price!, Number(el.value)); toast('저장했어요') } catch (e) { showError(e) } }))
    } else {
      const reps = await api.admin.reports()
      body.innerHTML = head + `<table class="t"><tr><th>언제</th><th>학생</th><th>문제</th><th>이유</th><th></th></tr>
        ${reps.map((r) => `<tr><td class="small">${new Date(r.created_at).toLocaleString('ko-KR')}</td><td>${esc(r.nickname)}</td><td>${esc(r.prompt)} <span class="small mute">(${r.question_id})</span></td><td>${esc(r.reason)}</td>
          <td style="white-space:nowrap"><button class="btn sm out" data-act="editId" data-id="${r.question_id}">문제 수정</button><button class="btn sm green" data-act="resolve" data-id="${r.id}">확인함</button></td></tr>`).join('') || '<tr><td colspan="5" class="mute center">신고가 없어요 🎉</td></tr>'}</table>`
    }
  }

  function editor(q: AdminQuestion | null): void {
    const v = q ?? { id: '', category_id: 'ai', difficulty: 'easy', mission_type_id: 'choice4', prompt: '', payload: null, answer: 0, explanation: '', status: 'draft' } as unknown as AdminQuestion
    const P = v.payload ?? {}
    const m = modal(`<h2>${q ? `문제 수정 (${q.id})` : '문제 추가'}</h2><form id="qf">
      <div class="grid3"><div><label class="lb">분야</label><select class="inp" name="category">${Object.entries(CAT_KO).map(([k, n]) => `<option value="${k}" ${v.category_id === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div><label class="lb">유형</label><select class="inp" name="missionType" id="mt">${Object.entries(TYPE_KO).map(([k, n]) => `<option value="${k}" ${v.mission_type_id === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div><label class="lb">난이도</label><select class="inp" name="difficulty">${['easy', 'normal', 'hard'].map((d) => `<option ${v.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div></div>
      <label class="lb">문제</label><textarea class="inp" name="prompt" rows="2" required>${esc(v.prompt)}</textarea>
      <div data-t="choice4 puzzle"><label class="lb">보기 4개 (한 줄에 하나)</label><textarea class="inp" name="choices" rows="4">${esc((P.choices ?? []).join('\n'))}</textarea>
        <label class="lb">정답 보기 번호 (1~4)</label><input class="inp" name="answerIdx" type="number" min="1" max="4" value="${typeof v.answer === 'number' ? v.answer + 1 : 1}"></div>
      <div data-t="puzzle"><label class="lb">수열 (쉼표로, 모르는 칸은 ?)</label><input class="inp" name="seq" value="${esc((P.seq ?? []).join(', '))}"></div>
      <div data-t="ox"><label class="lb">정답</label><select class="inp" name="ox"><option ${v.answer === 'O' ? 'selected' : ''}>O</option><option ${v.answer === 'X' ? 'selected' : ''}>X</option></select></div>
      <div data-t="order command_order"><label class="lb">단계 (정답 순서대로, 한 줄에 하나 · 학생에게는 섞여서 보여요)</label><textarea class="inp" name="items" rows="5">${esc((P.items ?? []).join('\n'))}</textarea></div>
      <div data-t="keyword"><label class="lb">인정하는 정답 (쉼표로)</label><input class="inp" name="answers" value="${esc(Array.isArray(v.answer) ? v.answer.join(', ') : '')}"></div>
      <div data-t="pixel_art"><label class="lb">목표 그림 (0/1, 정사각형, 한 줄에 한 행)</label><textarea class="inp" name="target" rows="5" style="font-family:monospace">${esc((P.target ?? ['00100', '01110', '11111', '01110', '00100']).join('\n'))}</textarea></div>
      <label class="lb">해설 (학생이 답한 뒤 보여요)</label><input class="inp" name="explanation" value="${esc(v.explanation)}">
      <label class="lb">상태</label><select class="inp" name="status">${Object.entries(STATUS_KO).map(([k, n]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${n}${k === 'approved' ? ' (바로 배틀에 나옴)' : ''}</option>`).join('')}</select>
      <p class="err" id="qerr"></p>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn out" data-act="close">취소</button><button class="btn">저장</button></div></form>`, true)
    const sync = () => { const t = $<HTMLSelectElement>('#mt', m).value; m.querySelectorAll<HTMLElement>('[data-t]').forEach((d) => { d.style.display = d.dataset.t!.split(' ').includes(t) ? '' : 'none' }) }
    $('#mt', m).addEventListener('change', sync); sync()
    onAct(m, { close: closeModal })
    $<HTMLFormElement>('#qf', m).onsubmit = async (e) => {
      e.preventDefault()
      const f = new FormData(e.target as HTMLFormElement), g = (k: string) => String(f.get(k) ?? '')
      const type = g('missionType'), lines = (k: string) => g(k).split('\n').map((s) => s.trim()).filter(Boolean)
      const b: Record<string, unknown> = { category: g('category'), missionType: type, difficulty: g('difficulty'), prompt: g('prompt'), explanation: g('explanation'), status: g('status') }
      if (type === 'choice4' || type === 'puzzle') { b.choices = lines('choices'); b.answer = Number(g('answerIdx')) - 1 }
      if (type === 'puzzle') b.seq = g('seq').split(',').map((s) => s.trim())
      if (type === 'ox') b.answer = g('ox')
      if (type === 'order' || type === 'command_order') b.items = lines('items')
      if (type === 'keyword') b.answers = g('answers').split(',').map((s) => s.trim())
      if (type === 'pixel_art') b.target = lines('target')
      try {
        if (q) await api.admin.update(q.id, b); else await api.admin.create(b)
        closeModal(); toast('저장했어요'); tab = 'questions'; await draw()
      } catch (er) { $('#qerr', m).textContent = (er as Error).message }
    }
  }

  onAct(body, {
    tab: async (el) => { tab = el.dataset.t as typeof tab; await draw() },
    new: () => editor(null),
    edit: (el) => editor(((window as any).__rows as AdminQuestion[]).find((q) => q.id === el.dataset.id)!),
    editId: async (el) => { const rows = await api.admin.questions({}); const q = rows.find((x) => x.id === el.dataset.id); if (q) editor(q) },
    st: async (el) => { await api.admin.setStatus(el.dataset.id!, el.dataset.s!); toast(el.dataset.s === 'approved' ? '승인했어요: 이제 배틀에 나와요' : '숨겼어요'); await draw() },
    resolve: async (el) => { await api.admin.resolve(Number(el.dataset.id)); await draw() },
    runSql: async (el) => {
      const r = await api.admin.sqlRun(el.dataset.id!)
      $('#sqlOut', body).innerHTML = `<h3>${esc(r.title)} <small>${r.rowCount}행 · ${r.ms}ms</small></h3><div class="sql">${esc(r.sql)}</div>
        <table class="t" style="margin-top:10px"><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
        ${r.rows.map((row) => `<tr>${r.columns.map((c) => `<td>${esc(row[c] ?? '')}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${r.columns.length}" class="center mute">0행 (문제가 없다는 뜻이에요 ✓)</td></tr>`}</table>`
    },
    saveStage: async (el) => { const id = el.dataset.id!; await api.admin.setStage(id, Number($<HTMLInputElement>('#g-' + id, body).value), Number($<HTMLInputElement>('#r-' + id, body).value)); toast('스테이지를 저장했어요') },
  })
  try { await draw() } catch (e) { showError(e) }
}
