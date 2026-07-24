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

請把下列 placeholder 換成實際 ID：

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

7. 本機測試

```bash
npm run dev
```

或依目前 adapter 設定使用：

```bash
npm run build
npm run preview
```

8. 測試 health API

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

如果尚未設定 `DB` binding，或 D1 查詢失敗，會回傳：

```json
{
  "ok": false,
  "database": "unavailable"
}
```

## 目前限制

- `tasks.json` 與 `weekly-reports.json` 目前仍是正式頁面的資料來源。
- D1 尚未取代 `tasks.json` 與 `weekly-reports.json`。
- 目前只新增只讀 `/api/health`，不會寫入、刪除或修改任何資料。
- 下一階段才會建立資料搬移流程與受保護的 CRUD API。

## 注意事項

- 在執行遠端 D1 指令前，必須先把 `wrangler.jsonc` 的 `database_id` placeholder 換成 Cloudflare 回傳的實際 ID。
- 不要把 `.dev.vars`、token、secret 或其他 Cloudflare 機密提交到 repository。
