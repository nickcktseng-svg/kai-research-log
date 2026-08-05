# Conversation Journal Pipeline v1

這套流程用來把 Codex 任務摘要，或使用者人工貼入的 ChatGPT 對話摘要，轉成研究日誌草稿與每週報告草稿。v1 是半自動版本，不使用 OpenAI API、不需要 API Key，也不建立 GitHub 定時排程。

## 1. 系統用途

研究與網站開發的過程常常分散在 Codex 任務、ChatGPT 對話、GitHub PR、D1 設定、文獻整理與日常筆記裡。Conversation Journal Pipeline 的目的，是先把這些內容放進 `journal-inbox/pending/`，再由本機腳本轉成：

- `src/content/blog/generated/` 裡的 Blog 草稿
- `src/data/generated-weekly-report-drafts.json` 裡的週報草稿

所有產生內容都需要人工檢查後，才可以決定是否發布或合併到正式週報。

## 2. Codex Handoff 如何產生

當 Codex 完成和研究、化學、計算化學、Astro、Cloudflare、GitHub、資料庫、API 或研究管理系統相關的實質任務時，可以依照 `AGENTS.md` 的 Journal Handoff 規則，在 `journal-inbox/pending/` 新增一份 handoff。

handoff 應該記錄：

- 本次目標
- 完成事項
- 重要技術或研究決策
- 遇到的問題
- 解決方式
- 修改的檔案
- 可以寫入研究日誌的內容
- 可以寫入週報的內容
- 待確認事項
- 下一步

只有拼字修正、很小的 CSS 調整、沒有實質學習或技術決策的工作，不需要建立 handoff。

## 3. ChatGPT 對話如何人工加入

這套系統不能直接讀取你的 ChatGPT 歷史。若要把 ChatGPT 對話整理成日誌，請由你人工摘要後，複製 `journal-inbox/template.md` 到：

```text
journal-inbox/pending/YYYY-MM-DD-簡短主題.md
```

再把對話摘要填進各章節。請只放入你確認可以進入 Repository 的內容，不要貼上私人資料、帳密、token、未公開研究結果或公司機密。

## 4. 為什麼不能直接讀取所有 ChatGPT 歷史

Codex 只能處理你在目前任務中提供的內容，不能也不應該自動讀取你所有 ChatGPT 歷史。這是為了避免誤讀私人對話、洩漏敏感資料，以及把未確認內容寫進公開 Repository。

只有你人工放進 `journal-inbox/pending/` 的摘要，才會被這套 pipeline 處理。

## 5. Template 填寫方式

請從 `journal-inbox/template.md` 複製一份新檔案。frontmatter 範例：

```yaml
---
id: conversation-YYYYMMDD-001
createdAt: "YYYY-MM-DDTHH:mm:ss+08:00"
source: "manual"
sourceTitle: ""
topics: []
privacy: "needs-review"
createJournal: true
updateWeekly: true
---
```

欄位說明：

- `id`：每份 handoff 的唯一 ID。
- `createdAt`：對話或任務完成時間，用來計算 Blog 日期與 ISO 週次。
- `source`：只能是 `codex`、`chatgpt` 或 `manual`。
- `sourceTitle`：可選，用來產生日誌標題與檔名。
- `topics`：可選，用來產生 tag 與判斷分類。
- `privacy`：只能是 `public-safe`、`needs-review` 或 `private`。
- `createJournal`：是否產生 Blog 草稿。
- `updateWeekly`：是否更新週報草稿。

章節可以留空，但必要章節標題必須存在。空白章節不會出現在產生的 Blog 草稿中。

## 6. Privacy 三種狀態

- `public-safe`：內容初步判斷可公開，但仍只產生 `draft: true` 草稿。
- `needs-review`：可以產生草稿，但草稿會標示需要人工確認。
- `private`：產生器會跳過，不會產生日誌草稿，也不會更新週報草稿。

`draft: true` 只代表網站不公開顯示，不代表 GitHub Repository 中的檔案是私密的。如果 Repository 是公開的，草稿內容仍可能被看到。

## 7. 執行指令

檢查 pending 檔案格式與初步敏感資訊：

```sh
npm run journal:validate
```

預覽會產生哪些草稿，不寫入也不移動檔案：

```sh
npm run journal:dry-run
```

產生日誌草稿與週報草稿，並把來源移到 processed：

```sh
npm run journal:generate
```

## 8. 為什麼自動文章一律 draft

handoff 只是摘要，不等於正式研究紀錄。它可能缺少上下文、含有待確認事項，或只是任務過程中的技術紀錄。因此所有自動產生的文章都必須：

```yaml
draft: true
generated: true
reviewStatus: "needs-review"
```

人工確認後，才能改成正式文章。

## 9. 如何人工檢查後發布 Blog

1. 到 `src/content/blog/generated/` 找到新產生的草稿。
2. 檢查內容是否正確，特別是化學、計算結果、技術決策與待確認事項。
3. 刪除不適合公開的內容。
4. 補上必要背景、結論、圖片或連結。
5. 將 `reviewStatus` 改為 `reviewed`。
6. 確認可以公開後，才把 `draft` 改為 `false`。

不要把「待確認」寫成已確認事實，也不要補上來源中沒有的研究結果。

## 10. 週報草稿如何合併到正式週報

週報草稿會寫入：

```text
src/data/generated-weekly-report-drafts.json
```

正式週報仍在：

```text
src/data/weekly-reports.json
```

人工合併流程：

1. 找到對應週次，例如 `2026-W32`。
2. 檢查 `completed`、`progress`、`problems`、`solutions`、`unfinished`、`next`。
3. 移除重複或不適合公開的項目。
4. 將整理後內容手動加入正式 `weekly-reports.json`，或未來再透過 D1 管理頁處理。

pipeline 不會直接修改正式週報。

## 11. 敏感資料與公開 Repository 注意事項

驗證器會初步檢查以下關鍵字或型態：

- `BEGIN PRIVATE KEY`
- `API key`
- `Bearer token`
- `password`
- `secret`
- `GitHub token`
- `Cloudflare token`
- `OPENAI_API_KEY`
- `SSH_PRIVATE_KEY`

偵測到疑似敏感資訊時，驗證器只會顯示檔名與問題類型，不會輸出完整內容。這只是初步檢查，不能保證找出所有敏感資料。

請不要提交：

- API Key、Token、密碼
- SSH 私鑰
- 個人敏感資料
- 公司內部機密
- 未公開實驗數值
- 未公開研究結果
- 內部伺服器位址

## 12. 這一版沒有使用 OpenAI API

v1 只依照 handoff 中已存在的章節內容做格式轉換，不會呼叫 OpenAI API，也不需要 API Key。它不會自動摘要 PDF、聊天紀錄或研究資料。

## 13. 未來規劃

未來才會考慮：

- GitHub Action 自動驗證 pending handoff
- 自動建立 PR，而不是直接提交到 main
- 更完整的草稿審查流程
- 更細緻的敏感資訊掃描
- 本地端或人工確認後的 AI 輔助整理

在這些功能完成以前，pipeline 只作為本機半自動草稿產生工具使用。
