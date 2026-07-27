# Cloudflare D1 設定說明

這個資料夾記錄 D1 基礎架構與資料同步流程。目前 `/tasks`、`/weekly`、`/dashboard`、`/journal` 與 `/papers` 會優先讀取 D1。當 D1 binding 或查詢不可用時，任務會回退到 `src/data/tasks.json`，週報會回退到 `src/data/weekly-reports.json`。

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

`db/seed.sql` 可重複執行。相同 ID 的任務與週報會更新，對應的 tags、categories 與週報 sections 會依照目前 JSON 重新建立。因為 `/tasks` 優先讀取 D1，遠端 D1 seed 或受保護任務 API 寫入後，任務頁會反映 D1 中的資料。

10. 清空任務資料

目前 `src/data/tasks.json` 已清空。若遠端 D1 裡仍有舊任務，可以執行：

```bash
npm run db:remote:clear-tasks
```

本機 D1 可以執行：

```bash
npm run db:local:clear-tasks
```

這只會刪除 `tasks` 與 `task_tags`，不會刪除週報或研究筆記。

11. 本機測試

```bash
npm run dev
```

或依目前 adapter 設定使用：

```bash
npm run build
npm run preview
```

12. 測試 health API

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

13. 測試 D1 只讀資料 API

```text
/api/db/tasks
/api/db/weekly-reports
/api/db/journal
/api/db/papers
```

這些 API 只讀取 D1，不會新增、修改或刪除資料。

如果尚未設定 `DB` binding，或 D1 查詢失敗，會回傳：

```json
{
  "ok": false,
  "database": "unavailable"
}
```

14. 設定登入系統 secrets

本人登入與訪客登入需要 `SESSION_SECRET`。本人帳號還需要 `OWNER_USERNAME` 與 `OWNER_PASSWORD`。請用 Cloudflare secret 設定，不要寫進 repository：

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put OWNER_USERNAME
npx wrangler secret put OWNER_PASSWORD
```

`OWNER_USERNAME` 若未設定，程式會使用預設帳號 `kai`。`SESSION_SECRET` 建議使用長度足夠、不可猜測的隨機字串。

本機開發時可以在 `.dev.vars` 放測試用值；這個檔案已被 `.gitignore` 忽略：

```text
SESSION_SECRET="replace-with-local-session-secret"
OWNER_USERNAME="kai"
OWNER_PASSWORD="replace-with-local-owner-password"
```

14. 設定受保護任務 API token

受保護的任務寫入 API 需要 `TASK_API_TOKEN`，請用 Cloudflare secret 設定，不要寫進 repository：

```bash
npx wrangler secret put TASK_API_TOKEN
```

本機開發時可以在 `.dev.vars` 放測試 token；這個檔案已被 `.gitignore` 忽略：

```text
TASK_API_TOKEN="replace-with-local-test-token"
```

前台 `/tasks/admin/` 與 `/journal/admin/` 會優先使用本人登入後的 session cookie 呼叫受保護 API；`TASK_API_TOKEN` 仍保留給 curl、腳本或其他非瀏覽器流程作為備援。

15. 測試受保護任務 API

以下 API 都需要：

```text
本人登入 session cookie，或 `Authorization: Bearer <TASK_API_TOKEN>`
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

清空全部任務：

```bash
curl -X POST http://localhost:8787/api/admin/tasks/clear \
  -H "Authorization: Bearer $TASK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

16. 測試受保護研究筆記 API

新增研究筆記：

```bash
curl -X POST http://localhost:8787/api/admin/journal \
  -H "Authorization: Bearer $TASK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "測試研究筆記",
    "summary": "確認 D1 可以儲存研究筆記。",
    "category": "研究日誌",
    "status": "draft",
    "entry_date": "2026-07-28",
    "tags": ["D1", "Journal"],
    "content_html": "<p>這是一篇測試筆記。</p>"
  }'
```

更新研究筆記：

```bash
curl -X PATCH http://localhost:8787/api/admin/journal/<journal-id> \
  -H "Authorization: Bearer $TASK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published"
  }'
```

17. 測試受保護文獻庫 API

新增或更新收藏文獻：

```bash
curl -X POST http://localhost:8787/api/admin/papers \
  -H "Authorization: Bearer $TASK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "manual",
    "title": "測試文獻",
    "authors": ["Kai"],
    "publication_year": 2026,
    "journal": "Research Notes",
    "abstract": "確認 D1 可以儲存文獻資料。",
    "citation": "Kai (2026). 測試文獻.",
    "reading_status": "to_read",
    "tags": ["DFT", "catalysis"],
    "visibility": "private"
  }'
```

更新閱讀狀態與筆記：

```bash
curl -X PATCH http://localhost:8787/api/admin/papers/<paper-id> \
  -H "Authorization: Bearer $TASK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reading_status": "reading",
    "notes": "這篇文獻和目前研究題目相關，之後要回來看方法段落。"
  }'
```

新增一筆本地分析結果：

```bash
curl -X POST http://localhost:8787/api/admin/papers/<paper-id>/analyses \
  -H "Authorization: Bearer $TASK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_mode": "quick",
    "analysis_title": "五分鐘速覽",
    "analysis_markdown": "## 測試分析\n\n- 這是一筆本地分析結果。",
    "source_excerpt": "本地貼上的摘要或全文節錄。"
  }'
```

如果尚未設定 `SESSION_SECRET` 與 `TASK_API_TOKEN`，受保護 API 會回傳 `auth_unconfigured`。如果登入狀態、token 錯誤或缺少授權資訊，會回傳 `unauthorized`。

## 目前限制

- `/tasks` 目前優先使用 D1，D1 不可用時回退到 `tasks.json`。
- `/weekly` 目前會讀 D1 週報，D1 不可用時回退到 `weekly-reports.json`。
- `/dashboard` 目前會讀 D1 任務、週報與研究筆記，D1 不可用時回退到 JSON。
- `/journal` 是 D1 版研究筆記，只有已發布筆記會公開顯示。
- `/papers` 是 D1 版文獻庫，本人登入後可以查看私人文獻並編輯閱讀狀態、標籤與筆記；訪客只會看到公開文獻。
- `/literature` 的文獻分析目前仍是瀏覽器端本地規則式整理，沒有把上傳文件送到外部 AI API。
- 目前新增的寫入能力只限受保護的任務 API、研究筆記 API 與文獻庫 API，而且必須具備本人登入 session 或 `TASK_API_TOKEN`。
- `/tasks/admin/` 是本人登入後使用的任務管理頁，目前可新增任務、標記完成與清空任務。
- `/journal/admin/` 是本人登入後使用的研究筆記撰寫頁，目前可建立草稿、發布筆記，並可貼入小型圖片。
- `db/seed.sql` 是人工/部署流程使用的資料匯入檔，不是公開寫入 API。
- Blog content collection 文章仍是檔案式內容，尚未建立 D1 版 Blog frontmatter 編輯器。
- 圖片目前會以小型 data URL 方式存在研究筆記內容中；大量圖片或大圖建議下一階段改接 Cloudflare R2。

## 注意事項

- 在執行遠端 D1 指令前，必須先把 `wrangler.jsonc` 的 `database_id` placeholder 換成 Cloudflare 回傳的實際 ID。
- 不要把 `.dev.vars`、token、secret 或其他 Cloudflare 機密提交到 repository。
