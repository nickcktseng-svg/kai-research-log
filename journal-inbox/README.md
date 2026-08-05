# Conversation Journal Inbox

這個資料夾用來暫存 Codex 任務摘要，或由使用者人工貼入的 ChatGPT 對話摘要。產生器只會讀取 `journal-inbox/pending/` 裡的 Markdown 檔案，並將通過檢查的內容轉成：

- `src/content/blog/generated/` 裡的研究日誌草稿
- `src/data/generated-weekly-report-drafts.json` 裡的週報草稿

所有自動產生的 Blog 文章都會保持 `draft: true`，週報也只會寫入草稿檔，不會直接改寫正式的 `src/data/weekly-reports.json`。

## 資料夾用途

| 路徑 | 用途 |
| --- | --- |
| `pending/` | 等待處理的 handoff Markdown。只有這裡會被產生器掃描。 |
| `processed/` | 已處理的 handoff 來源檔。 |
| `examples/` | 格式示範，不會被產生器掃描。 |
| `template.md` | 新增 handoff 時可複製的模板。 |
| `processed.json` | 已處理紀錄，用來避免同一份來源重複產生草稿。 |

## 基本流程

1. 複製 `template.md` 到 `pending/YYYY-MM-DD-簡短主題.md`。
2. 填入 frontmatter 與各章節摘要。
3. 執行 `npm run journal:validate` 檢查格式與初步敏感資訊。
4. 執行 `npm run journal:dry-run` 預覽會產生哪些草稿。
5. 執行 `npm run journal:generate` 產生日誌草稿與週報草稿。
6. 人工檢查 generated Blog 與 weekly draft，再決定是否發布或合併到正式週報。

## 隱私狀態

- `public-safe`：內容初步判斷可公開，但仍只會產生 draft。
- `needs-review`：可產生 draft，但必須人工確認。
- `private`：產生器會跳過，不會產生日誌或週報草稿。

這套檢查只能做初步防護，不能保證找出所有敏感資訊。請不要把 API Key、Token、密碼、SSH 私鑰、未公開研究結果或其他機密放進這個公開 Repository。
