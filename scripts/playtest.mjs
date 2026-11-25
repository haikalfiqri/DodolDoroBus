// End-to-end test of the real API + database.
// Plays the whole of Chapter 1 as a new student, answering correctly by reading the key from the DB
// (only this test can do that), then checks the transactions: mail claim, double claim, shop, feed, hatch.
// Usage: API=http://localhost:3000 DATABASE_URL=... node scripts/playtest.mjs
import pg from 'pg'
try { process.loadEnvFile() } catch { /* no .env file: use the real environment */ }
const API = process.env.API ?? 'http://localhost:3000'
const url = process.env.DATABASE_URL
const db = new pg.Client({ connectionString: url, ssl: /host=\/|localhost/.test(url) ? false : { rejectUnauthorized: false } })
await db.connect()
let cookie = ''
let failures = 0
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg); if (!cond) failures++ }
async function call(method, path, body, expectFail = false) {
  const r = await fetch(API + '/api' + path, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body === undefined ? undefined : JSON.stringify(body) })
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]
  const j = await r.json().catch(() => ({}))
  if (!r.ok && !expectFail) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j)}`)
  return expectFail ? { status: r.status, body: j } : j
}
async function rightAnswer(battleId) {
  const b = (await db.query('SELECT current FROM battles WHERE id=$1', [battleId])).rows[0]
  const qq = (await db.query('SELECT * FROM questions WHERE id=$1', [b.current.q])).rows[0]
  const order = b.current.order
  switch (qq.mission_type_id) {
    case 'choice4': return order.indexOf(Number(qq.answer))
    case 'puzzle': return qq.answer
    case 'ox': return qq.answer
    case 'keyword': return qq.answer[0]
    case 'order': case 'command_order': return [...order.keys()].sort((x, y) => order[x] - order[y])
    case 'pixel_art': return qq.payload.target.join('').split('').map(Number)
  }
}
async function play(stageId, wrongDodges = 0) {
  const me = await call('GET', '/me')
  const st = await call('POST', '/battles', { stageId, petId: me.partner.id, mode: 'STORY' })
  let s = st.state, dodgeMiss = wrongDodges
  while (s.phase !== 'WON' && s.phase !== 'LOST') {
    const skill = s.pet.skills[Math.floor(Math.random() * 4)]
    const sk = await call('POST', `/battles/${s.battleId}/skill`, { skillId: skill.id })
    let a = await call('POST', `/battles/${s.battleId}/answer`, { questionId: sk.question.id, answer: await rightAnswer(s.battleId) })
    if (!a.correct) throw new Error('graded wrong: ' + JSON.stringify(sk.question))
    s = a.state
    if (a.nextQuestion) {
      const ans = dodgeMiss-- > 0 ? (a.nextQuestion.payload.kind === 'ox' ? 'Z' : 99) : await rightAnswer(s.battleId)
      a = await call('POST', `/battles/${s.battleId}/answer`, { questionId: a.nextQuestion.id, answer: ans })
      s = a.state
    }
  }
  return call('POST', `/battles/${s.battleId}/finish`)
}

const user = 'test' + Date.now().toString(36)
console.log('▶ register + onboarding as', user)
await call('POST', '/auth/register', { username: user, password: 'pw1234', nickname: '테스터' })
let me = await call('GET', '/me')
ok(!me.onboarded && me.partner === null, 'new account not onboarded')
const ob = await call('POST', '/onboarding', { petName: '루미' })
ok(ob.me.onboarded && ob.pet.nickname === '루미' && ['dog', 'cat', 'rabbit'].includes(ob.pet.speciesId), `starter pet hatched: ${ob.pet.speciesId}`)
ok((await call('POST', '/onboarding', { petName: 'x' }, true)).status === 409, 'onboarding twice is refused')
const locked = await call('POST', '/battles', { stageId: 'c1s2', petId: ob.pet.id, mode: 'STORY' }, true)
ok(locked.status === 403, 'stage 2 locked before stage 1')

console.log('▶ chapter 1')
const results = []
for (const sid of ['c1s1', 'c1s2', 'c1s3', 'c1s4', 'c1s5', 'c1s6', 'c1s7']) {
  const r = await play(sid, sid === 'c1s4' ? 2 : 0)
  results.push(r)
  console.log(`  ${sid}: ${r.won ? 'WON' : 'LOST'} ${'★'.repeat(r.stars)} xp+${r.xpGained} lv${r.pet.level} cells→mail ${r.cellsMailed}${r.egg ? ' egg:' + r.egg.rarity + (r.egg.inNest ? '(nest)' : '(box)') : ''} ${r.unlocksKo.join(' ')}`)
  if (!r.won) throw new Error('lost ' + sid)
  // hatch any ready eggs between stages
  for (const e of await call('GET', '/eggs')) if (e.ready) { const h = await call('POST', `/eggs/${e.id}/hatch`); console.log(`    hatched ${e.rarity}: ${h.result} ${h.pet?.speciesId ?? ''}`) }
}
ok(results[3].stars === 2, 'stage 4 with 2 missed dodges = ★★ (energy 70)')
ok(results[2].egg?.rarity === 'common', 'stage 3 first clear gives a Common egg')
ok(results[5].egg?.rarity === 'uncommon', 'stage 6 first clear gives an Uncommon egg')
ok(results[6].egg?.rarity === 'rare', 'boss first clear gives a Rare egg')
me = await call('GET', '/me')
ok(me.battleRoomUnlocked && me.nestSlots === 2, 'boss clear unlocks Battle Room + 2nd nest slot')
ok(me.today.cellsEarned === 60 && me.today.rewardedBattles === 4, 'daily cap: 60 cells reached after 4 rewarded clears, rest is practice')

console.log('▶ mail claim transaction')
const before = me.cells
const mail = await call('GET', '/mail')
const total = mail.filter((m) => !m.claimed).reduce((a, m) => a + m.amount, 0)
const one = mail.find((m) => !m.claimed)
const c1 = await call('POST', `/mail/${one.id}/claim`)
ok(c1.cells === before + one.amount, `claim one: +${one.amount}`)
const again = await call('POST', `/mail/${one.id}/claim`, undefined, true)
ok(again.status === 409, 'claiming the same mail again is refused')
// race: two claim-all at the same time, only one may win
const [ra, rb] = await Promise.all([call('POST', '/mail/claim-all', undefined, true), call('POST', '/mail/claim-all', undefined, true)])
const wins = [ra, rb].filter((x) => x.status === undefined || x.status === 200 || x.body?.claimed).length
me = await call('GET', '/me')
ok(me.cells === before + total, `parallel claim-all added exactly once (cells ${me.cells})`)
const ledger = (await db.query('SELECT sum(delta)::int s FROM cell_ledger WHERE student_id=(SELECT id FROM students WHERE username=$1)', [user])).rows[0].s
ok(ledger === me.cells, `cell_ledger sum (${ledger}) == balance (${me.cells})`)

console.log('▶ shop + feed')
const shop = await call('GET', '/shop')
const bed = shop.find((i) => i.id === 'pet_bed')
const buy = await call('POST', '/shop/buy', { itemId: 'pet_bed' })
ok(buy.cells === me.cells - bed.price && buy.item.owned === 1, 'bought pet bed')
ok((await call('POST', '/shop/buy', { itemId: 'pet_bed' }, true)).status === 409, 'cannot buy the same furniture twice')
const fed = await call('POST', `/pets/${me.partner.id}/feed`)
ok(fed.pet.fedToday && fed.pet.mood === 'harmony' || fed.pet.mood === 'calm', `fed partner, mood ${fed.pet.mood}`)
ok((await call('POST', `/pets/${me.partner.id}/feed`, undefined, true)).status === 409, 'feeding twice a day refused')

console.log('▶ pets, dex, report')
const pets = await call('GET', '/pets')
const dex = await call('GET', '/dex')
ok(dex.filter((d) => d.owned).length === pets.length, `dex owned ${dex.filter((d) => d.owned).length} = pets ${pets.length}`)
const other = pets.find((p) => !p.isPartner)
if (other) { const l = await call('PATCH', `/pets/${other.id}`, { isPartner: true }); ok(l.filter((p) => p.isPartner).length === 1 && l.find((p) => p.id === other.id).isPartner, 'switch partner (still exactly one)') }
const rep = await call('GET', '/report/weekly')
ok(rep.length === 4 && rep.some((x) => x.answered > 0), 'weekly report per DIMC category')

console.log('▶ daily quests')
const ql = await call('GET', '/quests')
ok(ql.quests.length === 3, 'three quests today: ' + ql.quests.map((x) => `${x.id} ${x.progress}/${x.target}`).join(', '))
const doneQ = ql.quests.find((x) => x.progress >= x.target)
if (doneQ) { const cq = await call('POST', `/quests/${doneQ.id}/claim`); ok(cq.cellsMailed >= 0, `claimed quest ${doneQ.id}`); ok((await call('POST', `/quests/${doneQ.id}/claim`, undefined, true)).status === 409, 'quest cannot be claimed twice') }
const notDone = ql.quests.find((x) => x.progress < x.target)
if (notDone) ok((await call('POST', `/quests/${notDone.id}/claim`, undefined, true)).status === 409, 'unfinished quest cannot be claimed')

console.log('▶ battle room · weekly trial')
const lob = await call('GET', '/battle-room')
ok(lob.unlocked, 'battle room unlocked after the boss')
let tr = await call('POST', '/trial/start')
const runId = tr.runId
let last
for (;;) {
  const r = (await db.query('SELECT r.q_order, w.question_ids, r.idx FROM trial_runs r JOIN weekly_trials w USING (week_start) WHERE r.id=$1', [runId])).rows[0]
  const qq = (await db.query('SELECT * FROM questions WHERE id=$1', [r.question_ids[r.idx]])).rows[0]
  const ans = qq.mission_type_id === 'choice4' ? r.q_order.indexOf(Number(qq.answer)) : qq.answer
  last = await call('POST', `/trial/${runId}/answer`, { answer: ans })
  if (!last.correct) throw new Error('trial graded wrong')
  if (last.done) break
}
ok(last.correctCount === 8 && last.score >= 800, `weekly trial 8/8, score ${last.score}`)
const lob2 = await call('GET', '/battle-room')
ok(lob2.myBest === last.score && lob2.myRank >= 1, `ranking shows my best (${lob2.myBest}, rank ${lob2.myRank})`)

console.log('▶ friends + ghost challenge')
const cookieA = cookie
const userB = user + 'b'
cookie = ''
await call('POST', '/auth/register', { username: userB, password: 'pw1234', nickname: '친구B' })
await call('POST', '/onboarding', { petName: '비' })
const rb1 = await play('c1s1')
ok(rb1.won, 'friend B cleared stage 1')
const codeB = (await call('GET', '/friends')).code
cookie = cookieA
const codeA = (await call('GET', '/friends')).code
ok(/^[0-9A-F]{6}$/.test(codeA) && codeA !== codeB, `friend codes ${codeA} / ${codeB}`)
const add = await call('POST', '/friends', { friendCode: codeB.toLowerCase() })
ok(add.nickname === '친구B', 'added friend by code (both directions)')
ok((await call('POST', '/friends', { friendCode: codeA }, true)).status === 400, 'cannot add yourself')
const fl = await call('GET', '/friends')
ok(fl.friends.length === 1 && fl.friends[0].records.some((r) => r.stageId === 'c1s1'), "friend's stage 1 record is visible")
// the ghost battle must use B's exact questions in order
const bBest = (await db.query("SELECT best_battle_id FROM stage_progress sp JOIN students s ON s.id=sp.student_id WHERE s.username=$1 AND stage_id='c1s1'", [userB])).rows[0].best_battle_id
const bQs = (await db.query('SELECT question_id FROM battle_turns WHERE battle_id=$1 ORDER BY turn_no', [bBest])).rows.map((r) => r.question_id)
const meG = await call('GET', '/me')
const g = await call('POST', '/battles', { stageId: 'c1s1', petId: meG.partner.id, mode: 'GHOST', ghostOf: codeB })
ok(g.state.mode === 'GHOST' && g.state.ghost?.nickname === '친구B', `ghost battle vs ${g.state.ghost?.nickname} (${g.state.ghost?.score})`)
let gs = g.state, asked = []
while (gs.phase !== 'WON' && gs.phase !== 'LOST') {
  const sk = await call('POST', `/battles/${gs.battleId}/skill`, { skillId: gs.pet.skills[0].id })
  asked.push(sk.question.id)
  let a = await call('POST', `/battles/${gs.battleId}/answer`, { questionId: sk.question.id, answer: await rightAnswer(gs.battleId) })
  if (a.nextQuestion) { asked.push(a.nextQuestion.id); a = await call('POST', `/battles/${gs.battleId}/answer`, { questionId: a.nextQuestion.id, answer: await rightAnswer(gs.battleId) }) }
  gs = a.state
}
ok(asked.every((qid, i) => i >= bQs.length || qid === bQs[i]), 'ghost battle asked the friend\'s questions in the same order')
const gf = await call('POST', `/battles/${gs.battleId}/finish`)
ok(gf.ghost && typeof gf.ghost.won === 'boolean', `ghost result: me ${gf.ghost.mine} vs ${gf.ghost.theirs} → ${gf.ghost.won ? 'win' : 'loss'}, mailed ${gf.cellsMailed}`)

console.log('▶ admin')
await call('POST', '/auth/login', { username: 'admin', password: 'admin1234' })
const stats = await call('GET', '/admin/stats')
ok(stats.totals.approved > 0, `admin stats: ${JSON.stringify(stats.totals)}`)
const nq = await call('POST', '/admin/questions', { category: 'ai', missionType: 'ox', prompt: '테스트 문제', answer: 'O', status: 'draft' })
ok(nq.status === 'draft', 'admin created a draft question')
const ap = await call('POST', `/admin/questions/${nq.id}/status`, { status: 'hidden' })
ok(ap.status === 'hidden', 'admin changed status')
await db.query('DELETE FROM questions WHERE id=$1', [nq.id])
await call('POST', '/auth/login', { username: user, password: 'pw1234' })
ok((await call('GET', '/admin/stats', undefined, true)).status === 403, 'students cannot open admin routes')

await db.end()
console.log(failures ? `\n✘ ${failures} check(s) failed` : '\n✔ all checks passed')
process.exit(failures ? 1 : 0)
