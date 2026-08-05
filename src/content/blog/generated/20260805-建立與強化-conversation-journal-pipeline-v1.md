---
title: "建立與強化 Conversation Journal Pipeline v1"
description: "近期先針對研究網站進行內容審計，修正明確重複、過時與 placeholder 內容，接著建立 Conversation Journal Pipeline v1，使 Codex 或人工整理的 ChatGPT handoff 可以轉換成研..."
pubDate: "2026-08-05"
category: "網站開發"
tags:
  - "Astro"
  - "Codex"
  - "網站開發"
  - "研究日誌"
  - "研究週報"
  - "Node.js"
draft: true
generated: true
reviewStatus: "needs-review"
sourceConversationIds:
  - "conversation-20260805-journal-pipeline"
---

> 這份草稿由 Conversation Journal Pipeline v1 依據 handoff 摘要產生。
> 發布前請人工檢查；`draft: true` 不代表 GitHub Repository 中的檔案是私密的。

> 來源隱私狀態為 `needs-review`，所有內容都需要人工確認後才可發布。

# 本次目標

- 建立結構化 Conversation Inbox
- 將 handoff 轉換成研究日誌草稿
- 將完成事項整理進週報草稿
- 避免內容重複處理
- 阻擋疑似敏感資訊
- 確保所有自動文章都需要人工審核

# 完成事項

- 在 PR #12 建立網站內容審計報告，整理路由、內容重複、placeholder、命名不一致與後續整理建議
- 在 PR #13 依審計結果完成安全內容整理，包含 README、About、RSS draft 排除、VASP 文章草稿標記與命名建議文件
- 建立 `journal-inbox/` 結構，包含 pending、processed、examples、template 與 processed.json
- 建立 handoff template，固定必要 frontmatter 與章節
- 新增 inbox 驗證指令 `journal:validate`
- 新增日誌與週報草稿產生器 `journal:generate`
- 新增 `journal:dry-run`，可在不寫入、不移動檔案的情況下預覽處理結果
- 新增 `processed.json` 重複處理防護，避免相同 id 或 content hash 重複處理
- 改用 `js-yaml` 解析 frontmatter
- 加入 pending、processed 與 generated blog 的路徑安全限制
- 加入同名檔案衝突處理，避免覆蓋既有草稿
- 加入 ISO week 計算，讓週報週次依 handoff 的 `createdAt` 決定
- 加入 Node.js 內建 `node:test` 測試
- 確認 dry-run 前後 working tree 不會出現額外變更
- 確認 generated Blog 草稿會保持 `draft: true`
- 確認正式 `src/data/weekly-reports.json` 不會被 pipeline 直接修改

# 學到的內容

## 網頁開發

- 這次練習到結構化 frontmatter 的驗證，包含必要欄位、允許值、陣列與布林欄位
- 使用可靠 YAML parser 處理冒號字串、YAML array、空陣列、引號字串與含時區的 timestamp
- 產生檔案前限制輸出根目錄，避免 pending、processed 或 generated 路徑被 frontmatter 影響
- 使用 SHA-256 content hash 與 `processed.json` 判斷是否重複處理
- 使用暫存檔與 rename 寫入 JSON，降低部分寫入造成檔案損壞的風險
- 依 ISO week 規則計算週報週次，避免跨年週次錯誤
- 使用 Node.js 內建 `node:test` 建立輕量端到端測試
- 讓自動產生的草稿資料與正式資料分離，Blog 寫入 generated draft，週報寫入 generated weekly draft

# 重要決策

- v1 不使用 OpenAI API
- v1 不直接讀取 ChatGPT 歷史
- v1 只處理人工提供或 Codex 建立的結構化 handoff
- 所有 generated Blog 一律保持 `draft: true`
- generated Blog 一律標示 `generated: true` 與 `reviewStatus: "needs-review"`
- 週報草稿先寫入 `src/data/generated-weekly-report-drafts.json`
- 正式 `src/data/weekly-reports.json` 不由 pipeline 自動改寫
- 所有內容發布前需要人工確認

# 遇到的問題

- 原先自行解析 YAML 可能不夠穩定，遇到冒號字串或 YAML array 時風險較高
- 需要防止路徑穿越與同名檔案覆蓋
- 需要避免相同 id 或 hash 被重複處理
- `processed.json` 若損壞，不能被自動覆蓋成空陣列
- ISO week 在跨年時不能使用簡單的每七天算法
- dry-run 必須保證不更動 working tree
- 敏感內容檢查不能輸出完整疑似秘密
- Astro build 在受限沙盒中曾遇到本機 listen 權限限制，需要在允許本機監聽的環境重跑

# 解決方式

- 使用 `js-yaml` 解析 handoff frontmatter
- 驗證 `id`、`createdAt`、`source` 與 `privacy` 等必要欄位
- 限制 pending、processed 與 generated 的根目錄
- 使用 conversation id、短 hash 或數字後綴避免同名檔案覆蓋
- 使用 SHA-256 與 `processed.json` 避免重複處理
- 驗證 `processed.json` 的重複 id、重複 content hash、相對路徑、ISO timestamp 與 weekly draft week 格式
- 依 ISO 週規則計算 week-year
- 使用暫存資料夾執行測試，避免碰到正式 inbox 與正式草稿資料
- 使用 atomic JSON write
- 以 `git status --short` 比較 dry-run 前後狀態
- 敏感內容偵測只輸出檔名與問題類型，不輸出完整內容

# 待確認事項

- 敏感內容檢查只能作為初步防線，不能保證找出所有敏感內容
- 自動產生日誌的文字品質仍需人工確認
- 週報草稿仍需人工整理後才能成為正式週報
- 未來是否加入 OpenAI API 與自動 PR 尚未決定
- 未來是否將 ChatGPT 摘要流程進一步標準化尚未決定

# 下一步

- 執行第一筆真實 handoff
- 人工檢查 generated Blog
- 人工檢查 generated weekly report
- 根據實際結果決定 v1 是否需要調整
- 穩定使用一段時間後再評估 v2
