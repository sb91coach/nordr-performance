# NORDR System Check — Backend Setup Guide

This guide explains how to connect the live NORDR website to Supabase so System Check submissions are stored securely.

You do **not** need to redesign the website. You only need to:

1. Create a Supabase project
2. Run one SQL script
3. Copy two secret values into Vercel
4. Redeploy / wait for Vercel to pick up the latest code

---

## What this backend does

When someone completes the System Check:

1. They answer the questions in the browser
2. They enter lead details (name, work email, organisation, etc.)
3. The website sends the answers to a **server-side** Vercel endpoint:
   - `POST /api/system-check/submit`
4. The server validates the data, recalculates the NORDR results, and stores everything in Supabase
5. The participant then sees their System Snapshot

Important:

- The public browser never receives the Supabase **service role** key
- Database writes happen only on the server
- Marketing consent is optional and separate from completing the System Check

---

## 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **New project**
3. Choose your organisation
4. Set:
   - **Name**: for example `nordr-performance`
   - **Database password**: create a strong password and store it somewhere safe
   - **Region**: choose a region close to your audience (for example London / EU if serving UK)
5. Click **Create new project**
6. Wait until the project is ready

You will **not** put the database password into the website code.

---

## 2. Run the SQL migration

1. In Supabase, open your project
2. In the left sidebar, click **SQL**
3. Click **New query**
4. Open this file from the NORDR repository:

   `supabase/migrations/002_create_nordr_system_check.sql`

   If this is a brand-new Supabase project and you have never run any NORDR SQL, you can run `001_system_check_schema.sql` first, then `002`, or run `002` alone (it creates tables with `IF NOT EXISTS`).

5. Copy the entire contents of that file
6. Paste it into the Supabase SQL editor
7. Click **Run**
8. Confirm it completed without errors
9. Optional: run `supabase/test/verify_schema.sql` to confirm tables, RLS, indexes and functions

### What this creates

Tables:

- `contacts`
- `system_check_submissions`
- `system_check_responses`
- `system_check_patterns`
- `system_check_priority_questions`

Also:

- Useful indexes
- Row Level Security enabled
- An atomic function: `create_system_check_submission(payload jsonb)`
  (compatibility alias: `submit_system_check`)

Apply migrations in order:

1. `supabase/migrations/001_system_check_schema.sql` (if not already applied)
2. `supabase/migrations/002_create_nordr_system_check.sql` (constraints, updated_at, canonical function)

If you already ran migration 001, you only need to run **002**.

---

## 3. Find the values you need in Supabase

In Supabase:

1. Open **Project Settings** (gear icon)
2. Open **API**

You need:

### A. Project URL

Look for **Project URL**

Example format only:

`https://YOUR_PROJECT_REF.supabase.co`

Copy this into Vercel as:

`SUPABASE_URL`

### B. Service role key

Look for **Project API keys**

Find:

- `service_role`  
  labelled as **secret**

Copy this into Vercel as:

`SUPABASE_SERVICE_ROLE_KEY`

### Critical warning

- Never put the `service_role` key into frontend JavaScript
- Never commit it to GitHub
- Never paste it into chat publicly
- Never use the `anon` key for this submission endpoint

The `service_role` key can bypass Row Level Security. It must stay server-side only.

---

## 4. Add the environment variables in Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Open the NORDR project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

| Name | Value | Environments |
|---|---|---|
| `SUPABASE_URL` | your Supabase Project URL | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role key | Production, Preview, Development |

Optional later:

| Name | Value |
|---|---|
| `ALLOWED_ORIGINS` | comma-separated list of allowed browser origins |

5. Save the variables
6. Redeploy the project so the new variables are available

### How to redeploy

In Vercel:

- Open **Deployments**
- Open the latest deployment
- Use **Redeploy**

Or push a new commit to `main`.

---

## 5. Confirm the code is deployed

The repository should already include:

- `api/system-check/submit.js`
- `lib/system-check-engine.js`
- `supabase/migrations/001_system_check_schema.sql`
- `.env.example`
- `.gitignore`

After deployment, this endpoint should exist:

`https://nordrperformance.com/api/system-check/submit`

It should reject GET requests and accept POST requests with a valid payload.

---

## 6. Test a submission on the live site

1. Open `https://nordrperformance.com/system-check/`
2. Complete the System Check
3. Enter lead details
4. Leave the optional marketing box unticked unless you want to test consent
5. Submit
6. Confirm you see **Your NORDR System Snapshot**

If something fails, you should see a restrained message and a **Try again** option. Your answers should remain saved in the browser.

---

## 7. Verify the submission inside Supabase

1. Open Supabase
2. Go to **Table Editor**
3. Check:

### `contacts`

You should see:

- first name
- last name
- work email
- organisation
- role
- sector
- marketing consent
- privacy notice version

### `system_check_submissions`

You should see one new row linked to that contact, including statuses and confidence values.

### `system_check_responses`

You should see 13 rows for that submission:

- 12 scored questions
- 1 contextual free-text response (`CTX-01`)

### `system_check_patterns`

Any detected patterns for that submission.

### `system_check_priority_questions`

Exactly three questions for that submission.

### Returning contact test

Submit again using the **same work email**.

Expected result:

- one contact row
- two separate submission rows

Historical submissions must remain.

---

## 8. Local developer test (optional)

If you are comfortable with a terminal:

```bash
cd /path/to/nordr-performance
npm install
npm test
```

This runs the deterministic methodology and validation tests.

It does **not** require Supabase credentials.

---

## 9. Troubleshooting

### “We couldn't securely record your System Check just now…”

Likely causes:

1. Vercel is missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`
2. The SQL migration was not run
3. The `submit_system_check` function was not created
4. The wrong key was used (`anon` instead of `service_role`)
5. Vercel was not redeployed after adding environment variables

What to do:

1. Recheck Vercel environment variables
2. Redeploy
3. Re-run the SQL file in Supabase
4. Try again on the website

### Submission works but nothing appears in Supabase

- Confirm you are looking at the correct Supabase project
- Confirm the Vercel project is pointing at that same project URL
- Refresh the Table Editor

### Marketing consent looks wrong

- Completing the System Check alone must **not** set marketing consent
- Only the optional checkbox should do that
- Consent timestamp is set when marketing consent becomes true

### Need to rotate a leaked key

If a service role key is ever exposed:

1. In Supabase, rotate / regenerate API keys
2. Update the new `SUPABASE_SERVICE_ROLE_KEY` in Vercel
3. Redeploy immediately

---

## 10. What you personally need to do

You need to do these steps manually because they require your private credentials:

1. Create the Supabase project
2. Run `supabase/migrations/001_system_check_schema.sql`
3. Copy:
   - Project URL → `SUPABASE_URL`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Paste both into Vercel Environment Variables
5. Redeploy Vercel
6. Complete one live System Check and confirm the rows appear in Supabase

The AI assistant / repository cannot invent or safely store those secrets for you.

---

## Privacy notice version

Current privacy notice version stored with submissions:

`2026-09-v1`

Current System Check version:

`system-check-v1`
