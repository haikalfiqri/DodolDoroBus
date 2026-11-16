# 코덱스의 시험 (Codex's Trial): Progress v3

Hanyang ERICA IC-PBL × DORO Co., Ltd. | DOROBUS minigame tab
Last updated: Fri 2026-10-23 | Midterm presentation: **Mon 2026-10-26**
Team: Imran (presenter A, planning) · Wam (presenter B) · Asyraf (research) · Akip (DB/backend) · Haikal (documentation) · Wafi (front end)

> **v3 replaces v1 and v2.** We redesigned the game after the DORO developer's feedback (23 Oct)
> and based it on DORO's own story (`Doroland Game Design & Story Bible.pdf`).

---

## 0. DORO developer feedback → what we changed

| # | Feedback (23 Oct) | Before (v2) | Now (v3) |
|---|---|---|---|
| 1 | Kids take different courses, so questions based on this week's class don't work | Weekly arena from DLS slides | **General question pool** by DIMC category (디지털 · AI · 메이킹 · 컴퓨팅) and difficulty, the same for every kid |
| 2 | Who is the opponent? Friends making a room would be fun | Real-time random matching | **Solo story mode** (main) + **friend room with a code** |
| 3 | No story; use DOROLAND and pets | Kids' avatars fight; 코덱스 is just a host | Kids are **new recruits**; their **spirit (정령)** calms **Codex's anomalies** in the DOROLAND story |
| 4 | Admin (not teachers) creates and approves questions; how will AI make them? | Teacher approves AI questions made from slides | **Admin only.** AI makes question batches **offline**; the admin approves them |
| 5 | Not fun; kids won't log in just to solve questions | Quiz + cells | **Spirit growth + story progress + friend duels + daily care.** Questions are how the spirit acts, not the goal |
| 6 | Real-time AI grading is too expensive; only 5–10 kids online a day | RAG / LLM grading | **No AI during play.** Only question types the server checks itself |

**Kept from v2:** turn-based battle, HP, skills, combo, mailbox → claim → cell ledger, daily limits, safety rules.

---

## 1. Concept

**Name:** 코덱스의 시험 (Codex's Trial)
**One-liner:** *"도로랜드 신입사원이 되어, 나의 정령과 함께 코덱스의 시험을 풀어나간다."*
(Become a DOROLAND new recruit and pass Codex's trials together with your spirit.)

**Story frame** (from the story bible): every student joins DOROLAND as a new recruit, like Rico and Zero.
On the first day, a small **purple-glowing sprout** appears in the plaza, and the student's own **spirit (정령)** hatches from it.
Codex, the guardian spirit, has started testing humans with **anomalies (이상 현상)** to see if they keep their promise to nature.
The student and their spirit travel through DOROLAND and **calm the anomalies by answering questions**.

We use only the light parts of the story (anomalies, spirits, rescuing the animals). The heavy themes (betrayal, destroying the park) stay in the background.

---

## 2. Characters in the game

| Character | Story role | Game role |
|---|---|---|
| **Codex** | Guardian spirit; tests humans with strange phenomena | Gives the trials: chapter bosses, the title of the game |
| **Naty (네이티)** | Codex's companion spirit; shows emotions through colour | **Tutorial guide**; the model for every student's spirit |
| **Rico** | Analyst; decodes ciphers and code | **Hint:** "리코의 분석" removes one wrong answer (max 1 per battle, 3 cells) |
| **Zero** | Senses the feelings of people and animals | **Spirit care:** tells you how your spirit feels; feeding |
| **Xylo** | Director, engineer; technology that helps nature | **Shop:** spirit accessories, backgrounds |
| **Void** | Observation and analysis robot | **Weekly growth report:** accuracy per DIMC category |

---

## 3. Daily loop

```
Log in → check on my spirit (mood colour) → feed it (cells)
       → play story stages (calm anomalies)
       → spirit gets XP → level up → learns a new skill
       → cells to the mailbox → claim
       → spend at Xylo's shop (food, accessories)
       → (optional) friend duel with a room code
       → tomorrow: spirit is hungry, next stage is waiting, daily bonus
```

**Reasons to come back** (none of them is "to solve questions"): my spirit's growth, the next stage of the story, duels with friends, daily care, and Void's weekly growth report.

---

## 4. Modes

| Mode | Players | Notes |
|---|---|---|
| **Story mode** (main) | Solo vs anomalies | Works even when nobody else is online |
| **Friend duel** | 1 vs 1, spirit vs spirit | One kid creates a room → shares a 6-digit code (e.g. through 도로톡) → the friend joins. No random matching |

## 5. Battle rules

**Story mode: calming an anomaly**

| Rule | Value |
|---|---|
| Gauges | My spirit's **energy 100** · the anomaly's **unstable gauge 100** |
| Length | Up to 4 rounds (8 turns: mine, then the anomaly's) |
| My turn | Pick 1 of my spirit's 4 equipped skills → answer a question from that skill's DIMC category → **correct = the anomaly calms by skill power × combo**; wrong = no effect |
| Anomaly's turn | The anomaly surges → I answer a question → **correct = dodge** (0 damage, combo +0.2); wrong = my spirit loses energy |
| Combo | Up to ×2.0; used up by my next skill |
| Clear | Gauge reaches 0 → calmed. Stars: ★ calmed · ★★ energy ≥ 50 · ★★★ energy ≥ 80 |
| Not cleared | After 8 turns, or energy 0 → "다시 도전" (try again). Small XP, no cells, no other penalty |

**Friend duel:** both spirits start with energy 100. Players take turns using skills, and each answers their own question (correct = hit lands). After 8 turns, more energy wins; energy 0 = KO. Disconnect > 30 s = forfeit.

**Numbers:** skill power 20 (Lv1) → 25 → 30 · multiple choice / O/X 20 s · ordering / keyword 30 s.

**Question types** (the server checks them alone): 4-choice · O/X · put in order · short keyword (the admin lists the accepted answers).

## 6. Spirits

- Hatched from the purple sprout on day 1. The student names it.
- **Level + XP** from battles. New skills unlock at Lv 3, 5 and 7.
- **4 equipped skills**, one per DIMC category to start:
  패턴 스캔 (AI) · 코드 웨이브 (컴퓨팅) · 기어 해머 (메이킹) · 픽셀 실드 (디지털). Names are placeholders.
- **Mood colour** (from the story bible): sky blue = calm, green = curious, yellow = tense, purple = sad, white = perfect harmony.
  - Fed today + played recently → blue / white
  - New stage unlocked → green
  - In battle → yellow
  - Not fed for 2+ days → purple
  - Red is used only for anomalies, never for the student's spirit
- **Daily care:** food costs 5 cells and gives +10 % XP that day. The spirit never dies or loses levels.

## 7. Story mode content

**Chapter 1: 신비한 초대, 사파리** (Act 1 of the story bible), 6 stages + boss:

| Stage | Story moment | Anomaly | Question category |
|---|---|---|---|
| 1 | The invitation, the plaza | Tutorial: the purple sprout awakens | Mixed, easy |
| 2 | A storm scatters the Safari map | Wind anomaly holding the map pieces | 디지털 |
| 3 | Robot kit + building the Doro Car | Jammed robot parts | 메이킹 |
| 4 | Zero's 4-course driving test | Glitching road course | 컴퓨팅 |
| 5 | The LED billboard malfunctions | Scrambled dot-matrix display | 디지털 / 컴퓨팅 |
| 6 | The animals vanish; the mossy shed | Lost-animal trail | AI |
| Boss | The Safari cave | Horned shadow with a red eye: free the caged animals | All, harder |

**Future chapters** (roadmap; added later as content by the admin):
2 The Song of the Stopped Machine (Harmonia) · 3 Into Forgotten Time (Carousel) · 4 The Truth Beyond the Clouds (Ferris Wheel) · 5 Codex's Choice (final trial).

**A chapter is data, not code:** a new chapter = stage rows + dialogue + enemy images. Questions come from the shared pool, so a chapter needs no new questions.

## 8. Questions (admin only)

1. The admin chooses category, difficulty, type and count (e.g. "AI · easy · 4-choice · 30").
2. AI drafts the batch **once, offline**: one request per batch, not per student. The admin can also write questions by hand.
3. The admin reviews each question: approve / edit / reject. Only approved questions are used.
4. Target: 100–150 questions for the final, about 200 for launch.

No AI runs while students play.

## 9. Cells (amounts are our choice, stored in `game_config`)

| Earn (via mailbox) | Spend |
|---|---|
| Story stage clear 5 / 10 / 15 (by stars) · boss 20 | Spirit food 5 |
| Friend duel: win 10 · lose 3 | Rico's hint 3 |
| First battle of the day +5 | Accessories, battle backgrounds (Xylo's shop) |

- Daily cap: 10 rewarded battles, 60 cells. Max 2 rewarded duels vs the same friend per day.
- Claiming mail = one transaction: mail marked claimed + ledger row + balance updated (the balance is stored on the student account, as the developer confirmed).
- Fixed prices only, no loot boxes.

## 10. Safety

Admin-approved questions only · no free chat (emoji only) · nicknames only · daily limits + Naty's "take a break" message · report button on every question.

## 11. Database v3 (PostgreSQL)

| Zone | Tables |
|---|---|
| **Story & content** | `story_chapters` · `story_stages` (chapter, order, anomaly, category, difficulty, rewards) · `question_categories` (DIMC) · `questions` (category, difficulty, type, prompt, options, answers, status, created_by) |
| **Spirit** | `spirits` (student, name, level, xp, last_fed, mood) · `skills` (name, category, power, unlock_level) · `spirit_skills` (spirit × skill, is_equipped) |
| **Battle** | `battle_rooms` (mode STORY / FRIEND, stage, room_code, status, winner) · `battle_participants` (room, student/spirit, energy, combo) · `battle_turns` (turn, actor, skill, question, answer, is_correct, effect) · `stage_progress` (student × stage, stars, cleared_at) |
| **Economy** | `students` (existing; cell balance) · `reward_mail` · `cell_ledger` · `shop_items` · `student_items` · `student_daily_limits` |
| **Admin** | `game_config` · `question_reports` |

**Removed from v2:** `knowledge_chunks`, pgvector, `curriculum_topics`, `answer_reviews`, `participant_skill_loadouts`, AI score fields.

**Points to show on the DB slides:**
1. **Clearing a stage is one transaction:** save stars → unlock the next stage → add XP (level-up + new skill) → create the reward mail.
2. **Claiming mail is one transaction:** claimed only if not yet claimed → ledger row → balance.
3. **M:N tables:** `spirit_skills`, `student_items`, `stage_progress` (composite keys).
4. **Growth report query:** accuracy per DIMC category per week, from `battle_turns`.

## 12. Scope

**Monday (midterm):** concept + feedback slide · Chapter 1 designed · ERD v3 · mockups · scripts.

**Final:**
| Priority | Items |
|---|---|
| **Must** | Battle engine · story mode with Chapter 1 playable (6 stages + boss) · spirit (level, XP, skills) · mailbox → claim → shop · admin question page · 100–150 questions |
| **Should** | Friend duel with room code · mood colours + feeding · Rico's hint · Void's growth report |
| **Could** | One sample stage of Chapter 2 (to prove "new chapter = new data") · AI batch generation of questions |
| **Not in final** | Chapters 2–5 playable · spirit evolution · real art |

## 13. Plan

**This weekend**

| When | Task | Who |
|---|---|---|
| Fri night | progress_v3 · team briefing v3 · reply to the DORO developer | Claude, Imran |
| Sat | ERD v3 → mockups → slides → scripts + Q&A · rehearsal at night | Claude + Imran (Wam practises after work) |
| Sat (optional) | Check ERD v3 | Akip |
| Mon morning | Full run together, then present | Imran, Wam |

**After the midterm (about 7 weeks)**

| Weeks | Goal | Main people |
|---|---|---|
| 1 | DB tables + seed data (Chapter 1 stages, 50 questions) | Akip, Imran |
| 2–3 | Battle engine + story mode playable | Akip (API), Wafi (screens) |
| 4 | Spirit (XP, level, mood, feeding) + mailbox / shop | Wafi, Akip |
| 5 | Admin page + questions to 100–150 | Akip, Haikal, Asyraf |
| 6 | Friend duel (stretch) + polish + testing | Everyone |
| 7 | Final slides, demo video, rehearsal | Imran, Wam, Haikal |

## 14. Open questions for DORO (send later)
- Does a pet/spirit system already exist in DOROBUS? What data does it keep?
- May we use the webtoon characters' art in the game and in mockups?
