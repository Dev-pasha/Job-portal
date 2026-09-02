import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, query, queryOne, initDb } from './db.js';

const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'changeme123';

await initDb();

const hash = bcrypt.hashSync(password, 10);

await query(
  `INSERT INTO admins (email, password_hash) VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [email, hash]
);
console.log(`Admin account ready: ${email}`);

const { count } = await queryOne('SELECT COUNT(*)::int AS count FROM jobs');

if (count === 0) {
  const insert = (...values) =>
    query(
      `INSERT INTO jobs (title, company, city, country, work_mode, employment,
                         salary_min, salary_max, salary_currency, salary_period, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      values
    );

  await insert(
    'Frontend Developer',
    'Northline Studio',
    'Lahore',
    'PK',
    'hybrid',
    'full-time',
    180000, 260000, 'PKR', 'month',
    `We are looking for a frontend developer to work on our client dashboard.

What you will do
- Build and maintain React interfaces used by around 40,000 people a month
- Work directly with our designer to turn Figma files into working screens
- Keep the app fast on mid-range Android phones, which most of our users have

What we are looking for
- Two or more years writing React
- Comfortable with CSS beyond a component library
- Able to explain a technical trade-off to someone non-technical`
  );

  await insert(
    'Backend Engineer (Node.js)',
    'Northline Studio',
    'Dubai',
    'AE',
    'remote',
    'full-time',
    9000, 13000, 'AED', 'month',
    `Own the services behind our payments and reporting features.

You will spend your time on API design, database work in PostgreSQL, and making sure background jobs finish on time. We deploy several times a week and everyone takes a turn on support.

We would like you to have shipped and maintained a Node service in production, and to be comfortable reading a slow query plan.`
  );

  await insert(
    'Marketing Intern',
    'Northline Studio',
    'Lahore',
    'PK',
    'on-site',
    'internship',
    45000, null, 'PKR', 'month',
    `A six-month paid internship for someone starting out in marketing.

You will help run our social accounts, write short case studies about customer projects, and put together the monthly newsletter. You will have a mentor and a weekly one-to-one.

No experience needed. Show us something you have written, even if it was for a university project.`
  );

  console.log('Added 3 sample jobs');
}

const { count: adCount } = await queryOne('SELECT COUNT(*)::int AS count FROM ads');

if (adCount === 0) {
  await query(
    `INSERT INTO ads (title, body, link_url, ad_type, slot, page_scope, size_hint)
     VALUES ($1, $2, $3, 'direct', $4, $5, $6)`,
    [
      'Hiring across three cities?',
      'Northline helps growing teams run their recruiting end to end.',
      'https://example.com',
      'top',
      'all',
      '728x90',
    ]
  );
  console.log('Added 1 sample ad');
}

console.log('\nSign in at /#/admin with:');
console.log(`  email:    ${email}`);
console.log(`  password: ${password}`);

await pool.end();
