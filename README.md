# План продаж Ozon

Трекер выполнения плана продаж Ozon: план/факт по кабинетам, категориям и артикулам, ЧП и рентабельность, симулятор «объём или маржа», история месяцев.

- Сайт — веб-приложение Google Apps Script (`src/Index.html`, `src/Code.js`).
- Данные — в Google-таблице, к которой привязан скрипт: вкладки `months` (план), `facts` (факт по неделям), `История` (сводка).
- Каждый push в `main` с изменениями в `src/` автоматически заливается в проект и обновляет веб-приложение по той же ссылке (`.github/workflows/deploy.yml`).

## Настройка (один раз)

1. Apps Script API: https://script.google.com/home/usersettings → включить.
2. `.clasp.json` — Script ID проекта; `DEPLOYMENT_ID` веб-приложения — в `.github/workflows/deploy.yml`.
3. GitHub → Settings → Secrets and variables → Actions → секрет `CLASPRC_JSON`: содержимое `~/.clasprc.json` после `npm i -g @google/clasp@2.4.2` и `clasp login` (на Windows: `clasp.cmd login`).

## Откат

Откатить коммит (`git revert`) и запушить — задеплоится предыдущая версия.
