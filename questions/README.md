# Questions

The question bank is `questions.json`. `npm run db:setup` (and every deploy) inserts questions whose `id` is new;
questions already in the database are never overwritten, so edits made in the admin page are kept.

- Categories (DIMC): `digital`, `ai`, `making`, `computing`
- Difficulty: `easy`, `normal`, `hard`
- Questions are **not tied to any class**. They are the same for every student, written for upper-elementary students.
- Use a new id (for example the next free `q…` number). Set `"status": "draft"` if the admin should check it first.

| type | payload | answer |
|---|---|---|
| `choice4` | `{"choices": ["correct", "wrong", "wrong", "wrong"]}` | index of the correct choice (`0`); choices are shuffled in the game |
| `ox` | `null` | `"O"` or `"X"` |
| `order` / `command_order` | `{"items": ["step 1", "step 2", "step 3", "step 4"]}` (correct order) | `null` |
| `keyword` | `null` | list of accepted answers, e.g. `["센서"]` |
| `pixel_art` | `{"target": ["00100", "01110", "11111", "01110", "00100"]}` (square) | `null` |
| `puzzle` | `{"seq": [2, 4, 6, "?"], "choices": [8, 7, 10, 12]}` | index of the correct choice |

Every question also has `"ex"`: the explanation shown after answering. See `TEMPLATE.json`.
