# MVI Accident Tracker

Web app for a 3-inspector Motor Vehicle Inspection unit to track road accidents
from intake → inspection → final formatted report.

## Design system

Green/white "case file" theme — see `tailwind.config.ts` and `src/app/globals.css`.
- **Forest green** (`#1F6F4A`) + white/sand as the base palette.
- **Fraunces** for headings, **Inter** for UI text, **IBM Plex Mono** for identifiers
  (plate numbers, VT numbers, case codes) so they read like stamped record numbers.
- A dashed "road marking" rule (`.dash-divider`) is the one recurring signature motif,
  used to separate major sections.

## Status

| Build priority | Status |
|---|---|
| 1. Supabase schema + auth + RLS | ✅ done |
| 2. Accident intake form (GPS + photos) | ✅ done |
| 3. Inspection page | 🚧 placeholder — next pass |
| 4. Report form + docx export | 🚧 placeholder — next pass |
| 5. Dashboard / search | ✅ done (first pass) |

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at supabase.com, then copy your project URL and anon
   key into `.env.local` (copy `.env.local.example`).

3. **Apply the schema.** With the Supabase CLI linked to your project:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   This runs both migrations in `supabase/migrations/`:
   - `0001_init.sql` — your original schema (tables, enums, RLS on the main tables, seed pick-list)
   - `0002_rls_and_provisioning.sql` — mirrors RLS onto the child tables the original
     schema left as "mirror this pattern," auto-creates a `profiles` row when an
     inspector is invited, and creates the private `accident-photos` storage bucket.

4. **Invite your 3 inspectors** via the Supabase Auth dashboard (or `supabase.auth.admin.inviteUserByEmail`).
   A `profiles` row is created automatically; each inspector should then fill in their
   credentials/title/station from their profile settings (not yet built — currently
   edit directly in the `profiles` table or Supabase Studio).

5. **Run the dev server**
   ```bash
   npm run dev
   ```

## What's next

- **Inspection page**: VT number entry with the "already in use" friendly warning,
  read-only accident summary.
- **Report form**: tabbed/accordion layout for Tables 1, 2, 3, 8, crash reconstruction,
  and the cause/contributing-factor/recommendation pick-lists. This is the biggest
  remaining piece.
- **.docx export**: needs the reference template (`FATAL_KCK898P.docx`) to build the
  docxtemplater mapping against — share it and this gets wired in directly.
- **Profile settings page** for inspectors to edit their own credentials/title/station.
- **PWA-lite offline caching** for the intake form on weak signal.

## Notes

- `src/types/database.ts` is hand-written to match `mvi_schema.sql`. Once the project
  is linked, regenerate it properly with:
  ```bash
  supabase gen types typescript --project-id <id> > src/types/database.ts
  ```
- RLS currently gives all 3 inspectors full read/write on all case records (shared
  workload, as specified) — the schema comment shows how to tighten to
  `created_by = auth.uid()` later if needed.
