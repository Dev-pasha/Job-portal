# Job Portal

A job board where you post listings and candidates apply by uploading a CV.

- **Public side** — a home page, a searchable job board, job pages, about and contact pages, and privacy, cookie and terms pages, all sharing one footer.
- **Applying** — name, email, optional phone and a CV file. No account needed.
- **Admin side** — sign in, post and edit listings, import them in bulk from a spreadsheet, open or close them, read applications, download CVs, and run ads on the site.
- **249 countries and 162 currencies**, with salaries stored as amounts rather than free text.

**Stack:** Node.js + Express + PostgreSQL on the back end, React + Vite on the front end.
No dependency compiles from source, so `npm install` does not need Visual Studio or build tools.

---

## 1. Get a PostgreSQL database

Pick whichever is easiest for you.

### Option A — hosted, nothing to install (fastest)

Create a free database at [neon.com](https://neon.com) or [supabase.com](https://supabase.com).
Copy the connection string they give you. It looks like:

```
postgresql://user:password@ep-something.aws.neon.tech/neondb
```

Hosted databases require TLS, so set `PGSSL=true` in your `.env`.

### Option B — install Postgres on Windows

Download the installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/).
During setup you choose a password for the `postgres` user — write it down.

Then open **pgAdmin** (it installs alongside) or **SQL Shell (psql)** and create the database:

```sql
CREATE DATABASE jobportal;
```

Your connection string is:

```
postgresql://postgres:YOUR_PASSWORD@localhost:5432/jobportal
```

### Option C — Docker

```bash
docker run --name jobportal-db -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=jobportal -p 5432:5432 -d postgres:16
```

Connection string: `postgresql://postgres:devpass@localhost:5432/jobportal`

---

## 2. Run the app

You need Node.js 18 or newer. Open two terminals.

### API

```bash
cd server
npm install
copy .env.example .env      # Windows. On Mac/Linux: cp .env.example .env
```

Open `server/.env` and set `DATABASE_URL` to your connection string. Then:

```bash
npm run seed                # creates the tables, your admin account, and 3 sample jobs
npm run dev                 # http://localhost:4000
```

`npm run seed` is safe to re-run. It creates tables only if they are missing and resets the admin password to whatever is in `.env`.

### Front end

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173. Sign in at http://localhost:5173/#/admin with the email and password from your `.env`.

---

## Project layout

```
server/
  src/
    index.js              Express app, route mounting, startup
    db.js                 Connection pool, schema, query helpers
    auth.js               JWT signing and the requireAdmin guard
    seed.js               Creates tables, the admin account, sample jobs
    middleware/upload.js  Multer config for CV uploads
    routes/
      auth.js             POST /api/auth/login
      jobs.js             Job CRUD, public listing and search
      applications.js     Apply, review, CV download
  data/uploads/           Uploaded CVs (do not commit)

client/
  src/
    api.js                Every API call in one place
    App.jsx               Routes, masthead, footer
    styles.css            The whole design system
    pages/                JobBoard, JobDetail, AdminLogin, AdminJobs, AdminApplications
    components/           AdminShell (admin layout)
```

## Pages

| Path | Page | Ads |
| --- | --- | --- |
| `/` | Home: hero search, latest roles, how it works, browse by country | yes |
| `/jobs` | The full job board with search and filters | yes |
| `/jobs/:id` | A single role and its apply form | yes |
| `/about` | About the site | yes |
| `/contact` | Contact details and data requests | yes |
| `/privacy` | Privacy policy | no |
| `/cookies` | Cookie policy | no |
| `/terms` | Terms of use | no |
| `/admin/...` | The admin area | no |

The legal pages carry no advertising on purpose. They are what somebody reads
while deciding whether to trust you with their CV, and ad networks generally
prefer legal pages kept clean.

Board filters live in the URL, so `/jobs?country=PK&work_mode=remote` is a real
link you can share, and the footer uses that to link straight to remote roles and
internships.

## Site details

**Admin → Settings** holds your site name, legal company name, contact email,
postal address and the date your legal pages were last updated. These feed the
header, the footer and the legal pages, so you never edit code to change them.

Fill them in before going live. Until you do, the privacy policy and terms have
no responsible party to name and the contact page says so.

## Countries, currencies and salary

A job has a `city` and a `country` code, and its salary is stored as four columns:
`salary_min`, `salary_max`, `salary_currency` and `salary_period` (hour, day, month or year).

Storing amounts rather than a string like "PKR 180k" means the board can format each
salary in its own currency, and gives you something to sort or filter on later.

The country and currency lists come from `GET /api/reference`, which builds them from
Node's own Intl data. That means the spellings stay correct without a hand-maintained
list, and the same list validates input on the server and fills the dropdowns in the
browser, so the two can never disagree.

Leave both amounts empty and the listing shows "Salary on request". Fill only the
minimum and it shows "From X".

## Importing jobs in bulk

**Listings → Import CSV** takes a spreadsheet with one row per job. Download the
template from that screen to get the exact columns:

```
title, company, city, country, work_mode, employment,
salary_min, salary_max, salary_currency, salary_period, description, is_open
```

A few things the importer is deliberately forgiving about:

- **Country** accepts a name or a code, so both `Pakistan` and `PK` work.
- **Amounts** may contain separators, so `180,000` and `180000` are both fine.
- **Empty salary columns** are allowed; the listing then shows "Salary on request".
- Column headings are matched case-insensitively.

By default valid rows are imported and the rest are reported back with their row
number and what was wrong, so you can fix those and re-upload. Tick **cancel the whole
import if any row has a problem** for an all-or-nothing run: the insert happens in a
single transaction, so nothing is written unless every row passes.

Limits are 500 jobs and 2 MB per file.

## Ads

Ads are placed by **slot** (where on a page) plus **page scope** (which pages).

| Slot | Where | Suggested size |
| --- | --- | --- |
| `top` | Above the main content | 728x90 or 320x50 |
| `inline` | Inside the job list | 468x60 or 728x90 |
| `sidebar` | Beside the apply form | 300x250 |
| `bottom` | Below the main content | 728x90 or 300x250 |

Page scope is **every page**, **home page only**, **job board only**, **job
pages only**, or **about and contact only**.

Not every page has every slot, and that is deliberate rather than a limitation.
The board is a single full-width column, so it has no sidebar. A job page has no
list, so it has no inline slot:

| Page | Slots it has |
| --- | --- |
| Home | top, inline, bottom |
| Job board | top, inline, bottom |
| Job page | top, sidebar, bottom |
| About, contact | top, bottom |
| Privacy, cookies, terms | none |

An ad scoped to "every page" still only appears where its slot exists. The admin
form tells you which pages a slot shows on as you pick it.

### How many ads show at once

**Ads → Maximum ads on one page** controls this, from none up to 4. It is stored
in the database, so changing it takes effect immediately with no redeploy.

When more ads are available than the limit allows, slots are filled in this
order: `top`, `sidebar`, `inline`, `bottom`. Slots nearer the top of a page are
worth more, so they win. If several ads compete for the same slot, the highest
**priority** number wins, and ties are broken at random so equal ads share the
slot evenly.

Setting the limit to none is a quick way to turn all advertising off without
deleting anything.

A note on the trade-off: more ads earn more per visit but push applications down,
and heavy ad density tends to lower the rate networks pay you rather than raise
it, because it drags engagement down. Two is the default for that reason.

### The three ad types

**Direct** — one you sold yourself. You enter the headline, an optional
supporting line, an optional banner image, and where it links to. You keep all
the revenue and control exactly what appears next to your listings.

**Banner code from an ad network** — a snippet from a network such as
[Adsterra](https://adsterra.com). You paste the ad unit code and the size (for
example `300x250`), pick a slot, and their servers decide what fills it per
visitor.

**Floating bar or popup** — formats such as Adsterra's Social Bar. These attach
themselves to the page rather than sitting in a container, so they have no slot
and **do not count towards the per-page limit**. They are loaded once per visit
and then left alone, rather than being torn down and re-run on every navigation,
which would stack up copies of the bar as somebody browses. They never appear on
admin pages.

Both types live in the same slots, so you can run a paying sponsor in the top
slot and let a network fill the rest. Give the sponsor a higher priority number
and it wins that slot whenever it is live.

Some deliberate choices:

- Every ad is labelled **Sponsored**, so a visitor can tell it apart from a real
  listing.
- Direct ad links must start with `http://` or `https://`, checked on the server,
  so an ad can never carry a `javascript:` URL into the page.
- Direct ad clicks go through `/api/ads/:id/go`, which counts the click and then
  redirects. The destination URL is never included in the public ads response.
- All of a page's ads are chosen in one request. That is what makes the per-page
  limit enforceable: if each slot asked separately, none could know how many
  others had already been filled.
- An empty slot renders no markup at all, so a page with nothing booked looks
  normal rather than leaving a gap.

### Example: one 300x250 banner and one Social Bar on every page

This is a common starting setup:

1. **Ads → Create an ad**, type *Banner code from an ad network*. Paste your
   300x250 unit code, set size `300x250`, slot *Above the main content*, pages
   *Every page*.
2. **Create an ad** again, type *Floating bar or popup (Social Bar)*. Paste the
   Social Bar code, pages *Every page*.
3. Set **Maximum ads on one page** to `1`.

The banner then shows on both the job board and every job page, and the Social
Bar floats on both as well, because floating ads are exempt from the limit.

Watch the interaction between the limit and your slots. The limit counts *slot*
ads only, and slots fill in the order top, sidebar, inline, bottom. If you put
the 300x250 in the bottom slot while the limit is `1` and something else is
booked in the top slot, the banner will never appear — the top slot wins and the
budget is spent. Either raise the limit or put the banner in the slot you
actually want filled.

### Using Adsterra (or any network)

1. Sign up as a publisher and get your site approved. This needs a **live
   domain** — localhost will not be accepted, and a site with only a handful of
   listings may be rejected for thin content.
2. Create an ad unit per slot you want to fill, and copy its code.
3. In **Ads → Create an ad**, choose *Code from an ad network*, paste the code,
   pick the slot and page scope, and enter the unit size (such as `300x250`) so
   the page reserves space and does not jump while the ad loads.
4. Put your publisher line in `client/public/ads.txt`, which the file explains.
   It ends up at the root of your domain, which is where networks look for it.
5. Add a privacy policy. You already need one for CVs and contact details; a
   third-party network means also disclosing that they set cookies and process
   visitor data.

Two limits worth knowing. **Your click counter does not work for network or
floating ads** —
they render inside a cross-origin iframe, so clicks are only visible in the
network's own dashboard. The admin list says so rather than showing a misleading
zero. And **ad sizes are tied to slots**: a 728x90 leaderboard will not fit a
360px sidebar, so match the unit size to the slot.

On format choice, I would avoid popunders, interstitials and similar formats on
this site. A popunder opening while somebody is filling in an application is
exactly the moment they abandon it, and applications are what your customers are
paying for. Banners and native banners in the four slots are the safe choice.

### Security note on network and floating ads

Both are arbitrary JavaScript that runs in every visitor's browser. Only
an admin can add one, which means your admin password now protects your
visitors as well as your data. Use a strong one, and only paste code from a
network you trust. This will also conflict with a strict Content-Security-Policy
if you add one later.

## Database

Four tables, created automatically by `npm run seed`:

- **admins** — you. Passwords stored as bcrypt hashes, never plain text.
- **jobs** — listings. `work_mode`, `employment` and `status` have `CHECK` constraints, so bad values are rejected by the database and not just by the API.
- **applications** — candidates. `job_id` has `ON DELETE CASCADE`, so deleting a listing removes its applications. A `UNIQUE (job_id, email)` constraint means one application per person per job even if two requests arrive at the same moment.
- **ads** — sponsored slots, with their own impression and click counters.
- **settings** — a small key/value store for things you change without a redeploy, currently the per-page ad limit.

### Upgrading an existing database

`npm run seed` and `npm run dev` both run the migrations, which are written so that
running them twice is harmless. If you already had the earlier version:

- `location` becomes `city`, and a `country` column is added, defaulting to `PK`.
- The free-text `salary` column is **dropped** and replaced by the four salary columns.
  Any salary text you had typed is not converted; re-enter those amounts on the listing.
- Existing rows keep their old `location` text in `city`, so a row that said
  "Lahore, Pakistan" will read "Lahore, Pakistan, Pakistan" until you edit the city
  down to just "Lahore".
- The three fixed ad placements become a slot plus a page scope: `board_top`
  becomes top on the board, `board_inline` becomes inline on the board, and
  `job_sidebar` becomes sidebar on job pages. Existing ads keep working; widen
  them to every page by editing their page scope.

## API

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| GET | `/api/reference` | anyone | Country, currency, work mode and employment lists |
| GET | `/api/site` | anyone | Site name and contact details for the footer and legal pages |
| GET | `/api/jobs` | anyone | Open jobs. Supports `?q=`, `?city=`, `?country=`, `?work_mode=`, `?employment=` |
| GET | `/api/jobs/countries` | anyone | Countries that currently have open roles, with counts |
| GET | `/api/jobs/:id` | anyone | One job |
| GET | `/api/ads/page?page=` | anyone | Every ad for one page, already capped |
| GET | `/api/ads/options` | anyone | Slot, page scope, ad type and size options |
| GET | `/api/ads/overlay` | anyone | The running floating ad, if any |
| POST | `/api/ads/:id/impression` | anyone | Records one view of a floating ad |
| GET | `/api/ads/:id/go` | anyone | Counts a click, then redirects |
| POST | `/api/jobs/:id/apply` | anyone | Apply. `multipart/form-data` with a `cv` file |
| POST | `/api/auth/login` | anyone | Returns a JWT |
| GET | `/api/jobs/all` | admin | Every job with application counts |
| POST / PUT / DELETE | `/api/jobs`, `/api/jobs/:id` | admin | Manage listings |
| GET | `/api/applications` | admin | Applications, filterable by `job_id` and `status` |
| PATCH | `/api/applications/:id` | admin | Set status to new / shortlisted / rejected |
| GET | `/api/applications/:id/cv` | admin | Download a CV |
| DELETE | `/api/applications/:id` | admin | Delete an application and its CV |
| GET | `/api/jobs/bulk/template` | admin | Download the CSV template |
| POST | `/api/jobs/bulk` | admin | Import jobs from a CSV file |
| GET | `/api/ads/all` | admin | Every ad with its stats |
| POST / PUT / DELETE | `/api/ads`, `/api/ads/:id` | admin | Manage ads |
| GET / PUT | `/api/settings` | admin | Read and change site settings |

Search uses `ILIKE`, so it is case-insensitive.

## How uploads are handled

CVs go to `server/data/uploads/`. A few things are deliberate:

- Only PDF, DOC and DOCX are accepted, and files are capped at 5 MB.
- The uploaded filename is thrown away on disk and replaced with a random one. The original name is kept in the database only for the download filename. This stops a candidate naming a file something that confuses the filesystem.
- Uploads are **not** served as static files. The only way to read a CV is `/api/applications/:id/cv`, which requires an admin token, so nobody can guess a URL and pull down someone's CV.
- If a request is rejected after the file has been received, the file is deleted rather than left behind. Deleting a job or an application removes its CVs too.
- CSV imports are parsed in memory and never written to disk at all.

Ad banners are different on purpose. They live in `server/data/ad-images/` and **are**
served publicly at `/ad-images/...`, because a visitor's browser has to load them. CVs
are in `server/data/uploads/`, which is never mounted as a static directory. Keeping the
two in separate folders is what makes it impossible to expose a CV by adding a static
route later.

## About those legal pages

The privacy, cookie and terms pages are written to describe what this
application actually does: the fields it collects, that CVs are stored as
uploaded and never made public, that deleting a listing deletes its applications
and files, and that advertising networks set their own cookies and never receive
your CVs.

They are a **starting point, not legal advice**, and I am not a lawyer. Before
you go live, have someone qualified in your jurisdiction read them, and check in
particular:

- **How long you keep applications.** The policy says "a period afterwards"
  because only you can decide the actual retention period. Replace it with a real
  one and then honour it.
- **Where your users are.** If you get EU or UK traffic, GDPR applies, and an
  advertising network setting cookies normally means you also need a consent
  banner before those scripts run. This app does not ship one.
- **Your legal basis and your regulator.** Both vary by country and neither is
  named in the text.
- **Anything you add later.** Analytics, a newsletter, a chat widget or a second
  ad network all change what the policy has to say.

## Before you put this online

1. **Set a real `JWT_SECRET`.** Anything long and random. If you leave the default, anyone can forge an admin token.
2. **Change the admin password** from the seed default.
3. **Set `CLIENT_ORIGIN`** to your real front-end domain so CORS is not wide open.
4. **Set `PGSSL=true`** if your database is hosted anywhere other than the same machine.
5. **Serve over HTTPS.** Login and CVs both travel over this connection.
6. **Never commit `.env` or `server/data/`.** Both are already in `.gitignore`.
7. **Fill in Admin → Settings**, so the footer and legal pages name a real company and a working contact address.
8. **Have the legal pages reviewed**, as described above.
9. **Back up the database, `server/data/uploads/` and `server/data/ad-images/`.** These are separate: a database backup alone does not include the uploaded files.
10. **Point the front end at your API.** In production the Vite dev proxy is gone, so either serve `client/dist` from the same domain as the API, or change the `fetch` base in `src/api.js` to your API URL.

Build the front end for production with `cd client && npm run build`, which writes static files to `client/dist`.

## Things you may want to add next

- Email the candidate a confirmation, and email you when someone applies (Nodemailer + any SMTP provider).
- Let candidates create accounts so they can see their applications.
- Move CVs to S3 or similar if you expect real volume, so they are not on the app server's disk. This also matters if you deploy somewhere with a temporary filesystem, like Heroku or a default Render service, where uploaded files disappear on restart.
- Full-text search. `ILIKE` is fine for hundreds of jobs; past that, use a `tsvector` column with a GIN index.
