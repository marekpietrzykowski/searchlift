# Upgrade your existing SearchLift to Core v4

Your working OAuth configuration is in `.env.local`. **Do not delete or overwrite it.**

## Safe upgrade

1. Stop the dev server with `Ctrl + C`.
2. Make a backup commit in the existing repository:

```bash
git add .
git commit -m "Save working SearchLift before Core v4"
git push
```

3. Extract the v4 ZIP to a temporary folder.
4. Copy the contents of the extracted `searchlift-core-v4` folder into your existing SearchLift repository.
5. When Windows asks, allow files to be replaced.
6. Do **not** copy/remove `.env.local`; the ZIP intentionally does not contain one.
7. Run:

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

8. Test:

- Connect / existing Google session
- switch GSC property
- Overview
- Sites
- Opportunities
- Content Decay detail / lost queries
- Technical check on a live page
- Optimization Tracker → `Optimized now` → Measure

9. Commit the upgrade:

```bash
git add .
git commit -m "Upgrade SearchLift to actionable SEO Core v4"
git push
```

## Important

`.env.local` is ignored by Git. Verify before pushing:

```bash
git status
```

You should never see `.env.local` staged for commit.
