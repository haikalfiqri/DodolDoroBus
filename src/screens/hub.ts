import { api } from '../api'
import { closeModal, esc, modal, onAct, talk, toast } from '../ui/dom'
import { FORM_KO, MOOD_COL, MOOD_KO, petImg, CAT_KO } from '../ui/sprites'
import { getMe, go } from '../main'

export async function hubScreen(body: HTMLElement): Promise<void> {
  const me = getMe()!
  const [chapters, eggs, qs] = await Promise.all([api.chapters(), api.eggs(), me.unlocked.quests ? api.quests() : Promise.resolve(null)])
  const p = me.partner!
  const ch1 = chapters[0]
  const ready = eggs.filter((e) => e.ready).length
  const tip = me.today.rewardedBattles >= 10 || me.today.cellsEarned >= 60
    ? talk('naty', '오늘 정말 많이 했어! 이제 쉬었다가 내일 또 만나자. (오늘 보상은 모두 받았어)')
    : p.mood === 'sad' ? talk('zero', `${p.nickname}가 배고파 보여. 마이룸에서 먹이를 주면 기분이 좋아질 거야.`)
    : ready ? talk('naty', '알이 흔들려! 마이룸에서 눌러 봐!')
    : talk('codex', ch1.cleared < ch1.total ? `다음 시험이 기다린다, ${me.nickname}.` : '1장을 모두 통과했군. 배틀룸이 열렸다.')
  const pct = p.xpToNext ? Math.round((p.xp / p.xpToNext) * 100) : 100
  const growth = p.level < 4 ? 'Lv 4에 꼬마로 성장' : p.level < 7 ? 'Lv 7에 어른으로 성장' : p.level < 10 ? 'Lv 10에 빛나는 모습' : '최고 레벨!'
  const questReady = qs ? qs.quests.filter((x) => !x.claimed && x.progress >= x.target).length : 0
  const dock = (act: string, ic: string, label: string, opts: { off?: boolean; badge?: number; hint?: string } = {}) =>
    `<button class="dock-btn" data-act="${act}" ${opts.off ? `disabled title="${esc(opts.hint ?? '')}"` : ''}><span class="ic">${opts.off ? '🔒' : ic}</span><span>${label}</span>${opts.badge ? `<u>${opts.badge}</u>` : ''}</button>`
  body.innerHTML = `<div class="hub2">
    <div class="hub-scene">
      <div class="hub-card">
        <div class="row between"><b class="nm">${esc(p.nickname)}</b><span class="tag">Lv.${p.level} ${FORM_KO[p.form]}</span></div>
        <div class="small"><span class="tag cat-${p.type}">${CAT_KO[p.type]} 타입</span> <i class="mood-dot" style="background:${MOOD_COL[p.mood]}"></i>${MOOD_KO[p.mood]}</div>
        <div class="bar xp"><i style="width:${pct}%"></i></div>
        <div class="small mute">경험치 ${p.xp} / ${p.xpToNext || 'MAX'} · ${growth}</div>
      </div>
      <div class="hub-pet"><div class="shadow"></div><div class="pet-wrap">${petImg(p.speciesId, p.form)}</div></div>
      <div class="hub-tip">${tip}</div>
      <button class="hub-start" data-act="map"><span class="ic">🗺</span><span><b>코덱스의 시험 · 1장</b><small>${esc(ch1.nameKo)} · 클리어 ${ch1.cleared} / ${ch1.total}</small></span><span class="go">▶</span></button>
    </div>
    <nav class="dock">
      ${dock('room', '🏠', '마이룸', { off: !me.unlocked.myRoom, badge: ready, hint: '1스테이지 클리어 후' })}
      ${dock('shop', '🛍', '상점', { off: !me.unlocked.shop, hint: '1스테이지 클리어 후' })}
      ${qs ? dock('quests', '📜', '퀘스트', { badge: questReady }) : ''}
      ${dock('today', '📅', '오늘')}
      ${dock('report', '📈', '리포트')}
      ${dock('battleRoom', '⚔', '배틀룸', { off: !me.battleRoomUnlocked, hint: '1장 보스를 깨면 열려요' })}
    </nav></div>`

  const questsHtml = () => qs ? `<h2>📜 오늘의 퀘스트</h2><p class="small mute">완료마다 ${qs.reward}셀 · 도장 ${qs.stamps} / ${qs.stampsNeeded} → 주간 알</p>
    ${qs.quests.map((x) => `<div class="rw"><span>${x.claimed ? '✅' : x.progress >= x.target ? '🎁' : '⬜'} ${esc(x.textKo)} <span class="small mute">${x.progress} / ${x.target}</span></span>
      ${x.claimed ? '<span class="small mute">받음</span>' : `<button class="btn sm ${x.progress >= x.target ? 'green' : 'out'}" data-act="quest" data-id="${x.id}" ${x.progress >= x.target ? '' : 'disabled'}>받기</button>`}</div>`).join('')}` : ''
  const todayHtml = `<h2>📅 오늘</h2><p class="small mute">매일 0시(KST) 초기화</p>
    <div class="rw"><span>보상 배틀</span><b>${me.today.rewardedBattles} / 10</b></div>
    <div class="rw"><span>받은 셀</span><b>${me.today.cellsEarned} / 60</b></div>
    <div class="rw"><span>오늘 첫 클리어 보너스</span><b>${me.today.firstClearBonusAvailable ? '+5셀 대기 중 🎁' : '받음 ✓'}</b></div>
    ${me.nestSlots ? `<div class="rw"><span>둥지</span><b>${eggs.filter((e) => e.nestSlot !== null).length} / ${me.nestSlots} 칸 사용</b></div>` : ''}`
  const popup = (html: string) => {
    const m = modal(`${html}<div class="row end" style="margin-top:14px"><button class="btn out" data-act="close">닫기</button></div>`)
    onAct(m, {
      close: () => closeModal(),
      quest: async (el) => {
        const r = await api.claimQuest(el.dataset.id!)
        closeModal()
        toast(`퀘스트 완료! ${r.cellsMailed}셀이 우편함으로${r.stamp ? ' · 도장 +1' : ''}${r.weeklyEgg ? ' · 주간 알 획득! 🥚' : ''}`)
        go('hub')
      },
    })
  }
  onAct(body, {
    map: () => go('map'), room: () => go('room'), shop: () => go('shop'), report: () => go('report'),
    battleRoom: () => go('battleroom'),
    quests: () => popup(questsHtml()),
    today: () => popup(todayHtml),
  })
}
