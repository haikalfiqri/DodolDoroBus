# Chapters 2–5 outline

Roadmap only: these chapters are **not in the final build**. Each will be added as data (6 stages + boss in `content/stages.json`, lines in `content/dialogue/chN.json`); questions come from the shared pool. Chapter names are DORO's official ones. Egg odds per chapter: `docs/player_journey.md`.

| Ch | Name | Place | Problem Codex sets | Featured mission | Boss idea | First-clear eggs (S3 · S6 · Boss) |
|---|---|---|---|---|---|---|
| 2 | 멈춰버린 기계의 노래 | Harmonia | The park's music machine stopped; its parts play out of order | Command ordering (rhythm if time remains) | 녹슨 오르골 거인 (Rusty Music-Box Giant) | Uncommon · Rare · Epic |
| 3 | 잊혀진 시간 속으로 | Carousel | The carousel spins memories out of sequence | Pattern and sequence puzzles | 시간을 삼킨 시계 (Clock That Swallowed Time) | Rare · Rare · Epic |
| 4 | 구름을 넘어 진실 속으로 | Ferris wheel | From the top, the park's hidden picture is broken into clouds | Pixel art | 구름 가면 (Cloud Mask) | Rare · Rare · Epic |
| 5 | 코덱스의 선택 | Codex's sanctuary | Codex's final trial: did the recruits keep their promise to nature? | All types mixed | 코덱스의 그림자 시험 (Codex's Shadow Trial) | Rare · Epic · Epic |

## Story arc in one line per chapter

1. **Safari:** recruits learn that anomalies hold eggs and free the animals.
2. **Harmonia:** recruits learn that order matters, step by step (computing).
3. **Carousel:** recruits learn to find patterns in what looks random (AI).
4. **Ferris wheel:** recruits learn to build a picture from small parts (digital, making).
5. **Codex's choice:** everything together; Codex entrusts his three guardian eggs to recruits who keep coming back.

## Template for a new chapter (for the admin)

1. Add 7 rows to `stages.json` (`cNs1` … `cNs7`, egg slots on 3, 6, 7).
2. Add `dialogue/chN.json` with intro / win / lose per stage.
3. Add enemy sprites `anomaly_cNsX.png`, `boss_*.png` and one background per stage.
4. Check `chapters.json` (status `playable`) and `egg_drop_rates.csv` rows for chapter N.
No new code and no new questions are needed.
