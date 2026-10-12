# План продаж Ozon

Трекер выполнения плана продаж Ozon: план/факт по кабинетам, категориям и артикулам, ЧП и рентабельность, симулятор «объём или маржа», история месяцев.

- Сайт — веб-приложение Google Apps Script (`src/Index.html`, `src/Code.js`).
- Данные — в Google-таблице, к которой привязан скрипт: вкладки `months` (план), `facts` (факт по неделям), `История` (сводка).
- Каждый push в `main` с изменениями в `src/` автоматически заливается в проект и обновляет веб-приложение по той же ссылке (`.github/workflows/deploy.yml`).

## Настройка (один раз)

1. Apps Script API: https://script.google.com/home/usersettings → включить.
2. В `.clasp.json` — Script ID проекта (Настройки проекта → Идентификатор скрипта).
3. GitHub → Settings → Secrets and variables → Actions:
   - Secret `CLASPRC_JSON` — содержимое файла `~/.clasprc.json` после `npm i -g @google/clasp@2.4.2` и `clasp login`.
   - Variable `DEPLOYMENT_ID` — ID веб-приложения (Развернуть → Управление развертываниями).

## Откат

Откатить коммит (`git revert`) и запушить — задеплоится предыдущая версия.
