# BrandTruth AI

Catch brand mistakes before a poster goes live.

BrandTruth AI is a small governance tool for a fictional cafe, Chai Tapri Co. A manager keeps approved facts and rules. A creator checks copy against those facts. A reviewer decides whether the poster can ship, including the awkward case where the creator ignored a finding.

## Live demo

Anyone with the site link can try it. No sign-up.

Demo accounts are printed on the home page:

| Role | Name | Username | Password |
|---|---|---|---|
| Manager | Meera | `meera` | `chai-tapri` |
| Creator | Rahul | `rahul` | `chai-tapri` |
| Reviewer | Priya | `priya` | `chai-tapri` |

One-click buttons log you in as each person. A private demo button builds a fresh workspace if you do not want to share the sample history.

## What each role does

- **Creator:** pick a sample poster or paste text, run the checker, accept or ignore each finding, submit to the queue.
- **Reviewer:** open waiting posters, read ignored findings, request changes, or approve anyway after ticking the confirmation box.
- **Manager:** edit facts (try F-04 for the festival date or F-01 for the snack discount), watch ProofMesh flag linked assets, then re-verify. Insights only count real decisions. The healthy snack sample uses F-01, R-13 and R-14 — those records appear in the Brand Library, ProofMesh and Insights, not only on the Creator check screen.

## Run locally

```bash
cd backend
npm install
npm run dev

cd frontend
npm install
npm run dev
```

Optional environment variables:

- `GEMINI_API_KEY` — image text extraction and extra AI notes
- `MONGODB_URI` — persistent store; without it the server uses memory

Exact date and discount checks still run if Gemini is missing.

## Tests

```bash
cd backend
npm test
```

From the repo root: `npm test`.
