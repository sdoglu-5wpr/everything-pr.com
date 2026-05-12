import { stripFaqFromHtml } from '../src/lib/faq';
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('/tmp/pillars.json','utf8'));
for (const row of data) {
  const out = stripFaqFromHtml(row.body_html);
  const stripped = row.body_html.length - out.length;
  const leftover = /frequently asked questions/i.test(out);
  console.log(row.slug.padEnd(35), 'stripped=', stripped, 'leftover=', leftover);
}
