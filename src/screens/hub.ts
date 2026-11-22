import { api } from '../api'
import { esc, onAct, talk } from '../ui/dom'
import { FORM_KO, MOOD_COL, MOOD_KO, petImg, treeSprite, CAT_KO } from '../ui/sprites'
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
  body.innerHTML = `<div class="hub">
    <div style="display:grid;gap:12px;align-content:start">
      <div class="partner-stage">
        <i class="tree" style="left:4%;top:40%">${treeSprite()}</i><i class="tree" style="right:6%;top:44%">${treeSprite()}</i>
        <div class="partner-info"><div class="namecard"><b>${esc(p.nickname)}</b> <span class="tag">Lv.${p.level} ${FORM_KO[p.form]}</span>
          <div class="small"><span class="tag cat-${p.type}">${CAT_KO[p.type]} 타입</span> · 파트너</div></div>
          <div class="namecard small"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;border:2px solid #1f1a30;background:${MOOD_COL[p.mood]}"></span> ${MOOD_KO[p.mood]}</div></div>
        <div class="shadow"></div><div class="pet-wrap">${petImg(p.speciesId, p.form)}</div>
      </div>
      <div class="box soft"><div class="row between small"><span>경험치 ${p.xp} / ${p.xpToNext || 'MAX'}</span><span>${p.level < 4 ? 'Lv 4에 꼬마로 성장' : p.level < 7 ? 'Lv 7에 어른으로 성장' : p.level < 10 ? 'Lv 10에 빛나는 모습' : '최고 레벨!'}</span></div>
        <div class="bar xp"><i style="width:${pct}%"></i></div></div>
      ${tip}
    </div>
    <div style="display:grid;gap:12px;align-content:start">
      <div class="menu-grid">
        <button class="mbtn main" data-act="map"><span class="ic">🗺</span><span><b>코덱스의 시험 · 1장</b><small>${esc(ch1.nameKo)} · 클리어 ${ch1.cleared} / ${ch1.total}</small></span></button>
        <button class="mbtn" data-act="room" ${me.unlocked.myRoom ? '' : 'disabled'}><span class="ic">🏠</span><span><b>마이룸</b><small>${me.unlocked.myRoom ? '펫 · 둥지 · 도감' : '1스테이지 클리어 후'}</small></span>${ready ? `<u>${ready}</u>` : ''}</button>
        <button class="mbtn" data-act="mail"><span class="ic">✉</span><span><b>우편함</b><small>보상 받기</small></span>${me.unclaimedMail ? `<u>${me.unclaimedMail}</u>` : ''}</button>
        <button class="mbtn" data-act="shop" ${me.unlocked.shop ? '' : 'disabled'}><span class="ic">🛍</span><span><b>자일로 상점</b><small>${me.unlocked.shop ? '먹이 · 꾸미기' : '1스테이지 클리어 후'}</small></span></button>
        <button class="mbtn" data-act="report"><span class="ic">📈</span><span><b>보이드의 리포트</b><small>분야별 정답률</small></span></button>
        <button class="mbtn" data-act="battleRoom" ${me.battleRoomUnlocked ? '' : 'disabled'}><span class="ic">${me.battleRoomUnlocked ? '⚔' : '🔒'}</span><span><b>배틀룸</b><small>${me.battleRoomUnlocked ? '이번 주 시험 · 랭킹' : '1장 보스를 깨면 열려요'}</small></span></button>
      </div>
      ${qs ? `<div class="box"><h3>📜 오늘의 퀘스트 <small>완료마다 ${qs.reward}셀 · 도장 ${qs.stamps} / ${qs.stampsNeeded} → 주간 알</small></h3>
        ${qs.quests.map((x) => `<div class="rw"><span>${x.claimed ? '✅' : x.progress >= x.target ? '🎁' : '⬜'} ${esc(x.textKo)} <span class="small mute">${x.progress} / ${x.target}</span></span>
          ${x.claimed ? '<span class="small mute">받음</span>' : `<button class="btn sm ${x.progress >= x.target ? 'green' : 'out'}" data-act="quest" data-id="${x.id}" ${x.progress >= x.target ? '' : 'disabled'}>받기</button>`}</div>`).join('')}</div>` : ''}
      <div class="box soft"><h3>📅 오늘 <small>매일 0시(KST) 초기화</small></h3>
        <div class="rw"><span>보상 배틀</span><b>${me.today.rewardedBattles} / 10</b></div>
        <div class="rw"><span>받은 셀</span><b>${me.today.cellsEarned} / 60</b></div>
        <div class="rw"><span>오늘 첫 클리어 보너스</span><b>${me.today.firstClearBonusAvailable ? '+5셀 대기 중 🎁' : '받음 ✓'}</b></div>
        ${me.nestSlots ? `<div class="rw"><span>둥지</span><b>${eggs.filter((e) => e.nestSlot !== null).length} / ${me.nestSlots} 칸 사용</b></div>` : ''}
      </div>
    </div></div>`
  onAct(body, {
    map: () => go('map'), room: () => go('room'), mail: () => go('mail'), shop: () => go('shop'), report: () => go('report'),
    battleRoom: () => go('battleroom'),
    quest: async (el) => {
      const r = await api.claimQuest(el.dataset.id!)
      const { toast } = await import('../ui/dom')
      toast(`퀘스트 완료! ${r.cellsMailed}셀이 우편함으로${r.stamp ? ' · 도장 +1' : ''}${r.weeklyEgg ? ' · 주간 알 획득! 🥚' : ''}`)
      go('hub')
    },
  })
}
