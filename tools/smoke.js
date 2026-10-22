// Быстрая проверка в настоящем браузере: страница открывается без ошибок JavaScript,
// показывает экран подключения, а в режиме «без подключения» рисует все вкладки.
// Ошибки выводятся аннотациями GitHub Actions.
const path = require('path');
const { chromium } = require('playwright');
const file = path.resolve(process.argv[2] || 'site/index.html');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const fail = msg => { console.log('::error title=Проверка в браузере::' + msg.replace(/\s+/g, ' ')); process.exitCode = 1; };
  try {
    await page.goto('file://' + file);
    await page.waitForSelector('#ghToken', { timeout: 10000 });
    await page.click('#ghLocal');
    await page.waitForSelector('#tab-plan:not([hidden])', { timeout: 10000 });
    for (const t of ['tracker', 'sim', 'history', 'upload', 'plan']) {
      await page.click(`#tabs button[data-tab=${t}]`);
      await page.waitForSelector(`#tab-${t}:not([hidden])`, { timeout: 5000 });
    }
  } catch (e) {
    fail('Сценарий не прошёл: ' + e.message);
  }
  if (errors.length) fail('Ошибки JavaScript на странице: ' + errors.join(' | '));
  await browser.close();
  if (!process.exitCode) console.log('Проверка в браузере пройдена');
})();
