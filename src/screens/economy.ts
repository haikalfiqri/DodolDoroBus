import { api } from '../api'
import { esc, onAct, talk, toast } from '../ui/dom'
import { CAT_ICON } from '../ui/sprites'
import { getMe, go, refreshMe } from '../main'

const REASON_KO: Record<string, string> = { MAIL_CLAIM: '우편 보상', SHOP_BUY: '상점 구매', FEED: '먹이', HINT: '리코의 분석' }

/** Mailbox: rewards wait here until claimed (MAIL-CLAIM transaction on the server). */
export async function mailScreen(body: HTMLElement): Promise<void> {
  const [mail, ledger] = await Promise.all([api.mail(), api.ledger()])
  const open = mail.filter((m) => !m.claimed)
  const total = open.reduce((a, m) => a + m.amount, 0)
  body.innerHTML = `<div class="row between" style="margin-bottom:12px"><h2>✉ 우편함</h2><button class="btn out sm" data-act="hub">← 홈</button></div>
    <div class="grid2"><div class="box" style="padding:0">${mail.map((m) => `<div class="mrow ${m.claimed ? 'done' : ''}"><span class="ic">${m.title.includes('환영') ? '💌' : m.title.includes('보스') || m.title.includes('동굴') ? '👑' : '⭐'}</span>
        <div class="tx"><b>${esc(m.title)}</b><div class="small mute">${new Date(m.createdAt).toLocaleString('ko-KR')}</div></div>
        <b>${m.amount}셀</b>${m.claimed ? '<span class="small mute">받음</span>' : `<button class="btn sm green" data-act="claim" data-id="${m.id}">받기</button>`}</div>`).join('') || '<div class="empty">우편이 없어요. 스테이지를 깨면 보상이 와요!</div>'}</div>
      <div style="display:grid;gap:12px;align-content:start">
        <div class="box center"><div style="font-size:34px">✉</div><b>${open.length ? `받을 보상 ${total}셀` : '새 보상이 없어요'}</b>
          ${open.length > 1 ? '<div style="margin-top:8px"><button class="btn gold" data-act="all">모두 받기</button></div>' : ''}
          <p class="small mute">받기를 눌러야 셀이 들어와요. 두 번 눌러도 한 번만 들어와요.</p></div>
        <div class="box soft"><h3>🧾 셀 내역 <small>cell_ledger</small></h3>${ledger.slice(0, 8).map((l) => `<div class="rw small"><span>${REASON_KO[l.reason] ?? l.reason}</span><span><b style="color:${l.delta > 0 ? '#16a34a' : '#dc2626'}">${l.delta > 0 ? '+' : ''}${l.delta}</b> → ${l.balance}</span></div>`).join('') || '<p class="small mute">아직 내역이 없어요</p>'}</div>
      </div></div>`
  onAct(body, {
    hub: () => go('hub'),
    claim: async (el) => { const r = await api.claimMail(el.dataset.id!); toast(`+${r.claimed}셀! 보유 ${r.cells}셀`); await refreshMe(); go('mail') },
    all: async () => { const r = await api.claimAllMail(); toast(`+${r.claimed}셀! 보유 ${r.cells}셀`); go('mail') },
  })
}

const EFFECT_KO: Record<string, string> = { pet_food: '먹이면 오늘 XP +10% · 기분 하늘색 (하루 1번)', bg_safari: '마이룸 배경: 사파리 노을', bg_night_sky: '마이룸 배경: 반짝 밤하늘', pet_bed: '마이룸 가구', toy_ball: '마이룸 장난감', scarf_star: '펫 액세서리 (준비 중)', battle_bg_cave: '배틀 배경 (준비 중)' }
const ICON: Record<string, string> = { pet_food: '🍖', bg_safari: '🌅', bg_night_sky: '🌌', pet_bed: '🛏', toy_ball: '⚽', scarf_star: '🧣', battle_bg_cave: '🕳' }
/** Xylo's shop: fixed prices, no eggs, no random boxes. */
export async function shopScreen(body: HTMLElement): Promise<void> {
  const me = getMe()!
  const items = await api.shop()
  body.innerHTML = `<div class="row between" style="margin-bottom:12px"><h2>🛍 자일로 상점</h2><button class="btn out sm" data-act="hub">← 홈</button></div>
    ${talk('xylo', `어서 와! 셀로 먹이랑 마이룸 꾸미기를 살 수 있어. 가격은 늘 똑같고, 알은 팔지 않아. (보유 ${me.cells}셀)`)}
    <div class="items" style="margin-top:14px">${items.map((i) => {
      const furniture = i.kind !== 'consumable'
      const has = furniture && i.owned > 0
      return `<div class="box item"><span class="ic">${ICON[i.id] ?? '🎁'}</span><b>${esc(i.nameKo)}</b><span class="small mute">${esc(EFFECT_KO[i.id] ?? '')}</span>
        ${has ? '<span class="tag" style="background:#bbf7d0">보유 중 ✓</span>' : `<button class="btn sm" data-act="buy" data-id="${i.id}" ${me.cells < i.price ? 'disabled' : ''}>🔹 ${i.price}셀</button>`}
        ${!furniture && i.owned ? `<span class="small">보유 ${i.owned}개</span>` : ''}</div>`
    }).join('')}</div>`
  onAct(body, {
    hub: () => go('hub'),
    buy: async (el) => { const r = await api.buy(el.dataset.id!); toast(`${r.item.nameKo} 구매! 남은 셀 ${r.cells}`); go('shop') },
  })
}

/** Void's weekly growth report: accuracy per DIMC category, computed with SQL from battle_turns. */
export async function reportScreen(body: HTMLElement): Promise<void> {
  const rows = await api.weekly()
  const best = [...rows].filter((r) => r.answered).sort((a, b) => b.accuracy - a.accuracy)[0]
  const weak = [...rows].filter((r) => r.answered).sort((a, b) => a.accuracy - b.accuracy)[0]
  body.innerHTML = `<div class="row between" style="margin-bottom:12px"><h2>📈 보이드의 주간 리포트</h2><button class="btn out sm" data-act="hub">← 홈</button></div>
    ${talk('void', best ? `이번 주 가장 잘한 분야는 ${best.name_ko} (${best.accuracy}%)! ${weak && weak !== best ? `${weak.name_ko}도 조금만 더 연습해 보자.` : ''}` : '아직 이번 주 기록이 없어. 배틀을 하면 분야별 정답률을 보여 줄게!')}
    <div class="box rep" style="margin-top:14px">${rows.map((r) => `<div class="r"><b>${CAT_ICON[r.category]} ${r.name_ko}</b>
      <div><div class="bar xp"><i style="width:${r.accuracy}%"></i></div><span class="small mute">이번 주 ${r.answered}문제 · 지난주 ${r.last_week}%</span></div><b>${r.accuracy}%</b></div>`).join('')}</div>
    <p class="small mute">D·I·M·C = 디지털 · AI · 메이킹 · 컴퓨팅. 학부모 월간 리포트의 바탕이 되는 데이터예요.</p>`
  onAct(body, { hub: () => go('hub') })
}
