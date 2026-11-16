# Chapter 1 script: 신비한 초대, 사파리

The scene sheet for art and front end. **Dialogue lines live in `content/dialogue/ch1.json`** (edit them there; this file describes scenes, art and mood). The story follows DORO's Act 1 and keeps only the light parts: anomalies, eggs, rescuing animals.

## Onboarding (Day 1)

| Step | Scene | Art needed |
|---|---|---|
| Letter | Dark screen, a sealed letter with Codex's mark opens | Letter card, Codex seal |
| Starter egg | DOROLAND plaza by day; Naty floats beside a Sprout Egg on a small cushion | Plaza background, Naty, Sprout Egg (3 crack stages) |
| Hatch | Egg shakes on each tap; green puff; Dog / Cat / Rabbit appears | Hatch effect, 3 Common baby sprites |
| Name | Pet sits in the middle; name input | — |
| Mood | Pet's collar cycles through 5 colours as Naty explains | Collar overlay in 5 colours |

## Stages

| Stage | Background | Anomaly look (enemy sprite) | Story moment | Mood / music |
|---|---|---|---|---|
| 1 광장의 새싹 | Plaza, fountain | 지지직 노이즈: a TV-static blob with flickering edges (grey) | First anomaly; tutorial | Light, curious |
| 2 흩어진 지도 | Safari gate, windy | 회오리 바람: small whirlwind carrying map pieces (blue) | Map pieces scattered by the storm | Breezy, hurried |
| 3 로봇 키트 | Workshop tent, robot parts | 엉킨 톱니: a ball of jammed gears (amber); an egg glints between the teeth | Building the Doro Car; **first story egg** | Busy, tinkering |
| 4 운전면허 시험 | Driving course with cones | 오작동하는 도로 코스: road tiles that rearrange themselves (green) | Zero's 4-course test; command blocks | Upbeat, test-like |
| 5 고장 난 전광판 | Night, LED billboard | 깜빡이 글리치: scrambled dot-matrix face (purple) | Fix the billboard pixel by pixel | Electronic, tense |
| 6 사라진 동물들 | Empty Safari, mossy shed | 흐릿한 발자국: glowing footprints that fade in and out (teal) | Animals gone; Naty learns Codex hid them as eggs | Quiet, mysterious |
| Boss 사파리 동굴 | Dark cave, cages in the back | 뿔 달린 그림자: horned shadow with one red eye | Free the caged animals; Codex speaks; Battle Room opens | Boss theme, then relief |

## After the boss (cutscene)

1. The shadow fades; cages open; animals run out.
2. A Circuit Egg (Rare) floats down to the player.
3. Codex appears as a voice and light: "약속을 지키는 인간이 아직 있었군. 다음 시험은 하모니아에서 기다리겠다."
4. Naty leads the player to the plaza: the Battle Room door's padlock falls off.
5. Second nest slot appears in My Room.

## Writing rules

- Short lines: max 2 sentences, about 40 Korean characters per line.
- Naty speaks 반말, friendly. Codex speaks in a calm, old "~다 / ~라" tone. Rico, Zero, Xylo speak 반말 like older friends.
- No scary or sad content beyond "the animals are missing". Nobody is hurt.
- Use `{pet}` and `{player}` placeholders, never a fixed name.
- Every new feature is introduced by one line from the character who owns it (Rico = hint, Zero = pet care, Xylo = shop, Void = report).
