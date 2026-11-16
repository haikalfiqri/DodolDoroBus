# Questions

Question sets before they are imported into the database.

- Target: 100–150 for the final, about 200 for launch.
- Categories (DIMC): `digital`, `ai`, `making`, `computing`
- Difficulty: `easy`, `normal`, `hard`
- Types: `choice4` (4 choices), `ox`, `order`, `keyword`; v4 adds `command_order`, `pixel_art`, `puzzle` (see `content/mission_types.json` for their payload format; put the JSON in an extra `payload` column)
- Questions are **not tied to any class**. They are the same for every student.
- New questions start as `draft`. Only the admin sets `approved`.

Use `TEMPLATE.csv` as the starting point. One file per batch, e.g. `ai-easy-batch1.csv`.

For `order` questions, list the correct order in `answer` separated by `|`.
For `keyword` questions, list all accepted answers in `answer` separated by `|`.
