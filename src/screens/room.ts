import { api } from '../api'
import type { Egg, Pet } from '../types'
import { $, esc, modal, closeModal, onAct, sleep, toast, talk, showError } from '../ui/dom'
import { CAT_KO, eggSprite, FORM_KO, MOOD_COL, MOOD_KO, petImg, RARITY_COL, RARITY_KO, bowlSprite } from '../ui/sprites'
import { getMe, go, refreshMe } from '../main'
import petsJson from '../../content/pets.json'

const NAME = Object.fromEntries(petsJson.pets.map((p) => [p.id, p.name_ko]))
let tab: 'room' | 'nest' | 'dex' = 'room'

/** My Room: pets wandering, the nest with warmth bars and hatching, the 도감 (collection book). */
export async function roomScreen(body: HTMLElement): Promise<void> {
  const me = getMe()!
  const [pets, eggs, dex, shop] = await Promise.all([api.pets(), api.eggs(), api.dex(), api.shop()])
  const owned = new Set(shop.filter((i) => i.owned > 0).map((i) => i.id))
  const bg = owned.has('bg_night_sky') ? 'bg_night_sky' : owned.has('bg_safari') ? 'bg_safari' : ''
  const ready = eggs.filter((e) => e.ready).length
  const nestEggs = eggs.filter((e) => e.nestSlot !== null), boxEggs = eggs.filter((e) => e.nestSlot === null)

  const roomHtml = () => `<div class="room ${bg}" id="room"><div class="wall-line"></div><div class="window"></div>
      ${owned.has('pet_bed') ? '<span class="furn" style="left:62%;top:60%">🛏</span>' : ''}${owned.has('toy_ball') ? '<span class="furn" style="left:40%;top:78%;font-size:28px">⚽</span>' : ''}
      <i style="position:absolute;left:82%;top:78%;width:44px;height:24px">${bowlSprite()}</i>
      ${pets.map((p, i) => `<div class="rpet ${p.isPartner ? 'partner' : ''}" data-act="pet" data-id="${p.id}" style="left:${8 + ((i * 23) % 70)}%;top:${48 + (i % 2) * 14}%">
        <span class="nm">${p.isPartner ? '★ ' : ''}${esc(p.nickname)} <i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${MOOD_COL[p.mood]};border:1px solid #1f1a30"></i></span>${petImg(p.speciesId, p.form)}</div>`).join('')}
    </div><p class="small mute">펫을 누르면 정보를 보고, 파트너로 정하거나 먹이를 줄 수 있어요.</p>`
  const eggCard = (e: Egg) => `<div class="box nest"><i class="e ${e.ready ? 'ready' : ''}">${eggSprite(e.rarity)}</i><div style="flex:1">
      <b style="color:${RARITY_COL[e.rarity]}">${RARITY_KO[e.rarity]} 알</b> <span class="small mute">${e.source === 'STORY' ? '스토리' : e.source === 'PITY' ? '코덱스의 호의' : e.source === 'REPLAY' ? '다시 깨기' : e.source}</span>
      <div class="bar warm"><i style="width:${(e.warmth / e.warmthNeeded) * 100}%"></i></div>
      <div class="small">온기 ${e.warmth} / ${e.warmthNeeded} (맞힌 문제 1개 = 온기 1)</div>
      ${e.nestSlot === null ? `<button class="btn sm out" data-act="toNest" data-id="${e.id}">둥지로 옮기기</button>` : e.ready ? `<button class="btn sm gold" data-act="hatch" data-id="${e.id}">🐣 부화시키기!</button>` : ''}</div></div>`
  const nestHtml = () => `${me.unlocked.nest ? '' : talk('naty', '둥지는 3스테이지 "로봇 키트"를 깨면 열려요!')}
    <h3 style="margin:6px 0">🪺 둥지 (${nestEggs.length} / ${me.nestSlots})</h3>
    <div class="nests">${nestEggs.map(eggCard).join('') || '<div class="empty box soft">둥지가 비어 있어요. 알 스테이지(🥚)를 깨면 알을 얻어요.</div>'}</div>
    ${boxEggs.length ? `<h3 style="margin:14px 0 6px">📦 알 상자</h3><div class="nests">${boxEggs.map(eggCard).join('')}</div>` : ''}
    <p class="small mute" style="margin-top:10px">배틀에서 문제를 맞힐 때마다 둥지의 모든 알이 따뜻해져요. 같은 펫은 그 등급을 다 모을 때까지 나오지 않아요 (중복 없음).</p>`
  const dexHtml = () => `<p class="small">${dex.filter((d) => d.owned).length} / ${dex.length} 수집</p><div class="dex">${dex.map((d) => {
      const p = pets.find((x) => x.speciesId === d.speciesId)
      return `<div class="d ${d.owned ? '' : 'no'}" style="border-color:${d.owned ? RARITY_COL[d.rarity] : '#1f1a30'}"><div class="im">${d.owned ? petImg(d.speciesId, p?.form ?? 'baby') : eggSprite(d.rarity)}</div>
        <b class="small">${d.owned ? NAME[d.speciesId] : '???'}</b><small style="color:${RARITY_COL[d.rarity]}">${RARITY_KO[d.rarity]}</small></div>`
    }).join('')}</div>`

  const draw = () => {
    body.innerHTML = `<div class="row between" style="margin-bottom:10px"><h2>🏠 마이룸</h2><button class="btn out sm" data-act="hub">← 홈</button></div>
      <div class="tabs"><button class="tab ${tab === 'room' ? 'on' : ''}" data-act="tab" data-t="room">🐾 내 펫 (${pets.length})</button>
        <button class="tab ${tab === 'nest' ? 'on' : ''}" data-act="tab" data-t="nest">🪺 둥지${ready ? ` 🔔${ready}` : ''}</button>
        <button class="tab ${tab === 'dex' ? 'on' : ''}" data-act="tab" data-t="dex">📖 도감</button></div>
      ${tab === 'room' ? roomHtml() : tab === 'nest' ? nestHtml() : dexHtml()}`
    if (tab === 'room') wander()
  }
  function wander(): void {
    const room = body.querySelector('#room')
    if (!room) return
    const id = setInterval(() => {
      if (!room.isConnected) { clearInterval(id); return }
      room.querySelectorAll<HTMLElement>('.rpet').forEach((el) => { if (Math.random() < 0.5) el.style.left = `${4 + Math.random() * 76}%` })
    }, 3500)
  }
  function petCard(p: Pet): void {
    const m = modal(`<div class="petcard"><div class="pic">${petImg(p.speciesId, p.form)}</div><div>
      <h2>${esc(p.nickname)} <span class="tag">Lv.${p.level} ${FORM_KO[p.form]}</span></h2>
      <div class="small"><span class="tag" style="background:${RARITY_COL[p.rarity]}">${RARITY_KO[p.rarity]}</span> <span class="tag cat-${p.type}">${CAT_KO[p.type]} 타입</span> ${NAME[p.speciesId]}</div>
      <div class="row small" style="margin:6px 0"><span class="mood"><i style="background:${MOOD_COL[p.mood]}"></i>${MOOD_KO[p.mood]}</span>${p.fedToday ? '🍖 오늘 먹음' : ''}</div>
      <div class="bar xp"><i style="width:${p.xpToNext ? (p.xp / p.xpToNext) * 100 : 100}%"></i></div><div class="small">${p.xp} / ${p.xpToNext || 'MAX'} XP</div>
      ${p.skills.map((k) => `<div class="sk"><span>${esc(k.nameKo)} ${k.signature ? '⭐' : ''}</span><span class="small">${CAT_KO[k.category]} · 위력 ${k.power}</span></div>`).join('')}
      ${p.passiveKo ? `<p class="small">✨ ${esc(p.passiveKo)}</p>` : ''}
      <form class="row" id="rn" style="margin-top:8px"><input class="inp" id="rnv" maxlength="8" value="${esc(p.nickname)}" style="max-width:160px"><button class="btn sm out">이름 바꾸기</button></form>
      <div class="row" style="margin-top:10px">${p.isPartner ? '<span class="tag" style="background:#fbbf24">★ 파트너</span>' : '<button class="btn sm" data-act="partner">★ 파트너로 정하기</button>'}
        <button class="btn sm green" data-act="feed" ${p.fedToday ? 'disabled' : ''}>🍖 먹이 주기 (5셀)</button><button class="btn sm out" data-act="close">닫기</button></div>
    </div></div>`, true)
    $<HTMLFormElement>('#rn', m).onsubmit = async (e) => { e.preventDefault(); try { await api.renamePet(p.id, $<HTMLInputElement>('#rnv', m).value); closeModal(); go('room') } catch (er) { showError(er) } }
    onAct(m, {
      close: closeModal,
      partner: async () => { await api.setPartner(p.id); closeModal(); toast(`${p.nickname}이(가) 파트너가 됐어요!`); go('room') },
      feed: async () => { const r = await api.feed(p.id); closeModal(); toast(`냠냠! 오늘 XP +10% · 남은 셀 ${r.cells}`); go('room') },
    })
  }
  async function hatch(e: Egg): Promise<void> {
    const m = modal(`<div class="center"><h2>알이 흔들려요…</h2><div style="width:160px;height:180px;margin:20px auto" class="egg-tap shake" id="he">${eggSprite(e.rarity)}</div></div>`)
    const el = $('#he', m)
    const anim = setInterval(() => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake') }, 400)
    try {
      const [r] = await Promise.all([api.hatch(e.id), sleep(1600)])
      clearInterval(anim)
      if (r.result === 'PET' && r.pet) {
        m.innerHTML = `<div class="center"><h2 style="color:${RARITY_COL[e.rarity]}">✨ ${RARITY_KO[e.rarity]} 펫 탄생! ✨</h2><div class="hatch-pet" style="margin:10px auto">${petImg(r.pet.speciesId, 'baby')}</div>
          <p><b>${NAME[r.pet.speciesId]}</b> · ${CAT_KO[r.pet.type]} 타입${r.pet.passiveKo ? `<br><span class="small">✨ ${esc(r.pet.passiveKo)}</span>` : ''}</p>
          <form class="row" id="nf" style="justify-content:center"><input class="inp" id="nv" maxlength="8" value="${esc(r.pet.nickname)}" style="max-width:180px"><button class="btn">이름 짓기</button></form>
          <div class="row" style="justify-content:center;margin-top:10px"><button class="btn sm out" data-act="close">나중에</button><button class="btn sm gold" data-act="partner">★ 파트너로!</button></div></div>`
        $<HTMLFormElement>('#nf', m).onsubmit = async (ev) => { ev.preventDefault(); await api.renamePet(r.pet!.id, $<HTMLInputElement>('#nv', m).value); toast('이름을 지었어요!'); closeModal(); go('room') }
        onAct(m, { close: () => { closeModal(); go('room') }, partner: async () => { await api.setPartner(r.pet!.id); closeModal(); go('room') } })
      } else {
        m.innerHTML = `<div class="center">${talk('naty', '이 친구는 이미 있어서 간식 꾸러미로 바뀌었어! (+100 XP)')}<p>${esc(r.snackXpTo?.nickname ?? '')} Lv.${r.snackXpTo?.level}</p><button class="btn" data-act="close">좋아요</button></div>`
        onAct(m, { close: () => { closeModal(); go('room') } })
      }
      void refreshMe()
    } catch (er) { clearInterval(anim); closeModal(); showError(er) }
  }
  onAct(body, {
    hub: () => go('hub'),
    tab: (el) => { tab = el.dataset.t as typeof tab; draw() },
    pet: (el) => petCard(pets.find((p) => p.id === Number(el.dataset.id))!),
    hatch: (el) => hatch(eggs.find((e) => e.id === Number(el.dataset.id))!),
    toNest: async (el) => { await api.moveEggToNest(Number(el.dataset.id)); go('room') },
  })
  if (ready && tab === 'room') tab = 'nest'
  draw()
}
