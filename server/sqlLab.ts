/**
 * "SQL 실험실" for the admin page: a fixed list of read-only queries that show how the database works.
 * Only these queries can run (no free SQL from the browser), inside a READ ONLY transaction.
 */
import { pool } from './db.js'

export const LAB: { id: string; title: string; why: string; sql: string }[] = [
  { id: 'ledger_check', title: '셀 잔액 = 내역 합계?', why: '캐시된 잔액(students.cells)이 cell_ledger 합계와 항상 같은지 확인해요. 0행이면 모두 일치.',
    sql: `SELECT s.username, s.cells, COALESCE(SUM(l.delta),0) AS ledger_sum
FROM students s LEFT JOIN cell_ledger l ON l.student_id = s.id
GROUP BY s.id HAVING s.cells <> COALESCE(SUM(l.delta),0);` },
  { id: 'one_partner', title: '학생마다 파트너 펫은 정확히 1마리?', why: '부분 유니크 인덱스(pets_one_partner) 덕분에 2마리 이상은 불가능해요. 0행이면 정상.',
    sql: `SELECT student_id, count(*) AS partners FROM pets WHERE is_partner
GROUP BY student_id HAVING count(*) <> 1;` },
  { id: 'accuracy_cat', title: 'DIMC 분야별 정답률', why: '보이드 리포트와 운영 지표의 바탕. battle_turns 한 테이블에서 계산해요.',
    sql: `SELECT c.name_ko AS 분야, count(t.*) AS 답변, round(100.0 * avg(t.is_correct::int)) AS 정답률
FROM question_categories c LEFT JOIN battle_turns t ON t.category_id = c.id
GROUP BY c.id, c.name_ko ORDER BY 정답률 NULLS LAST;` },
  { id: 'stage_funnel', title: '스테이지별 클리어 학생 수 (이탈 지점)', why: '어디서 학생들이 막히는지 보여 줘요. 게이지 조정의 근거.',
    sql: `SELECT st.ord AS 순서, st.name_ko AS 스테이지, count(sp.student_id) AS 클리어_학생, round(avg(sp.best_stars),1) AS 평균별
FROM story_stages st LEFT JOIN stage_progress sp ON sp.stage_id = st.id
WHERE st.chapter_id = 1 GROUP BY st.id ORDER BY st.ord;` },
  { id: 'hardest', title: '가장 많이 틀리는 문제 TOP 5', why: '문제 품질 검토용. 정답률이 너무 낮으면 문제를 고쳐요.',
    sql: `SELECT q.id, left(q.prompt, 30) AS 문제, count(*) AS 답변, round(100.0 * avg(t.is_correct::int)) AS 정답률
FROM battle_turns t JOIN questions q ON q.id = t.question_id
GROUP BY q.id HAVING count(*) >= 2 ORDER BY 정답률, 답변 DESC LIMIT 5;` },
  { id: 'eggs_pets', title: '등급별 알 · 부화 · 펫 수', why: '알 → 부화 → 펫 흐름과 중복 방지(간식 꾸러미) 결과.',
    sql: `SELECT r.id AS 등급, count(e.*) AS 받은_알, count(e.*) FILTER (WHERE e.hatched_at IS NOT NULL AND NOT e.became_snack) AS 부화,
  count(e.*) FILTER (WHERE e.became_snack) AS 간식으로, (SELECT count(*) FROM pets p JOIN pet_species ps ON ps.id=p.species_id WHERE ps.rarity_id=r.id) AS 펫
FROM rarities r LEFT JOIN eggs e ON e.rarity_id = r.id GROUP BY r.id, r.ord ORDER BY r.ord;` },
  { id: 'daily_return', title: '날짜별 접속(배틀한) 학생 수', why: 'DORO가 원한 "수업 없는 날에도 들어오나?" 지표.',
    sql: `SELECT (started_at AT TIME ZONE 'Asia/Seoul')::date AS 날짜, count(DISTINCT student_id) AS 학생, count(*) AS 배틀
FROM battles GROUP BY 1 ORDER BY 1 DESC LIMIT 14;` },
  { id: 'mail_flow', title: '보상 → 받기 → 사용 (셀 흐름)', why: '얼마나 벌고, 받고, 어디에 썼는지. reason별 cell_ledger 합계.',
    sql: `SELECT reason AS 이유, count(*) AS 건수, sum(delta) AS 합계 FROM cell_ledger GROUP BY reason ORDER BY 합계 DESC;` },
]

export async function runLab(id: string) {
  const item = LAB.find((x) => x.id === id)
  if (!item) return null
  const c = await pool.connect()
  try {
    await c.query('BEGIN READ ONLY')
    const t = Date.now()
    const r = await c.query(item.sql)
    const ms = Date.now() - t
    await c.query('COMMIT')
    return { ...item, ms, columns: r.fields.map((f) => f.name), rows: r.rows.slice(0, 50), rowCount: r.rowCount }
  } finally {
    c.release()
  }
}
