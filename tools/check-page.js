// Проверка перед публикацией: каждый <script> страницы должен разбираться без ошибок,
// иначе сайт откроется пустым. Ошибки выводятся аннотациями GitHub Actions с номером строки.
const fs = require('fs');
const acorn = require('acorn');
const file = process.argv[2] || 'site/index.html';
const html = fs.readFileSync(file, 'utf8');
const re = /<script>([\s\S]*?)<\/script>/g;
let m, bad = 0, n = 0;
while ((m = re.exec(html))) {
  n++;
  const baseLine = html.slice(0, m.index).split('\n').length;
  try {
    acorn.parse(m[1], {ecmaVersion: 'latest', sourceType: 'script', allowAwaitOutsideFunction: false});
  } catch (e) {
    const line = baseLine + (e.loc ? e.loc.line - 1 : 0);
    console.log(`::error file=${file},line=${line}::Скрипт страницы не разбирается: ${e.message}`);
    bad++;
  }
}
if (!n) { console.log(`::error file=${file}::В странице не найдено ни одного <script>`); process.exit(1); }
if (bad) process.exit(1);
console.log(`Проверка пройдена: скриптов ${n}, все разбираются`);
