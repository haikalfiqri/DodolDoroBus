/**
 * Pixel sprites drawn in code (SVG rects), same method as the midterm prototype.
 * Pets are Wam's art, pixelated to 64x64 PNGs in public/art/px (see scripts/pixelate.py).
 */
import type { PetForm, Rarity } from '../types'

export function spr(grid: string[], pal: Record<string, string>, cls = ''): string {
  const w = Math.max(...grid.map((r) => r.length))
  let rects = ''
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === '.' || !pal[ch]) { x++; continue }
      let n = 1
      while (row[x + n] === ch) n++
      rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${pal[ch]}"/>`
      x += n
    }
  })
  return `<svg class="px ${cls}" viewBox="0 0 ${w} ${grid.length}" preserveAspectRatio="xMidYMax meet" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`
}

/* ---------- characters ---------- */
const BODY = ['...TTTTTTTTTT...', '..STTTTUUTTTTS..', '..STTTTUUTTTTS..', '..STTTTUUTTTTS..', '..SSTTTUUTTTSS..', '....TTTTTTTT....', '....PPPPPPPP....', '....PPPPPPPP....', '...PPPP..PPPP...', '...BBBB..BBBB...', '...BBBB..BBBB...']
const FRONT_CAP = ['................', '.....KKKKKKK....', '....KKKKKKKKK...', '....KKKKKKKKK...', '...LLLLLLLLLLL..', '...HSSSSSSSSSH..', '...HSWESSWESSH..', '....SSSSSSSSS...', '....SCSSMMSCS...', '.....SSSSSSS....', '......SSSS......', ...BODY]
const FRONT_HAIR = ['................', '....HHHHHHHH....', '...HHHHHHHHHH...', '...HHHHHHHHHH...', '...HHSSSSSSHH...', '...HSSSSSSSSH...', '...HSWESSWESH...', '....SSSSSSSS....', '....SCSMMSCS....', '.....SSSSSS.....', '......SSSS......', ...BODY]
const CODEX = ['......AA......', '......AA......', '..DDDDDDDDDD..', '.DWWWWWWWWWWD.', '.DWBBWWWWBBWD.', '.DWBBWWWWBBWD.', '.DWWWWWWWWWWD.', '.DWWMMMMMMWWD.', '.DWWWWWWWWWWD.', '..DDDDDDDDDD..', '....DD..DD....']
const NATY = ['....LL....LL....', '...LKKL..LKKL...', '...LKKKLLKKKL...', '..LKKKKKKKKKKL..', '..KKWWKKKKWWKK..', '..KKWEKKKKWEKK..', '..KKKKKKKKKKKK..', '..KCKKKMMKKKCK..', '...KKKKKKKKKK...', '....KKKKKKKK....', '..TT.KKKKKK.TT..', '.....KK..KK.....']
const CHARS: Record<string, [string[], Record<string, string>]> = {
  codex: [CODEX, { D: '#1f3a5f', W: '#eaf2ff', B: '#3b82f6', A: '#f97316', M: '#9db4d8' }],
  naty: [NATY, { K: '#ff8a5b', L: '#ffd2bd', W: '#fff', E: '#2b2438', C: '#f4a3a3', M: '#d9363e', T: '#ffb48f' }],
  rico: [FRONT_CAP, { K: '#1fb5a5', L: '#4fdac8', H: '#3b2415', S: '#f2c9a5', W: '#fff', E: '#2b2438', C: '#f4a3a3', M: '#d9363e', T: '#2dd4bf', U: '#fff', P: '#2f3447', B: '#262b3b' }],
  zero: [FRONT_HAIR, { H: '#e5e7eb', S: '#f2c9a5', W: '#fff', E: '#2b2438', C: '#f4a3a3', M: '#d9363e', T: '#22c55e', U: '#fde047', P: '#2f3447', B: '#262b3b' }],
  xylo: [FRONT_CAP, { K: '#a855f7', L: '#d8b4fe', H: '#6b3f2a', S: '#f2c9a5', W: '#fff', E: '#2b2438', C: '#f4a3a3', M: '#d9363e', T: '#f59e0b', U: '#fff', P: '#3a3f5c', B: '#262b3b' }],
  void: [CODEX, { D: '#3b0764', W: '#ede9fe', B: '#a855f7', A: '#22d3ee', M: '#c4b5fd' }],
  sys: [CODEX, { D: '#334155', W: '#f1f5f9', B: '#64748b', A: '#94a3b8', M: '#cbd5e1' }],
}
export const CHAR_NAME: Record<string, string> = { codex: '코덱스', naty: '네이티', rico: '리코', zero: '제로', xylo: '자일로', void: '보이드', sys: '시스템' }
export const charSprite = (id: string) => { const [g, p] = CHARS[id] ?? CHARS.sys; return spr(g, p) }

/* ---------- eggs ---------- */
const EGG = ['.....OOOO.....', '....OHBBBO....', '...OHBBBBBO...', '..OHBBSBBBBO..', '..OBBBBBBSBO..', '.OBBSBBBBBBBO.', '.OBBBBBBSBBBO.', '.OBBBBBBBBBBO.', '.OBSBBBBBBSBO.', '.OBBBBBSBBBBO.', '.OBBBBBBBBBBO.', '..OBBBBBBBBO..', '..ODBBBBBBDO..', '...OODDDDOO...', '.....OOOO.....']
const EGG_PAL: Record<Rarity, Record<string, string>> = {
  common: { O: '#2d3a26', B: '#f5f0dc', S: '#7bc67e', H: '#ffffff', D: '#d9d2b4' },
  uncommon: { O: '#123a4a', B: '#b9ecfb', S: '#4fc3f7', H: '#ffffff', D: '#86d6ef' },
  rare: { O: '#121a4d', B: '#3d5afe', S: '#ffd54f', H: '#9fb0ff', D: '#2a3fc4' },
  epic: { O: '#4a2c00', B: '#ffb300', S: '#fff3c4', H: '#ffe082', D: '#d48a00' },
  mythic: { O: '#2a0a40', B: '#9c27b0', S: '#26c6da', H: '#e1bee7', D: '#6a1b9a' },
}
export const eggSprite = (r: Rarity, cls = '') => spr(r === 'common' ? ['......LL......', '.....L..L.....', ...EGG.slice(1)] : EGG, { ...EGG_PAL[r], L: '#4caf50' }, cls)
export const RARITY_KO: Record<Rarity, string> = { common: '커먼', uncommon: '언커먼', rare: '레어', epic: '에픽', mythic: '신화' }
export const RARITY_COL: Record<Rarity, string> = { common: '#7BC67E', uncommon: '#4FC3F7', rare: '#3D5AFE', epic: '#FFB300', mythic: '#9C27B0' }

/* ---------- anomalies (red is only ever used for anomalies) ---------- */
const ANOMALY = ['....GGGGGG......', '..GGHHHHHHGG....', '.GHH......HHG...', '.GH..RRRR..HG...', 'GH..RRWWRR..HG..', 'GH..RRWKRR..HG..', 'GH..RRRRRR..HG..', '.GH..RRRR..HG...', '.GHH......HHGG..', '..GGHHHHHHG..GG.', '....GGGGGG....G.', '.GG.......GG....']
const SHADOW = ['.K..........K.', '.KK........KK.', '..KK.KKKK.KK..', '...KKKKKKKK...', '..KKKKKKKKKK..', '..KKKKRRKKKK..', '..KKKKRRKKKK..', '..KKKKKKKKKK..', '...KKKKKKKK...', '..KK.KKKK.KK..', '.KK...KK...KK.']
const ANOMALY_COL: Record<string, [string, string]> = {
  c1s1: ['#64748b', '#cbd5e1'], c1s2: ['#0284c7', '#bae6fd'], c1s3: ['#b45309', '#fcd34d'], c1s4: ['#15803d', '#bbf7d0'],
  c1s5: ['#7c3aed', '#ddd6fe'], c1s6: ['#0f766e', '#99f6e4'],
}
export function anomalySprite(stageId: string, boss: boolean, cls = ''): string {
  if (boss) return spr(SHADOW, { K: '#111827', R: '#ef4444' }, cls)
  const [g, h] = ANOMALY_COL[stageId] ?? ['#64748b', '#cbd5e1']
  return spr(ANOMALY, { G: g, H: h, R: '#ef4444', W: '#fff', K: '#111827' }, cls)
}

/* ---------- scenery ---------- */
const TREE = ['...ll...', '..llll..', '.llllll.', 'llllllll', '.llllll.', '...SS...', '...SS...']
export const treeSprite = () => spr(TREE, { l: '#16a34a', S: '#a16207' })
const BOWL = ['.OOOOOO.', 'OyyyyyyO', '.OyyyyO.', '..OOOO..']
export const bowlSprite = () => spr(BOWL, { O: '#7c2d12', y: '#f59e0b' })

/* ---------- pets: Wam's art, pixelated ---------- */
export const petImg = (speciesId: string, form: PetForm, cls = '') =>
  `<img class="pet ${cls}" src="/art/px/pet_${speciesId}_${form}.png" alt="" draggable="false">`
export const MOOD_COL: Record<string, string> = { calm: '#7DD3FC', curious: '#86EFAC', tense: '#FDE047', sad: '#C4B5FD', harmony: '#FFFFFF' }
export const MOOD_KO: Record<string, string> = { calm: '편안해요', curious: '궁금해요', tense: '긴장했어요', sad: '시무룩해요', harmony: '조화로워요' }
export const FORM_KO: Record<PetForm, string> = { baby: '아기', junior: '꼬마', adult: '어른', shining: '빛나는' }
export const CAT_KO: Record<string, string> = { digital: '디지털', ai: 'AI', making: '메이킹', computing: '컴퓨팅' }
export const CAT_ICON: Record<string, string> = { digital: '💾', ai: '🧠', making: '🔧', computing: '💻' }
export const TYPE_KO: Record<string, string> = { choice4: '4지선다', ox: 'O/X', order: '순서', keyword: '키워드', command_order: '명령 블록', pixel_art: '픽셀 아트', puzzle: '패턴 퍼즐' }
