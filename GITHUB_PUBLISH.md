# Publish SearchLift on GitHub

You already have a `searchlift` repository. Use this workflow after copying Core v4 into that existing folder.

## 1. Check secrets first

```bash
git status
```

`.env.local` must NOT appear in staged/untracked files. The included `.gitignore` ignores `.env*` except `.env.example`.

If a real secret was ever committed, removing it from the latest file is not enough — rotate the secret and clean Git history.

## 2. Quality check

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Fix errors before pushing.

## 3. Commit

```bash
git add .
git commit -m "Upgrade SearchLift to actionable SEO Core v4"
git push
```

## 4. Improve the repository page

Repository description:

```text
Actionable SEO growth workspace powered by Google Search Console — opportunities, content decay, experiments and technical checks.
```

Suggested topics:

```text
nextjs typescript react seo google-search-console oauth analytics portfolio
```

## 5. Pin the repository

On your GitHub profile:

`Customize your pins` → select `searchlift`.

## 6. Add screenshots

Create a `docs/screenshots/` directory and add screenshots with **neutral/demo data** if your real sites contain content you do not want recruiters to inspect.

Good screenshots:

- Overview + What should I work on?
- Opportunity detail with Estimated Click Gain
- Content Decay lost-query diagnosis
- Optimization Tracker
- Sites portfolio

Then embed them near the top of README.

## 7. Do not fake authorship knowledge

Before sending the repo to a recruiter, be able to explain:

- frontend vs backend in this project
- `fetch` / async-await
- what OAuth does
- why SearchLift uses a server route for Google
- how Opportunity Score is calculated
- why Estimated Click Gain is only an estimate
- how Content Decay works
- why arbitrary URL fetching creates SSRF risk

Use `docs/INTERVIEW_GUIDE.md` to prepare.
