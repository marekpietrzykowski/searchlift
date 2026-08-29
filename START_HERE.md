# START HERE — Marek

You currently have two relevant local folders from earlier work:

- the GitHub repo: `C:\Users\Marek\Desktop\searchlift`
- the working Google-connected copy was previously run from: `C:\Users\Marek\Desktop\searchlift-pro\searchlift-pro`

The goal is to end with **one canonical project**: the `searchlift` Git repository.

## Recommended path

1. In the working Google-connected folder, locate `.env.local`.
2. Copy `.env.local` somewhere safe temporarily.
3. In `C:\Users\Marek\Desktop\searchlift` run:

```bash
git status
git add .
git commit -m "Save current SearchLift before Core v4"
git push
```

4. Copy all files from this extracted `searchlift-core-v4` folder into:

```text
C:\Users\Marek\Desktop\searchlift
```

5. Put the saved `.env.local` into that same folder, next to `package.json`.
6. Run:

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

7. Test live GSC.
8. Push:

```bash
git add .
git status
git commit -m "Upgrade SearchLift to actionable SEO Core v4"
git push
```

Do not stage `.env.local`.
