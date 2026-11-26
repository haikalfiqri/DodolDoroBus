# Database docs

Everything about how our PostgreSQL database is designed, and the proof for the presentation.

| File | What it shows |
|---|---|
| `NORMALIZATION.md` | Every table, its keys, and why the design is in 3NF (plus the one place we denormalize on purpose) |
| `INDEXES.md` | Which indexes we added, and before/after `EXPLAIN ANALYZE` timings |
| `VIEWS.md` | The views used by the admin page and reports |
| `../erd/erd_core.png` | ERD of the core tables |

## Where the design lives

- Tables, keys and constraints: `db/migrations/*.sql` (applied in order by `db/migrate.mjs`)
- New change = new numbered file (`005_...sql`). Never edit an old migration.

## Key ideas to explain

1. **Normalization** – each fact is stored once (e.g. species stats live in `species`, not copied into every pet).
2. **Integrity** – primary keys, foreign keys, `CHECK` and partial `UNIQUE` constraints stop bad data at the database.
3. **Transactions** – stage clear, mail claim and hatching are each one transaction, so they can't half-happen or happen twice (`npm run demo:race`).
4. **Indexes for performance** – the queries the game runs most are backed by indexes (see `INDEXES.md`).
