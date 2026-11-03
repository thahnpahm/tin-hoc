import fs from 'fs';
const [src, out] = process.argv.slice(2);
const L = fs.readFileSync(src, 'utf8').split('\n');
const read = f => fs.readFileSync(f, 'utf8').replace(/\n$/, '');
const assets = fs.readdirSync('out').filter(f => f.endsWith('.webp')).sort()
  .map(f => `  '${f.slice(0, -5)}':'data:image/webp;base64,${fs.readFileSync('out/' + f).toString('base64')}',`).join('\n');
const devices = read('devices.js').replace('/*ASSETS*/', `const ASSET = {\n${assets}\n};`);
// splice bottom-up so line numbers stay valid (1-indexed, inclusive)
const cut = (a, b, check, text) => { if (!check()) throw `block ${a}-${b} moved`; L.splice(a - 1, b - a + 1, text); };
cut(967, 1089, () => L[966] === '/* ---- one volume ---- */' && L[1087] === '  return B;' && L[1088] === '}', read('book.js'));
cut(325, 514, () => L[324].startsWith('/* The plates') && L[513] === '}' && L[363] === "const FOIL = '#efe4cc';", devices);
cut(236, 279, () => L[235].startsWith('const STUDIO') && L[278] === '];', read('books.js'));
let html = L.join('\n');
const txt = fs.readFileSync('patches.txt', 'utf8') + fs.readFileSync('chat.txt', 'utf8') + fs.readFileSync('pair.txt', 'utf8');
const re = /@@@OLD\n([\s\S]*?)\n@@@NEW\n([\s\S]*?)(?=@@@(?:OLD|END))/g;
let m, n = 0;
while ((m = re.exec(txt))) {
  const [, a, b] = m, cnt = html.split(a).length - 1;
  if (cnt !== 1) throw `patch ${n} matched ${cnt}x: ${a.slice(0, 70)}`;
  html = html.replace(a, () => b.replace(/\n$/, ''));
  n++;
}
fs.writeFileSync(out, html);
// the Artifact publish wraps the page in its own doctype/charset/viewport skeleton
const art = process.argv[4];
if (art) {
  const head = ['<!doctype html>\n', '<meta charset="utf-8">\n', '<meta name="viewport" content="width=device-width,initial-scale=1">\n'];
  let page = html;
  for (const h of head) { if (!page.includes(h)) throw `skeleton line missing: ${h}`; page = page.replace(h, ''); }
  // on the web the photos ship as files beside the page, so the page itself stays small
  let n = 0;
  page = page.replace(/'([\w]+)':'data:image\/webp;base64,[^']+'/g, (_, k) => (n++, `'${k}':'img/${k}.webp'`));
  if (n !== fs.readdirSync('out').filter(f => f.endsWith('.webp')).length) throw `asset rewrite hit ${n}`;
  fs.writeFileSync(art, page);
}
console.log(`${n} patches, ${(html.length / 1024) | 0} KB, leftovers:`,
  (html.match(/Ashen|ASHEN|FromSoftware|PLATE_SRC|Volume |paintCover|artBack|artSpine/g) || []).join(','));
