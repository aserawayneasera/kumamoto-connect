# KumaConnect 2.0

English/Japanese local activity app for Kumamoto tourists, students, residents and Japanese locals. Browse without an account. The complete source includes UI, API routes, database migrations, official imports, OpenAI/Claude integrations, agents, review tools and tests.

## First use

1. Browse activities at the published Site.
2. Open **Ask Kuma** to describe an activity. With a configured API key, choose OpenAI or Claude. Without a key, the interface clearly identifies its catalogue helper and supports basic date, fee and welcome filters.
3. Open **Reviewer access**, sign in with your authorized ChatGPT account, then select **Imports & AI**. Run **Check sources now**, inspect results and approve any drafts.
4. Configure the preferred provider, model, automatic publication of tested entries and daily provider-call limit. The default limit is 100 calls per Japan-time day. A planning/explanation request usually uses two calls; extraction/verification also uses two.
5. Check **Reports** for activity issues. Public reports never remove events automatically.

## What imports automatically

The approved source registry is `lib/sources.ts`. The initial source is KIF's exact official domain. RSS, the activity list and current/next-month calendars discover article links. Previously listed future activities are also checked, so feed omission does not prevent change detection.

- Tested adapters for KIF international cafés and Kids cafés read explicit event dates, start/end times, fees, venues and booking links. These entries publish automatically when **autoPublish** is enabled.
- Other activity pages and Japanese-class PDF schedules use an extraction agent and a separate verification agent after you configure AI. They remain drafts for human approval. Missing data never becomes invented dates, fees or welcome flags.
- Incomplete or conflicting pages appear in the source-attention queue. A non-event news item or past activity report is skipped.
- Public submissions always remain pending. Entering “KIF” in a public form never grants official status.
- Each run checks up to 12 article pages and processes up to two AI documents. Larger backlogs rotate through subsequent runs. Discovery and individual source errors are recorded.
- Maximum fetched HTML is 1 MB; a selected calendar PDF is limited to 2 MB. HTML activity pages are used directly when sufficient. Source hosts are pinned, redirects are rejected and caller-supplied URLs are never fetched by the public assistant.
- A page fingerprint avoids repeated AI calls for unchanged processed sources. Duplicate sessions are matched using source URL and start time. Rescheduled sessions from tested adapters replace their prior imported session.
- Full sessions remain visible with a clear availability label and are excluded from assistant recommendations. Explicit cancellations archive their sessions. Fetch errors preserve existing listings.
- Changed uncertain pages send managed entries back to review. Approving an unchanged official draft preserves import tracking. Editing imported details pauses automatic overwrites for that listing. Archives and rejections survive later imports.

This is source-by-source automation, not universal website scraping. Add new organizations to the approved registry only after testing their feed, URL patterns, booking domains and extraction behavior. A reliable API or calendar feed is preferable where available. No claim of KIF endorsement is made.

## The agents

| Agent | Purpose | Boundaries |
|---|---|---|
| Source discovery | Find approved official article links and revisit existing pages | Exact approved host and bounded paths; does not fetch public submissions |
| Extraction | Read official text/PDFs and prepare bilingual dated sessions | Unknown stays unknown; no inferred recurring dates; no publication |
| Verification | Compare extracted candidates with source evidence | Flags uncertainty; no safety certification or publication |
| Activity planning | Convert a visitor's request into supported catalogue filters | Searches published, future listings only |
| Activity guide | Explain matching activities in English/Japanese | Uses validated result IDs; no bookings, payments or messages |

Source discovery and tested adapters use deterministic code. Extraction, verification, planning and explanations use the selected API provider. These are bounded application agents, not an unrestricted autonomous computer operator. Model output is validated before use. System prompts treat source text, listings and user messages as untrusted data. A verifier model does not replace manual fraud review.

## OpenAI or Claude setup

Configure one provider or both. Keys stay in server runtime secrets. Never put a key in a `NEXT_PUBLIC_*` setting, JavaScript served to visitors, an activity form or a committed file.

For this Sites-hosted app:

1. Connect the **OpenAI Developers** plugin if you want ChatGPT to help create/configure an OpenAI API key. Follow its API-key workflow and approval requirements.
2. Set `OPENAI_API_KEY` as a Site secret, or set `ANTHROPIC_API_KEY` as a Site secret for Claude. API billing is separate from a ChatGPT/Claude subscription.
3. Redeploy the saved app version to apply the changed runtime environment.
4. Open **Reviewer access → Imports & AI**. The configured provider displays **Connected**. Select the provider and save settings.
5. Test **Ask Kuma** with a simple request, then run an official import and inspect agent drafts.

Default models are `gpt-4.1-mini` and `claude-haiku-4-5`. They are editable in the reviewer panel. Optional `OPENAI_MODEL` or `CLAUDE_MODEL` runtime settings override the panel's model setting. Availability and billing depend on your API account. Changing models requires rechecking structured output and document support.

The implementation uses native HTTPS requests, OpenAI Responses with `store:false` and `text.format`, and Anthropic Messages with `output_config.format`. No API SDK package is required. Provider errors, malformed responses, output truncation and quotas produce recoverable states. It never silently switches to another paid provider.

Official API references checked during development:

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/models/gpt-4.1-mini
- https://platform.claude.com/docs/en/api/messages/create
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs

## Background imports while the app is closed

The import engine is ready. A successful deployment alone does not activate a recurring schedule. Browser polling only refreshes the displayed catalogue.

The supported Sites updater is `POST /mcp`, with discovery and protected tools:

- `check_import_status`: read-only status.
- `refresh_official_activities`: import approved sources when due, at most once per six hours.

Both data-bearing calls require the same server-side reviewer allowlist as the dashboard. The Site declares the `mcp` capability. Install/connect the KumaConnect plugin provisioned by Sites using your reviewer account. Verify a harmless status call, then run one import through the connected tool and read back the result. Only after those checks should a Sites-linked schedule be created.

Recommended cadence: 00:00, 06:00, 12:00 and 18:00 Asia/Tokyo. The schedule's prompt should say: “Refresh KumaConnect activities from its approved official sources using refresh_official_activities. Read check_import_status after the run. Preserve community submissions and manual review decisions. Report source failures or entries requiring review.” Credentials never belong in the prompt.

If the connection is unavailable, **Check sources now** works for the reviewer, but unattended updates are not active. Do not label the app's schedule as enabled until verified and created.

`build/sites-worker.ts` also exports a Cloudflare `scheduled` handler calling the same import engine. A host supporting Cron Triggers must register `0 */6 * * *` separately. Sites does not acquire a Cron Trigger merely because the handler exists. This source uses Sites-provided ChatGPT authentication; another host requires an equivalent verified authentication boundary before exposing review/MCP routes.

## Public submissions and safety

Anyone submits without an account. A required name/email, consent, a bot-trap field, five submissions/IP/hour, bounded inputs, safe HTTPS URL validation and same-origin checks reduce basic abuse. Email syntax validation is not email ownership or organizer verification. No CAPTCHA or automated fraud guarantee is included.

Before approving a community listing, independently verify the organizer, venue, registration destination and any payment request. AI never approves a public submission. Contact details and review notes stay out of public APIs, assistant context and UI. A report button sends issues privately to reviewers. KumaConnect does not process bookings or payments.

## Local development, start to finish

Requires Node.js 22.13+ and the package manager version in `package.json`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
cp .env.example .dev.vars
```

Edit both ignored environment files. Set `SITE_ORIGIN` to the development origin. On a normal portable local checkout, set `REVIEWER_EMAILS=seedy@sites.test` for the starter's local sign-in simulation. Hosted review access uses your actual ChatGPT email. Add an API key locally only if you want real provider calls.

Build and apply every schema migration to the local D1 database:

```sh
pnpm build
for migration in drizzle/*.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$migration"
done
pnpm dev
```

Use the framework's printed development URL. Portable mode normally uses port 5173. The managed development profile uses the environment's supervised preview. The profile file is ignored and the packaged source defaults to portable mode outside the managed environment.

To change the schema:

```sh
pnpm db:generate
```

Inspect and append migrations. Applied SQL and matching Drizzle metadata are immutable. Migrations contain schema only; initial content is inserted idempotently as runtime data. Existing edits and archives are preserved.

## Sites hosting

The existing `.openai/hosting.json` identifies this KumaConnect Site, logical D1 binding `DB`, and MCP capability. Preserve the project identity when updating this Site. Register a separate project identity for a separate Site. Source push, build archive, version saving and publication use the Sites workflow. Runtime configuration and actual D1 resources belong to Sites.

The starter's browser sign-in routes are dispatch-owned. Reviewer APIs always recheck the server allowlist. Do not replace authorization with a browser-only check or trust identity headers outside the intended Sites dispatcher.

## Verification

```sh
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/domain.test.mjs tests/imports.test.mjs
pnpm build
node tests/integration.mjs
node tests/v2-integration.mjs
```

Checks cover source/date parsing, strict filters, full/cancelled sessions, duplicate imports, private contact exclusion, review authorization, manual corrections, source failures, reports, MCP authorization, both provider wire formats, extraction/verification drafts and assistant result-ID validation. Integration tests use isolated D1 databases and mocked provider responses, so no real keys or payments are required.

Production source pages were also checked against current KIF HTML. Live paid-provider calls need a supplied key and were not exercised without one. Browser interaction QA requires the compatible browser-control capability; automated API/SSR checks do not replace that visual check.

## Key source files

- `app/`: browse, details, bilingual assistant, submissions, reports and review UI.
- `app/api/`: listings, calendars, submissions, assistant, imports and reports.
- `app/mcp/route.ts`: protected remote updater.
- `lib/imports.ts`: import orchestration, locks, fingerprints and persistence.
- `lib/import-parsers.ts`: tested deterministic KIF adapters.
- `lib/import-agents.ts`: AI extraction and independent verification.
- `lib/assistant.ts`: planning, catalogue search and grounded explanations.
- `lib/ai.ts`: OpenAI/Claude HTTPS clients and structured responses.
- `lib/settings.ts`: provider settings and usage budgets.
- `lib/sources.ts`: approved official sources.
- `lib/auth.ts`: server-side reviewer and origin checks.
- `db/schema.ts`, `drizzle/`: database schema and migrations.
- `tests/`: parser, original workflow and v2 integration checks.

## Initial sources

Initial research on 2 October 2026. Canada evening availability and the Kids café booking link were rechecked on 3 October 2026:

- [KIF October Japanese-class calendar](https://www.kumamoto-if.or.jp/kiji0033924/index.html)
- [KIF class guide and venue/fee information](https://www.kumamoto-if.or.jp/kiji0031455/index.html)
- [Canada café, Japanese and English sessions](https://www.kumamoto-if.or.jp/kiji0033865/index.html)
- [Kids' café](https://www.kumamoto-if.or.jp/kiji0033874/index.html)
- [Hotto Salon](https://www.kumamoto-if.or.jp/kiji0032944/index.html)

The initial dataset contains 16 language-class sessions, 2 Canada café sessions, 1 Kids' café session and 1 Hotto Salon session. The calendar confirms each listed October date; the guide supplies regular class times, venues and fees. Canada evening booking requires confirmation with KIF if the evening option is absent from the registration form. English/solo/beginner support is left unknown unless the source states the condition.

The Japan culture experience was excluded because its source page presents conflicting dates. No fictional activities, organizers or attendance counts are displayed.

## Image credit

Kumamoto Castle photograph by [Suicasmo / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Kumamoto_Castle_Keep_Tower_20230103.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The interface displays a cropped view; the underlying image keeps its original license. KumaConnect is independent of KIF and Kumamoto City.
