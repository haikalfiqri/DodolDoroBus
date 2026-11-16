# Screens (spec for frontend)

Target: laptop browser, **1280 × 720** (DOROBUS standard). Korean UI text. Ages: upper elementary to middle school.
The clickable prototype in `docs/prototype/codex_trial_prototype.html` shows the look and flow; it still uses the old spirit, so swap the spirit for the partner pet everywhere.

## Flow

```
Minigame tab card
  └─ first time → Onboarding (letter → starter egg → hatch → name → mood)
  └─ returning → Hub
Hub ─┬─ Chapter map ── Stage info card ── Battle ── Result ── (Mailbox)
     ├─ My Room (pets, nest, 도감)
     ├─ Mailbox
     ├─ Shop (Xylo)
     ├─ Quests
     └─ Battle Room (locked until Ch 1 boss) ── Weekly Trial / Ghost challenge
Admin (separate login) ── Questions: draft → approve / edit / reject
```

## Screen list

| # | Screen | Shows | Actions | Data needed |
|---|---|---|---|---|
| 1 | Minigame tab card | Title, partner pet (sprite + mood), chapter progress "1장 3 / 7", first-clear-of-day badge | 시작하기 / 이어하기 | player summary |
| 2 | Onboarding | Codex letter → Naty + starter egg (tap 3×) → hatch animation → name input (max 8) → mood explanation | Next, tap egg, confirm name | `dialogue/ch1.json` onboarding |
| 3 | Hub | Partner pet, cells, mail count (red dot), quest progress, buttons to each area | Go to map / room / mail / shop / quests / Battle Room | player summary |
| 4 | Chapter map | 7 nodes on a path; each: locked / open / stars; egg icon on egg stages; boss pity meter "37 / 50" | Tap node → stage card | chapter + stage progress |
| 5 | Stage info card | Name, anomaly, gauge, categories, rounds, best stars, **egg drop rates** (egg stages), first-clear reward | 출전 (choose partner), back | stage, drop rates, record |
| 6 | Battle | Top: round, timer, sound, report 🚩, exit. Scene: anomaly + gauge vs partner + energy + combo. Bottom: 4 skill buttons → question panel (by mission type) | Pick skill, answer, use Rico's hint | battle session |
| 7 | Result | Win/lose, stars, XP bar (+level-up, new form, new skill), cells, egg obtained (with rarity colour), next stage unlocked | Claim in mailbox, retry, map | clear result |
| 8 | My Room | Pets wandering; nest(s) with warmth bars; tap pet → card (level, form, skills, mood, passive); 도감 15 slots (owned = art, not owned = grey egg silhouette); decorations | Set partner, feed (5 cells), hatch egg, place decorations | pets, eggs, items |
| 9 | Hatch | Egg wobbles → rarity-coloured effect → pet reveal (or "snack pack" if duplicate) → name | Name pet, set as partner | hatch result |
| 10 | Mailbox | Reward mail list, claimed / unclaimed | 받기 (claim one / all) | mail |
| 11 | Shop (Xylo) | Items by tab: food, room, accessories, battle backgrounds. **No eggs** | Buy | items, balance |
| 12 | Quests | 3 daily quests with progress, weekly stamp card (x / 5), achievements | Claim | quests |
| 13 | Battle Room | Locked: padlock + "1장 보스를 깨면 열려요". Open: Weekly Trial card, friend list with best records, friend code | Start trial, start ghost challenge, add friend | trial, friends, records |
| 14 | Weekly report (Void) | Accuracy per DIMC category this week vs last week | — | report |
| 15 | Admin: questions | Filter by category / difficulty / type / status; edit form with payload by mission type; approve / reject; reports | Create, edit, approve, reject | questions |

## Question panels by mission type

| Type | Panel |
|---|---|
| `choice4` | 4 buttons (shuffled) |
| `ox` | Two big buttons O / X |
| `order`, `command_order` | Cards to drag (or tap in order) into slots; "다시" resets |
| `keyword` | Text input + submit (Korean IME friendly) |
| `pixel_art` | Grid (5×5 to 8×8) with palette; target picture shown small |
| `puzzle` | Sequence with "?" + choices |

Every panel shows the timer, the mission category tag, and after answering a one-line explanation (`questions.explanation`).

## Visual rules

- Rarity colours: Common #7BC67E · Uncommon #4FC3F7 · Rare #3D5AFE · Epic #FFB300 · Mythic #9C27B0 → teal. Used on egg, pet card frame and Lv 10 aura.
- Mood colours (collar): calm sky blue · curious green · tense yellow · sad purple · harmony white. **Red only for anomalies.**
- Egg art: see `docs/egg_pet_system_v4.md` (each egg must be recognisable as a grey silhouette in the 도감).
- Safety: nicknames only, no free chat (emoji reactions only), report button on every question, Naty's "take a break" message at the daily limit.

## Must / Should for the final

- **Must:** 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15 and the Battle Room lock state of 13.
- **Should:** 12, 13 (Weekly Trial, ghost challenge), 14.
