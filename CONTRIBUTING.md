# Contributing

Short rules so six people can work in one repo without breaking each other's work.

## Branches

Never commit straight to `main`. Make a branch from the latest `main`:

```bash
git checkout main
git pull
git checkout -b feature/battle-engine
```

Branch names:

| Prefix | Use |
|---|---|
| `feature/` | New thing, e.g. `feature/pet-xp` |
| `fix/` | Bug fix, e.g. `fix/mailbox-double-claim` |
| `docs/` | Documentation only, e.g. `docs/erd-v3` |
| `questions/` | Question sets, e.g. `questions/ai-easy-batch1` |
| `content/` | Game data changes, e.g. `content/ch1-dialogue` |

## Commits

Small and often, with a clear message in the present tense:

```
Add stage_progress table
Fix combo reset after a wrong answer
Update README with run instructions
```

## Pull requests

1. Push your branch: `git push -u origin feature/battle-engine`
2. Open a Pull Request into `main` on GitHub.
3. Say what you changed and how to test it.
4. At least one teammate reviews and approves before merging.
5. Delete the branch after merging.

Before you start new work, pull the latest `main` again.

## Who owns what

| Folder | Main owner |
|---|---|
| `db/`, `server/` (game logic, transactions) | Akip |
| `src/screens/` (map, battle, result, mailbox, shop) | Wafi |
| `public/art/`, `tools/`, `src/screens/room.ts` (pets, eggs, My Room) | Wam |
| `src/screens/admin.ts`, admin routes, `docs/`, deployment | Haikal |
| `questions/`, `content/` | Asyraf (questions), Imran (story) |

Ask the owner before making big changes in their folder.

## Never commit

- `.env` files, API keys, passwords, DB credentials (use `.env.example` instead)
- `node_modules/`, build output, virtual environments
- Large binaries (slides, videos, big PDFs). Keep those in the shared drive.

## Before you open a pull request

```bash
npm run typecheck     # no TypeScript errors
npm test              # the end-to-end playtest passes (needs the API running: npm run dev:api)
```

Database changes go in a **new** file `db/migrations/00N_what_it_does.sql`. Never edit a migration that is already on `main`.

## Questions format

Questions go in `questions/questions.json` (see `questions/README.md`). They can also be added in the admin page.
