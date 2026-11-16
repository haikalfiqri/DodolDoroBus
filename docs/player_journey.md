# 코덱스의 시험: Player Journey Walkthrough

Nov 2, 2026 · planning

A student goes from new recruit to end-game in five phases. The Chapter 1 boss opens Battle Room, and the Chapter 5 boss ends the story and starts the Mythic hunt.

```
Day 1          Week 1           After Ch 1         Story finale      After the story
New recruit -> Chapter 1    ->  Chapters 2-4   ->  Chapter 5     ->  End-game
starter egg    4 eggs, 4 pets   Battle Room        Codex's trial     Mythic hunt
1 pet, Lv 1    partner ~Lv 4    partner Lv 5-9     Epic eggs         도감 15 / 15
Mythic: none   boss Mythic 1 %  boss Mythic 2-4 %  boss Mythic 5 %   pity at 50 clears
                         ^ Ch 1 boss: Battle Room opens   ^ Ch 5 boss: story complete
```

Each phase gives better egg odds than the last, so replaying always pays more further into the story.

## Egg drop rates

Every chapter has three **egg stages**: Stage 3, Stage 6 and the boss after Stage 6. The first clear always gives an egg. Every replay clear after that rolls for an egg, and the odds get better the deeper the chapter. **Mythic eggs drop only from chapter bosses**, from 1 % in Chapter 1 up to **5 % on the Chapter 5 final boss**, so students have a reason to replay bosses.

**First clear: a guaranteed egg** (no Mythic is ever guaranteed):

| Chapter | Stage 1 | Stage 3 | Stage 6 | Boss |
| --- | --- | --- | --- | --- |
| 1 신비한 초대, 사파리 | Common (Naty's starter) | Common | Uncommon | Rare |
| 2 멈춰버린 기계의 노래 | — | Uncommon | Rare | Epic |
| 3 잊혀진 시간 속으로 | — | Rare | Rare | Epic |
| 4 구름을 넘어 진실 속으로 | — | Rare | Rare | Epic |
| 5 코덱스의 선택 | — | Rare | Epic | Epic |

**Replay clears: chance per clear** (% for each rarity; the last column is the total chance of any egg). Machine-readable copy: `content/egg_drop_rates.csv`.

| Egg stage | Common | Uncommon | Rare | Epic | Mythic | Any egg |
| --- | --- | --- | --- | --- | --- | --- |
| Ch 1 · Stage 3 | 25 | 5 | — | — | — | 30 |
| Ch 1 · Stage 6 | 20 | 12 | 3 | — | — | 35 |
| Ch 1 · Boss | 10 | 20 | 12 | 4 | **1** | 47 |
| Ch 2 · Stage 3 | 15 | 15 | 5 | — | — | 35 |
| Ch 2 · Stage 6 | — | 20 | 12 | 3 | — | 35 |
| Ch 2 · Boss | — | 15 | 20 | 8 | **2** | 45 |
| Ch 3 · Stage 3 | — | 20 | 12 | 3 | — | 35 |
| Ch 3 · Stage 6 | — | 15 | 18 | 5 | — | 38 |
| Ch 3 · Boss | — | 10 | 22 | 10 | **3** | 45 |
| Ch 4 · Stage 3 | — | 15 | 18 | 5 | — | 38 |
| Ch 4 · Stage 6 | — | 10 | 20 | 8 | — | 38 |
| Ch 4 · Boss | — | 5 | 20 | 16 | **4** | 45 |
| Ch 5 · Stage 3 | — | 10 | 20 | 8 | — | 38 |
| Ch 5 · Stage 6 | — | — | 25 | 13 | — | 38 |
| Ch 5 · Boss | — | — | 20 | 20 | **5** | 45 |

**Rules that go with the roll:**

- A replay rolls only if it is a **rewarded clear** with ★★ or more. Rewarded clears are capped at 10 a day (v3 limit), so a day gives at most 10 rolls.
- **Codex's favour (pity):** each boss clear without a Mythic adds 1 to a meter shown on the boss node. The 50th boss clear in a row without a Mythic always gives one, and the meter resets.
- **Bag rule:** no duplicate pet until all 3 of that rarity are owned; a duplicate after that becomes a pet snack pack (+100 XP).
- Eggs are **never sold**. Rates are stored in `egg_drop_rates`, so the admin can tune them without code.
- Rates are printed on each egg stage's info card ("드롭 확률"), so the chance is never hidden from students or parents.

## Day 1: the new recruit

In about 10 minutes a new student goes from opening the minigame tab to owning a pet and clearing Stage 1.

1. **Minigame tab card.** The "코덱스의 시험" card shows "시작하기".
2. **Codex's invitation letter** (입단 초대장). The student taps "초대 받기".
3. **Naty hands over a Sprout Egg (새싹알)** in the plaza. This is the only egg that hatches by tapping (3 taps), so the student gets a pet at once. All later eggs hatch with correct answers.
4. **Hatch and name.** The bag gives Dog, Cat or Rabbit. The student names it (max 8 characters). It becomes the **partner**.
5. **Naty explains mood.** The collar glow is the pet's mood: green now (curious), sky blue after feeding, purple if not fed for 2+ days. It never gets sick or loses levels.
6. **Stage 1 · 광장의 새싹** (anomaly 지지직 노이즈, gauge 40, 4 rounds). Tutorial battle with mixed easy questions. Naty points at each button the first time: skill → question → dodge.
7. **First result screen.** Stars, partner XP (30 + 10 per star), and the reward mail. The student opens the **mailbox**, claims the cells (+5 first-clear-of-the-day bonus) and sees Xylo's shop and pet food (5 cells).
8. **My Room opens.** The partner walks around, the nest is empty, and the 도감 shows 1 of 15 with 14 grey egg silhouettes. That empty book is the long-term goal.

End of Day 1: 1 pet (Lv 1 Baby), about 15–20 cells, Stage 2 unlocked.

## Chapter 1 walkthrough: 신비한 초대, 사파리

Chapter 1 takes a new student about one week (2–3 stages a session) and ends with 4 pets, a partner at about Lv 4 (Junior form) and Battle Room unlocked. Full lines: `docs/story/chapter1_script.md`.

| Stage | Story beat | Anomaly · gauge · category | First-clear reward | What opens |
| --- | --- | --- | --- | --- |
| 1 광장의 새싹 | The invitation; the plaza | 지지직 노이즈 · 40 · tutorial | Starter Common egg | My Room, mailbox, shop, feeding |
| 2 흩어진 지도 | A storm scatters the Safari map | 회오리 바람 · 50 · 디지털 | Cells, XP | Daily quests, Rico's hint |
| 3 로봇 키트 (egg) | Robot kit; building the Doro Car | 엉킨 톱니 · 60 · 메이킹 | **Common egg** (first story egg) | Nest; hatching by correct answers |
| 4 운전면허 시험 | Zero's 4-course driving test | 오작동하는 도로 코스 · 60 · ordering + quiz | Cells, XP | Command-ordering missions |
| 5 고장 난 전광판 | The LED billboard breaks | 깜빡이 글리치 · 70 · 컴퓨팅 | Cells, XP | Pixel-art mission preview (Should) |
| 6 사라진 동물들 (egg) | The animals vanish; Naty: Codex hid their eggs inside the anomalies | 흐릿한 발자국 · 80 · AI | **Uncommon egg** | Egg replay drops explained |
| Boss 사파리 동굴 (egg) | The Safari cave; free the caged animals | 뿔 달린 그림자 · 100 · all, 6 rounds | **Rare egg**, 20 cells, 100 XP | **Battle Room**, 2nd nest slot, Chapter 2 |

Tips the game gives students:

- Hatch the Stage 3 egg before Stage 6: its 5 correct answers come naturally from Stages 4–5.
- Pick the partner whose type matches the next stage's category for +20 % skill power.
- Feed the partner before playing: +10 % XP that day.
- The boss is the first real wall (gauge 100). If it fails, replay Stage 6 for XP and a chance at another egg.

## Mid-game: Battle Room and Chapters 2–4

Clearing the Chapter 1 boss opens Battle Room, and Chapters 2–4 add a new place, a new mission type and better egg odds each time. These chapters are added later as stage data; the featured missions are our proposal.

**Battle Room** (Naty: "이제 다른 신입사원들과 실력을 겨뤄볼 시간이야!"). Nobody has to be online at the same time:

- **Weekly Trial:** the same 8 questions for everyone this week; friend and class rankings reset every Monday.
- **Ghost challenge:** add a friend with a friend code, then replay a stage with the same question set to beat their saved record.
- Live room duels are removed (progress v4).

| Chapter | Place | Featured mission | First-clear eggs (S3 · S6 · Boss) | Mythic on boss replay | Partner milestone |
| --- | --- | --- | --- | --- | --- |
| 2 멈춰버린 기계의 노래 | Harmonia | Command ordering; rhythm only if time remains | Uncommon · Rare · Epic | 2 % | Lv 5: signature skill |
| 3 잊혀진 시간 속으로 | Carousel | Pattern and sequence puzzles | Rare · Rare · Epic | 3 % | Lv 7: Adult form, power 30 |
| 4 구름을 넘어 진실 속으로 | Ferris wheel | Pixel art | Rare · Rare · Epic | 4 % | Lv 8–9; a second pet raised for type matching |

A mid-game session (about 20 minutes): check My Room (feed, nest warmth) → 3 daily quests while playing → next new stage or an egg-stage replay → one Weekly Trial or ghost challenge → claim mail, shop.

By the end of Chapter 4 a typical player has the Common and Uncommon sets complete, 2–3 Rares, 1–2 Epics and a partner near Lv 9.

## End-game: 코덱스의 선택 and the Mythic hunt

Chapter 5 ends the story: Codex's final trial asks whether the recruits kept their promise to nature, and passing it reveals that the three Codex Eggs are his own guardians.

**Chapter 5 first clear:** Rare (S3), Epic (S6), Epic (boss), the ending scene and the title **"코덱스의 인정"**.

| Goal | What it takes | Reward |
| --- | --- | --- |
| Mythic set: 해치, 봉황, 청룡 | 3 Mythic eggs, each hatched with 50 correct answers | Codex Egg nest skin; constellation background |
| Full 도감 15 / 15 | Every rarity set complete | Gold 도감 cover; "도로랜드 사육사" title |
| All bosses ★★★ | Energy ≥ 80 on all 5 bosses | Epic egg |
| Shining partners | Pets at Lv 10 | Rarity aura; +1 decoration slot per pet |
| Weekly Trial top 3 | Best score among friends that week | My Room badge |

**Best farming route:** the Chapter 5 boss (Mythic 5 %, Epic 20 %, Rare 20 %), or the Chapter 4 boss (4 %) for a weaker team.

## Grinding and pacing

On the Chapter 5 boss a Mythic takes **about 18 clears on average** and **never more than 50**.

| Boss | Mythic chance | After 10 clears | After 20 | After 30 | Average clears (pity 50) |
| --- | --- | --- | --- | --- | --- |
| Ch 1 | 1 % | 10 % | 18 % | 26 % | 40 |
| Ch 2 | 2 % | 18 % | 33 % | 45 % | 32 |
| Ch 3 | 3 % | 26 % | 46 % | 60 % | 26 |
| Ch 4 | 4 % | 34 % | 56 % | 71 % | 22 |
| Ch 5 | 5 % | 40 % | 64 % | 79 % | 18 |

Limits that keep grinding healthy: max 10 rewarded clears a day (only those roll); hatching still needs correct answers; rates and pity always visible; no paid eggs or rerolls; duplicates become snack packs; Void's weekly report shows learning next to eggs earned.

**Playtest metrics:** returning days per week, boss replays per player per day, clears to first Mythic (target 15–25), share of players hitting the 10-clear cap (over 30 % → tune).
