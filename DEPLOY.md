# Деплой SmartBundle

Проект деплоится **двумя независимыми дорожками**:

| Дорожка | Что уезжает | Чем |
|---|---|---|
| Backend | Remix/React Router приложение, миграции БД | Railway (Docker) |
| Shopify | Конфиг приложения, theme extension, Cart Transform функция | `shopify app deploy` |

Дорожки не связаны друг с другом: Railway ничего не знает о расширениях, а Shopify CLI не трогает сервер. Порядок между ними важен только тогда, когда изменения в расширении зависят от новых данных с бэкенда (см. «Порядок выката»).

---

## 1. Предварительные требования

- Node `>=20.19 <22 || >=22.12` (CI фиксирует `22.13.0`)
- Shopify CLI — локальный, из devDependencies (`@shopify/cli` 4.5.2), отдельно ставить не нужно
- Доступ к Partner-организации приложения `SmartBundle` (client_id `fd2a3ab5cb50798f5a7917d179e68cfd`)
- Доступ к проекту на Railway

Переменные окружения — по образцу [.env.example](.env.example). Обязательные на проде:

```
DATABASE_URL           # PostgreSQL
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
SHOPIFY_APP_URL        # должен совпадать с application_url в shopify.app.toml
SCOPES                 # должен совпадать с access_scopes в shopify.app.toml
```

Остальные (`SHOPIFY_PARTNER_*`, `CRON_SECRET`, `SHOPIFY_PRICING_ENABLED`, флаги обслуживания) — по функционалу, который включён.

`.env` не коммитится. `.shopify/` целиком в `.gitignore` — там локальный кеш CLI и собранный `deploy-bundle`.

---

## 2. Гейт перед деплоем

Один прогон, обязателен перед обеими дорожками:

```bash
npm run check
```

Он последовательно выполняет:

1. `typecheck` — `react-router typegen && tsc --noEmit`
2. `lint` — ESLint по всему репозиторию
3. `test` — тесты Cart Transform функции (workspace `smart-bundle-transform`)
4. `check:theme` — `shopify theme check` по theme extension
5. `check:theme-js` — `node --check` по каждому JS-ассету витрины
6. `function:build` — сборка `dist/function.wasm`
7. `build` — `react-router build`

Ровно это же гоняет CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) на каждый push и PR, плюс `prisma validate` и `prisma generate`.

> **Важно:** `check:theme-js` перечисляет файлы витрины поимённо. Добавил или удалил ассет в `extensions/smart-bundle-theme/assets/` — обнови список в [package.json](package.json), иначе гейт либо упадёт, либо молча пропустит новый файл.

---

## 3. Деплой в Shopify

```bash
npm run deploy
```

Это `shopify app deploy`. Уезжает:

- **Конфиг приложения** из [shopify.app.toml](shopify.app.toml): `application_url`, `redirect_urls`, `access_scopes`, подписки на вебхуки (api_version `2026-07`), определения метаполей `bundle_id` / `bundle_runtime` / `bundle_presentation`
- **Theme extension** `smart-bundle-theme` (uid `e54b3924-…`) — блок `smart-bundle.liquid`, все ассеты из `assets/`, локали
- **Cart Transform функция** `smart-bundle-transform` (uid `75ab75d8-…`) — `dist/function.wasm`

Нюансы:

- `extensions/*/dist` в `.gitignore`, а `shopify.extension.toml` функции задан с пустым `command` и `path = "dist/function.wasm"`. Значит **`npm run function:build` должен отработать до деплоя** — в `npm run check` он входит, но если деплоишь без гейта, собери функцию вручную.
- Меняются scopes в `shopify.app.toml` → после деплоя магазины пройдут переавторизацию (вебхук `app/scopes_update` уже подписан).
- Ассеты theme extension отдаются с CDN Shopify из одной папки. Модули витрины связаны относительными ESM-импортами (`smart-bundle-markup.js` → `smart-bundle-dom.js`, `smart-bundle-component-markup.js`), поэтому переименование/перенос ассета ломает резолв. После деплоя откройте страницу товара с бандлом и убедитесь, что блок поднялся.

---

## 4. Деплой бэкенда

Railway собирает образ по [Dockerfile](Dockerfile), конфигурация — в [railway.toml](railway.toml). Триггер сборки (обычно push в `main` репозитория `rusccom/SmartBundles`) настраивается на стороне Railway.

Что происходит в контейнере:

- **build stage** — `npm ci`, затем `npx prisma generate && npm run build && npm prune --omit=dev`
- **runtime stage** — `node:22-alpine`, пользователь `node`, порт 3000
- **на старте** — `npm run migrate:deploy && npm run start`, то есть `prisma migrate deploy` применяет миграции из `prisma/migrations/` **до** запуска сервера

Health-пробы:

| Путь | Что проверяет | Кто использует |
|---|---|---|
| `/readyz` | `SELECT 1` в БД, 503 при недоступности | Railway healthcheck (таймаут 300 с) |
| `/healthz` | что процесс жив | Docker HEALTHCHECK, каждые 30 с |

Политика рестарта — `ON_FAILURE`, до 10 попыток.

> Миграции применяются автоматически при каждом старте. Деструктивную миграцию (drop/rename колонки) нельзя выкатывать одновременно с кодом, который ещё читает старую схему — разбивайте на два релиза.

---

## 5. Порядок выката

Для обычных изменений порядок не важен. Координация нужна, когда:

- **Расширение зависит от новых данных бэкенда** (новое поле в `bundle_presentation`, повышение `sv`) → сначала бэкенд, дождаться, пока метаполя перезапишутся, потом `shopify app deploy`.
- **Меняется схема БД** → бэкенд применит миграции сам на старте; убедиться, что предыдущая версия кода переживает новую схему.
- **Меняются scopes или вебхуки** → `shopify app deploy` первым, иначе бэкенд будет ждать прав, которых ещё нет.

Изменения только внутри `extensions/smart-bundle-theme/` (вёрстка блока, CSS, JS витрины) самодостаточны: формат `bundle_presentation` не меняется, координация с бэкендом не нужна.

---

## 6. Проверка после деплоя

1. `GET /healthz` → `{"status":"ok"}`
2. `GET /readyz` → `{"status":"ready"}` (503 означает, что БД недоступна)
3. Открыть админку приложения в dev-магазине (`smarttradeapp.myshopify.com`), зайти в редактор бандла — форма слева, превью справа
4. Открыть страницу товара-бандла на витрине: блок должен раскрыться (до инициализации JS он `hidden`), выбор вариантов и пересчёт цены должны работать
5. Проверить в Partner Dashboard, что версия расширений — свежая

---

## 7. Локальная разработка

```bash
npm run dev
```

`shopify app dev` поднимает туннель и локальный сервер. `automatically_update_urls_on_dev = false` в `shopify.app.toml` — то есть **dev не перезаписывает production URL** приложения; туннельный адрес нужно подставлять вручную, если требуется.

Полезное:

```bash
npm run config:link      # привязать локальный конфиг к приложению в Partners
npm run env              # показать переменные окружения приложения
npm run function:schema  # обновить GraphQL-схему Cart Transform функции
```
