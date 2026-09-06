# NORDR Admin setup (non-developer guide)

This guide sets up private access to the NORDR admin workbench at `/admin`.

The public website is unchanged. Only people you deliberately authorise can see System Check leads.

---

## What you will do

1. Turn on email/password sign-in in Supabase  
2. Create your first admin login  
3. Run the admin database migration  
4. Link your login to the `admin_users` table  
5. Add the public anon key to Vercel  
6. Sign in at `/admin/login` and confirm it works  

You do **not** need to write code for these steps.

---

## 1. Enable email/password Auth in Supabase

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. In the left menu, open **Authentication**.
3. Open **Providers** (sometimes under **Sign In / Providers**).
4. Find **Email**.
5. Make sure Email is **Enabled**.
6. Recommended settings for NORDR admin:
   - **Confirm email**: you can leave this on for production, or turn it off temporarily while creating the first account, then turn it back on.
   - Do **not** enable public sign-up on your website. NORDR has no public registration page.
7. Save changes.

Optional but useful:

- Under **Authentication → URL Configuration**, add your site URL, for example `https://nordrperformance.com`.
- You can leave redirect URLs empty for password login (the admin app does not use magic links).

---

## 2. Create the first NORDR admin user

1. Still in Supabase, open **Authentication → Users**.
2. Click **Add user** / **Create user**.
3. Choose **Create new user**.
4. Enter:
   - your work email  
   - a strong password you will remember (or store in a password manager)
5. Prefer **Auto Confirm User** if the option is shown, so you can sign in immediately.
6. Create the user.

This only creates a login. It does **not** yet grant admin access.

---

## 3. Find that user’s UUID

1. In **Authentication → Users**, click the user you just created.
2. Copy the **User UID** (a long ID that looks like `a1b2c3d4-e5f6-...`).
3. Keep it ready for the next step.

---

## 4. Run the admin database migration

1. In Supabase, open **SQL Editor**.
2. Click **New query**.
3. Open this file from the project on your computer:

   `supabase/migrations/004_admin_workbench.sql`

4. Copy the full contents into the SQL Editor.
5. Click **Run**.
6. Confirm it completes without errors.

This creates:

- `admin_users` — who is allowed into admin  
- `consultancy_cases` — internal status, notes, next action, follow-up date, lead source  
- security policies so only authorised admins can read lead data  
- automatic creation of a consultancy case when a System Check is submitted  

---

## 5. Insert your UUID into `admin_users`

1. Open **SQL Editor** again.
2. Run this, replacing the example UUID with **your** User UID:

```sql
insert into public.admin_users (user_id)
values ('PASTE-YOUR-USER-UID-HERE');
```

3. Click **Run**.
4. Confirm it succeeds.

To check it worked:

```sql
select * from public.admin_users;
```

You should see your UUID listed.

---

## 6. Add `SUPABASE_ANON_KEY` in Vercel

The admin login page needs the **anon** (public) key. This is safe to use in the browser. It is **not** the service role key.

1. In Supabase: **Project Settings → API**.
2. Copy:
   - **Project URL** (you may already have this as `SUPABASE_URL`)
   - **anon** / **public** key
3. In Vercel: open the NORDR project → **Settings → Environment Variables**.
4. Add or confirm:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_ANON_KEY` | the anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | already used for System Check submit — keep this secret and server-only |

5. Redeploy the site after saving environment variables (Deployments → … → Redeploy), so the new anon key is available.

Never put the service role key into browser code or into `SUPABASE_ANON_KEY`.

---

## 7. Confirm access

1. Open: `https://nordrperformance.com/admin/login`
2. Sign in with the email and password you created.
3. You should land on `/admin` and see overview metrics.
4. Open **Leads**, then open one submission.
5. Confirm you can see contact details, answers, patterns, and the consultant workspace.
6. Change **Engagement status** or add a note and click **Save workspace**. You should see a “Saved.” message.

If sign-in succeeds but you are bounced back to login with “not authorised”:

- your Auth user exists, but their UUID is not in `admin_users`
- repeat step 5

---

## 8. How to log in later

Use:

`https://nordrperformance.com/admin/login`

There is no public “Create account” page. Only accounts you create in Supabase (and authorise in `admin_users`) can enter.

---

## 9. Revoke admin access later

Removing access is safer than deleting the Auth user immediately.

1. Find the user’s UUID in **Authentication → Users**.
2. In **SQL Editor**, run:

```sql
delete from public.admin_users
where user_id = 'PASTE-USER-UID-HERE';
```

They will no longer pass the admin check, even if they still know their password.

Optional: also disable or delete the Auth user under **Authentication → Users**.

---

## 10. Add another authorised admin safely

1. Create their Auth user in **Authentication → Users** (same as step 2).
2. Copy their UUID.
3. Insert into `admin_users` (same as step 5).
4. Tell them to sign in at `/admin/login`.
5. Do **not** share the service role key with them.
6. Do **not** ask them to self-register on a public page.

---

## Security reminders

- Admin pages are for NORDR internal use only.
- Data access is enforced by Supabase Row Level Security using membership in `admin_users`.
- Anonymous visitors cannot read System Check submissions.
- The browser only receives the anon key; the service role key stays on the server for System Check submission.
- Do not store medical notes or other special-category personal information in internal notes.

---

## If something goes wrong

| Symptom | Likely cause | What to try |
| --- | --- | --- |
| Login page says configuration incomplete | Missing `SUPABASE_ANON_KEY` on Vercel | Add the anon key and redeploy |
| Invalid email or password | Wrong credentials or user not created | Recreate/check user in Auth → Users |
| Account not authorised | UUID missing from `admin_users` | Insert UUID (step 5) |
| Unable to load submissions | Migration not run, or RLS issue | Re-run `004_admin_workbench.sql` |
| Lead detail URL 404 | Deploy missing rewrite | Confirm latest deploy includes `vercel.json` rewrite |

If you need help, note the page URL and the exact on-screen message (do not send passwords or API keys).
