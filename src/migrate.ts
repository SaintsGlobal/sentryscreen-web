// `npm run migrate`: apply migrations/*.sql to DATABASE_URL. The server also
// migrates at startup; this is for running it by hand.
import { createPool, migrate } from './db.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const db = createPool(url);
try {
  await migrate(db, (m) => console.log(m));
  console.log('migrations up to date');
} finally {
  await db.end();
}
