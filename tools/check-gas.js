// Проверка перед деплоем. Apps Script при выдаче HTML вырезает «//» до конца строки
// внутри шаблонных строк JavaScript (`...`), и скрипт страницы ломается целиком.
// Разбираем каждый <script> настоящим парсером (acorn) и ищем «//» в шаблонных строках.
const fs = require('fs');
const acorn = require('acorn');
const file = process.argv[2] || 'src/Index.html';
const html = fs.readFileSync(file, 'utf8');
const re = /<script>([\s\S]*?)<\/script>/g;
let m, bad = 0;
while ((m = re.exec(html))) {
  const code = m[1];
  const baseLine = html.slice(0, m.index).split('\n').length;
  try {
    for (const tok of acorn.tokenizer(code, {ecmaVersion: 'latest', locations: true})) {
      if (tok.type === acorn.tokTypes.template && /\/\//.test(tok.value || '')) {
        const line = baseLine + tok.loc.start.line - 1;
        console.log(`::error file=${file},line=${line}::«//» внутри шаблонной строки: Apps Script обрежет её. Соберите адрес из частей в обычных кавычках.`);
        bad++;
      }
    }
  } catch (e) {
    console.log(`::error file=${file},line=${baseLine}::Скрипт не разбирается: ${e.message}`);
    bad++;
  }
}
if (bad) process.exit(1);
console.log('Проверка пройдена: «//» внутри шаблонных строк нет, скрипты разбираются');
