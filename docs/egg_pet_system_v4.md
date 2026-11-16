# 코덱스의 시험: Egg & Pet System (v4)

Nov 2, 2026 · @Wamossssss

> Repo copy, updated 2 Nov: egg sources follow `player_journey.md` (Mythic only from boss drops), and the Battle Room follows `progress_v4.md` section 5 (no live duel; the Friend Challenge here is the ghost challenge). Exact numbers live in `content/`.

## Midterm feedback → what changes

Pets hatched from eggs replace the student's spirit (정령), and Battle Room opens only after Chapter 1 is cleared. This answers every open point from the midterm feedback (2 Nov).

| # | Feedback | v4 answer |
| --- | --- | --- |
| 1 | DIMC question types: good | Kept. Each pet also gets a DIMC type (디지털 · AI · 메이킹 · 컴퓨팅) |
| 2 | Story missions (puzzle, ordering, pixel art, rhythm): good direction | Kept. Pets act in these missions the same way they act in battles |
| 3 | Spirit concept unclear: is Naty the student's spirit, or are there many? | Only **Codex** and **Naty** are spirits. Students raise **pets**, DOROLAND's animals, hatched from eggs |
| 4 | No types, grades or growth process | 5 rarities (Common → Mythic), 4 DIMC types, 4 visible growth forms per pet |
| 5 | Room battles: too few users online | Battle Room becomes a **record challenge** (async). Live room code is optional |
| 6 | Make growth visible (look, skills, My Room) | Form changes at Lv 4, 7 and 10; new skills; pets live in **My Room** with a nest and a 도감 (collection book) |
| 7 | Finish solo story first | Battle Room is locked until the **Chapter 1 boss** is cleared |

## Concept: pets, not spirits

Each student raises a team of DOROLAND animals hatched from eggs; one of them is their **partner** in battles and missions. Spirits stay in the story only.

| Who | What they are | Game role |
| --- | --- | --- |
| **Codex** | Guardian spirit of DOROLAND | Sets the trials (anomalies, chapter bosses). Mythic eggs are "Codex's own" |
| **Naty (네이티)** | Codex's companion spirit | Tutorial guide. Hands the student their **first egg** (replaces the purple sprout) |
| **Pets** | DOROLAND's animals, hatched from eggs | The student's partner and collection. Many per student, 1 active partner |
| Rico · Zero · Xylo · Void | Unchanged | Hint · pet mood and feeding · shop · weekly report |

**Story tie-in.** In Chapter 1 the Safari animals vanish (Stage 6). Codex has hidden their eggs inside the anomalies. When a recruit calms an anomaly, the egg it was holding is entrusted to them. This gives a story reason for eggs to come from stages, and for rarer eggs to sit deeper in the park.

**Mood colour** moves from the spirit to the pet's **collar glow** (sky blue calm · green curious · yellow tense · purple sad · white perfect harmony). Zero still reads it out. Red stays reserved for anomalies.

## The five eggs

Each rarity has one egg design, named after the part of DOROLAND it comes from. The colour of the egg is also the rarity colour used on pet cards, frames and the Lv 10 aura.

| Rarity | Egg name | Look | Rarity colour | Hatch light |
| --- | --- | --- | --- | --- |
| Common | **새싹알 Sprout Egg** | Cream shell with soft green speckles; a two-leaf sprout pokes out of the top | Leaf green #7BC67E | Gentle green puff |
| Uncommon | **물방울알 Dewdrop Egg** | Pale aqua shell with wavy water stripes; a glossy dewdrop shine on one side | Sky aqua #4FC3F7 | Splash of bubbles |
| Rare | **회로알 Circuit Egg** | Deep navy shell traced with gold circuit lines that pulse like a heartbeat (Xylo's tech meets nature) | Royal blue #3D5AFE | Circuit lines light up one by one |
| Epic | **황금갈기알 Sunmane Egg** | Amber-gold shell with a flame-like mane pattern wrapping around it; warm light leaks from tiny cracks | Sunset gold #FFB300 | Sunburst rays |
| Mythic | **코덱스의 알 Codex Egg** | Iridescent shell that shifts purple → teal; star-rune markings; a ring of floating light motes; glows like the purple sprout | Prism purple #9C27B0 → teal | Constellation forms, then shatters into stars |

Design rule: every egg is recognisable as a silhouette alone (sprout · drop shine · circuit lines · mane · floating ring), so the 도감 can show locked eggs in grey and still look exciting.

## The 15 pets

Three pets per egg, rising from home animals to wild, then Korean mythic guardians. Every pet has a **DIMC type**, a **signature skill** (unlocks Lv 5) and, from Uncommon up, one small **passive**.

Fairness rule: base skill power is the same for every pet (20 → 25 → 30). Type gives **+20 % power** on skills of the pet's own category. Rarity only adds a passive and a fancier look, so a Common pet can still 3-star every stage.

| Rarity | Pet | Type | Signature skill (Lv 5) | Passive |
| --- | --- | --- | --- | --- |
| Common | 강아지 Dog | 컴퓨팅 | 킁킁 추적 Sniff Trace | — |
| Common | 고양이 Cat | 디지털 | 픽셀 냥펀치 Pixel Paw | — |
| Common | 토끼 Rabbit | 메이킹 | 당근 드릴 Carrot Drill | — |
| Uncommon | 여우 Fox | AI | 꼬리 예측 Tail Forecast | 영리한 꼬리: combo starts at ×1.2 |
| Uncommon | 펭귄 Penguin | 컴퓨팅 | 줄서기 행진 Line-up March | 차례차례: ordering questions get +5 s |
| Uncommon | 레서판다 Red Panda | 메이킹 | 대나무 공방 Bamboo Workshop | 든든한 간식: food gives +15 % XP (not +10 %) |
| Rare | 늑대 Wolf | 컴퓨팅 | 무리 알고리즘 Pack Algorithm | 무리의 힘: a dodge adds +0.3 combo (not +0.2) |
| Rare | 판다 Panda | 디지털 | 흑백 필터 Mono Filter | 느긋함: first wrong answer per battle costs half energy |
| Rare | 독수리 Eagle | AI | 매의 눈 Hawk Scan | 높은 시야: 1 free Rico's hint per day |
| Epic | 사자 Lion | 메이킹 | 포효 해머 Roar Hammer | 왕의 포효: first skill each battle +30 % power |
| Epic | 호랑이 Tiger | 디지털 | 호랑이 줄무늬 코드 Stripe Code | 호랑이 기운: starts each battle with 110 energy |
| Epic | 눈표범 Snow Leopard | AI | 설원 분석 Snowfield Insight | 설원의 집중: +5 s on every question |
| Mythic | 해치 Haechi | 컴퓨팅 | 정의의 판정 Fair Verdict | Once per battle, a wrong dodge counts as correct |
| Mythic | 봉황 Bonghwang | 메이킹 | 불꽃 대장간 Ember Forge | Once per battle, revives at 30 energy instead of 0 |
| Mythic | 청룡 Blue Dragon | AI | 구름 신경망 Cloud Network | Combo grows twice as fast |

Type spread: 컴퓨팅 4 · AI 4 · 메이킹 4 · 디지털 3. All art will be original drawings (Haechi included, not Seoul's official mascot). Names are placeholders.

## How students earn eggs

Eggs come from four places: first clears of egg stages (Stage 3, Stage 6, boss), replay drops on those stages, quests and achievements. The deeper the story, the rarer the egg. **Updated 2 Nov:** replay drop rates and the Mythic rule are in `player_journey.md` and `content/egg_drop_rates.csv`. No source guarantees a Mythic; Mythics drop only from bosses (1–5 %, pity at 50 boss clears).

**First-clear story eggs** (fixed per stage, `content/chapters.json`):

| Chapter | Stage 1 | Stage 3 | Stage 6 | Boss |
| --- | --- | --- | --- | --- |
| 1 신비한 초대, 사파리 | Common (Naty's starter) | Common | Uncommon | Rare |
| 2 멈춰버린 기계의 노래 | — | Uncommon | Rare | Epic |
| 3 잊혀진 시간 속으로 | — | Rare | Rare | Epic |
| 4 구름을 넘어 진실 속으로 | — | Rare | Rare | Epic |
| 5 코덱스의 선택 | — | Rare | Epic | Epic |

Chapter 1 alone gives 4 eggs, so a new student has a starter plus 3 more pets within the first week.

**Quest eggs** (rarity follows the student's progress):

| Quest | Reward | Egg rarity |
| --- | --- | --- |
| Daily quests (3 per day, e.g. "feed your pet", "clear 1 stage", "5 correct 컴퓨팅 answers") | Cells + 1 quest stamp per day all 3 are done | — |
| Weekly egg: 5 stamps in one week | 1 egg | Common before Ch 1 cleared · Uncommon after Ch 1 · Rare after Ch 3 |

**Achievement eggs** (once each):

| Achievement | Egg |
| --- | --- |
| Chapter 1, every stage ★★★ | Epic |
| 50 correct answers in all 4 DIMC categories | Rare |
| Collect all 3 pets of one rarity | Next rarity up (max Epic) |
| Finish all 5 chapters with ★★★ on every boss | Epic |

Mythic eggs only come from boss replay drops, so they stay special and give players a reason to replay bosses.

## Hatching and fairness rules

An egg hatches by being **warmed with correct answers**, not by a real-time timer, so it works for students who log in only a few times a week.

| Rarity | Correct answers to hatch |
| --- | --- |
| Common | 5 |
| Uncommon | 10 |
| Rare | 20 |
| Epic | 35 |
| Mythic | 50 |

1. A new egg goes into the **nest** in My Room (1 slot; a 2nd slot unlocks after Chapter 1). Extra eggs wait in the egg box.
2. Every correct answer in any mode warms the egg in the nest. The egg wobbles more and shows small cracks at 50 % and 90 %.
3. At 100 % the student taps it: a hatch animation in the rarity colour, then they name the pet.

**Fairness (no loot boxes):**

- Eggs are **never sold**, for cells or real money. They are only earned by playing.
- The **rarity is fixed** by the source. Only which of the 3 pets comes out is random.
- **No duplicates until a set is complete:** each rarity draws from a 3-pet bag without replacement. Three eggs of one rarity always give all three pets.
- After a set is complete, a duplicate egg becomes a **pet snack pack** (+100 XP to any pet) instead.

## Pet growth: what visibly changes

A pet grows from Lv 1 to Lv 10 through 4 forms; every form change is something the student can see in battle and in My Room.

| Level | Form | What changes on screen | What changes in play |
| --- | --- | --- | --- |
| 1–3 | 아기 Baby | Small, round, big eyes | 4 basic skills (one per DIMC), power 20 |
| 4–6 | 꼬마 Junior | Bigger body, rarity-coloured scarf or collar | Lv 3: basic skills power 25 · Lv 5: **signature skill** replaces the basic skill of its own type |
| 7–9 | 어른 Adult | Full-size, final pose, type badge on the card | Lv 7: all skills power 30 |
| 10 | 빛나는 Shining | Adult + aura in the rarity colour + name plate shines | +1 slot in My Room decorations; pet can be shown on the student's DOROBUS profile |

- **XP:** Lv n → n+1 needs 50 × n XP (2,250 total to Lv 10). A cleared stage gives 30–60 XP, so an active student reaches Lv 10 in about 2–3 weeks.
- Only the **partner** pet gets battle XP. Pet snacks and feeding can level any pet.
- Pets never die or lose levels. Not fed for 2+ days = purple collar and no feeding bonus, nothing worse.

**My Room** (new screen) is where growth is shown off:

- The **nest** with the current egg and its warmth bar.
- All owned pets wander the room; tap one to see level, form, skills and mood. Choose the partner here.
- The **도감 (collection book)**: 15 slots in 5 rarity rows. Owned = colour art; not owned = grey silhouette of its egg.
- Decorations from Xylo's shop (backgrounds, beds, toys).

## Battle Room: unlocked after Chapter 1

Battle Room stays locked (grey door with a padlock in the plaza) until the student clears the **Chapter 1 boss**. Naty then opens it in a short scene: "이제 다른 신입사원들과 실력을 겨뤄볼 시간이야!"

Why lock it: students learn the battle rules and raise at least 4 pets first, and the story stays the main path, as the feedback asked.

Because only 5–10 students are online a day, the main mode is a **record challenge**, which needs nobody else online:

| Mode | How it works | Needs both online? |
| --- | --- | --- |
| **Weekly Trial** (main) | Everyone gets the same 8 questions this week. Score = correct × 100 + time bonus + combo bonus. Friends' and class rankings reset every Monday | No |
| **Friend Challenge** | Play a set, then send its 6-digit code (e.g. via 도로톡). The friend plays the same questions within 48 h with their partner pet; higher score wins | No |

Rewards: Weekly Trial top 3 among friends get a badge for My Room; Friend Challenge win 10 cells · lose 3 (max 2 rewarded per friend per day, as in v3).

## Database changes from v3

The spirit zone becomes a pet zone; everything else in v3 stays.

| Change | Table | Key columns |
| --- | --- | --- |
| New | `rarities` | id, name, colour, hatch\_correct\_needed |
| New | `pet_species` | id, rarity\_id, name, dimc\_category\_id, signature\_skill\_id, passive\_code, art\_baby/junior/adult |
| New | `eggs` | id, student\_id, rarity\_id, source (STORY / QUEST / ACHIEVEMENT), source\_ref, warmth, in\_nest, hatched\_pet\_id |
| Replaces `spirits` | `pets` | id, student\_id, species\_id, nickname, level, xp, last\_fed, mood, is\_partner |
| Replaces `spirit_skills` | `pet_skills` | pet\_id × skill\_id, is\_equipped |
| New | `quests`, `student_quests` | daily / weekly quests and progress |
| New | `achievements`, `student_achievements` | achievement rules and when each was earned |
| New | `challenge_sets`, `challenge_scores` | Weekly Trial and Friend Challenge question sets and scores |
| Column added | `story_stages` | egg\_rarity\_id (null = no egg) |
| Column added | `students` | battle\_room\_unlocked\_at |

**Transactions to show on the DB slides:**

1. **Stage clear:** stars → next stage unlocked → partner XP → egg created (first clear only) → reward mail. Clearing the Ch 1 boss also sets `battle_room_unlocked_at`.
2. **Hatch:** check warmth ≥ needed → pick a species from that rarity not yet owned (bag rule) → create pet → mark egg hatched.
3. **No-duplicate query:** species of that rarity minus species the student owns; if empty → snack pack.

## Scope for the final and art plan

The final build ships the full egg system, but only the 9 pets Chapter 1 can give (Common, Uncommon, Rare) need finished art.

| Priority | Items |
| --- | --- |
| **Must** | Eggs from Chapter 1 stages · hatching by correct answers · bag rule · 9 pets (C/U/R) with levels, skills and 4 forms · My Room with nest and 도감 · Battle Room lock |
| **Should** | Daily + weekly quests · Weekly Trial · Friend Challenge · rarity passives |
| **Could** | Epic achievement egg (Ch 1 all ★★★) with 3 Epic pets drawn |
| **Not in final** | Mythic pets playable · Chapters 2–5 eggs |

**Art budget:** 9 pets × 2 drawings (Baby, Adult) = 18 drawings. Junior = Baby scaled up + scarf overlay; Shining = Adult + aura overlay. 5 egg designs. Epic and Mythic pets appear as egg silhouettes in the 도감 ("Coming in a later chapter").

**Open question for DORO:** may students rename pets freely, or pick from a safe name list (safety rule: nicknames only)?
