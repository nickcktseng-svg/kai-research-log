# Cloudflare D1 設定說明

這個資料夾只建立 D1 基礎架構。現有正式頁面仍使用 `src/data/tasks.json` 與 `src/data/weekly-reports.json`，D1 尚未取代 JSON 資料來源。

## 人工設定步驟

1. 安裝依賴

```bash
npm install
```

2. 登入 Cloudflare

```bash
npx wrangler login
```

3. 建立 D1 database

```bash
npx wrangler d1 create kai-research-db
```

4. 將 Cloudflare 回傳的 `database_id` 填入 `wrangler.jsonc`

如果設定檔仍保留 placeholder，請把下列文字換成實際 ID：

```text
REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID
```

5. 建立本機資料庫 schema

```bash
npx wrangler d1 execute kai-research-db --local --file=./db/schema.sql
```

也可以使用專案 script：

```bash
npm run db:local:init
```

6. 建立遠端資料庫 schema

```bash
npx wrangler d1 execute kai-research-db --remote --file=./db/schema.sql
```

也可以使用專案 script：

```bash
npm run db:remote:init
```

7. 產生 JSON seed SQL

```bash
npm run db:seed:generate
```

這會依照目前的 `src/data/tasks.json` 與 `src/data/weekly-reports.json` 產生：

```text
db/seed.sql
```

8. 匯入本機 seed 資料

```bash
npm run db:local:seed
```

9. 匯入遠端 seed 資料

```bash
npm run db:remote:seed
```

`db/seed.sql` 可重複執行。相同 ID 的任務與週報會更新，對應的 tags、categories 與週報 sections 會依照目前 JSON 重新建立。

10. 本機測試

```bash
npm run dev
```

或依目前 adapter 設定使用：

```bash
npm run build
npm run preview
```

11. 測試 health API

```text
/api/health
```

成功時會回傳：

```json
{
  "ok": true,
  "database": "connected"
}
```

12. 測試 D1 只讀資料 API

```text
/api/db/tasks
/api/db/weekly-reports
```

這兩個 API 只讀取 D1，不會新增、修改或刪除資料。

如果尚未設定 `DB` binding，或 D1 查詢失敗，會回傳：

```json
{
  "ok": false,
  "database": "unavailable"
}
```

13. 設定受保護任務 API token

受保護的任務寫入 API 需要 `TASK_API_TOKEN`，請用 Cloudflare secret 設定，不要寫進 repository：

```bash
npx wrangler secret put TASK_API_TOKEN
```

本機開發時可以在 `.dev.vars` 放測試 token；這個檔案已被 `.gitignore` 忽略：

```text
TASK_API_TOKEN="replace-with-local-test-token"
```

14. 測試受保護任務 API

以下 API 都需要：

```text
Authorization: Bearer <TASK_API_TOKEN>
```

新增任務：

```bash
curl -X POST http://localhost:8787/api/admin/tasks \
  -H "Authorization: Bearer $TASK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "測試 D1 任務寫入",
    "description": "確認受保護 API 可以新增任務。",
    "type": "daily",
    "category": "網站開發",
    "status": "todo",
    "priority": "medium",
    "date": "2026-07-24",
    "week": "2026-W30",
    "tags": ["D1", "API"]
  }'
```

更新任務：

```bash
curl -X PATCH http://localhost:8787/api/admin/tasks/<task-id> \
  -H "Authorization: Bearer $TASK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "doing",
    "priority": "high",
    "tags": ["D1", "API", "任務管理"]
  }'
```

完成任務：

```bash
curl -X POST http://localhost:8787/api/admin/tasks/<task-id>/complete \
  -H "Authorization: Bearer $TASK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

如果尚未設定 `TASK_API_TOKEN`，受保護 API 會回傳 `auth_unconfigured`。如果 token 錯誤或缺少 `Authorization` header，會回傳 `unauthorized`。

## 目前限制

- `tasks.json` 與 `weekly-reports.json` 目前仍是正式頁面的資料來源。
- D1 尚未取代 `tasks.json` 與 `weekly-reports.json`。
- `/tasks`、`/weekly` 與 `/dashboard` 目前仍使用 JSON，不會因受保護任務 API 而自動改用 D1。
- 目前新增的寫入能力只限 `/api/admin/tasks`、`/api/admin/tasks/<task-id>` 與 `/api/admin/tasks/<task-id>/complete`，而且必須帶 `TASK_API_TOKEN`。
- 目前尚未建立刪除 API、登入頁、後台編輯介面或公開 CRUD UI。
- `db/seed.sql` 是人工/部署流程使用的資料匯入檔，不是公開寫入 API。
- 下一階段才會評估是否將正式頁面資料來源切換到 D1。

## 注意事項

- 在執行遠端 D1 指令前，必須先把 `wrangler.jsonc` 的 `database_id` placeholder 換成 Cloudflare 回傳的實際 ID。
- 不要把 `.dev.vars`、token、secret 或其他 Cloudflare 機密提交到 repository。
