---
title: "從網站內容整理到自動研究日誌：建立 Conversation Journal Pipeline v1"
description: "記錄研究網站從內容審計、重複內容整理，到建立結構化對話日誌與週報草稿流程的開發過程。"
pubDate: "2026-08-05"
category: "網站開發"
tags:
  - "Astro"
  - "Codex"
  - "研究日誌"
  - "自動化"
  - "Node.js"
draft: false
generated: true
reviewStatus: "reviewed"
sourceConversationIds:
  - "conversation-20260805-journal-pipeline"
---

# 為什麼需要整理網站內容

這幾天我把研究網站從單純的學習日誌，逐步整理成可以支援任務、週報、文獻與研究紀錄的管理平台。功能增加以後，新的問題也開始出現：有些文章主題相近，有些頁面還留著早期暫放文字，有些功能入口在 Header、首頁和 Dashboard 重複出現，Blog、週報與 Dashboard 也有機會呈現到同一批內容。

所以這次不是先急著加新功能，而是先回頭整理網站的內容結構。我希望網站之後可以持續累積研究紀錄，而不是每完成一件事情就散落在對話、PR、任務清單或週報裡。這也是後來建立 Conversation Journal Pipeline v1 的原因：把開發過程整理成可以被審查、改寫與發布的研究日誌草稿。

# 第一步：網站內容審計

第一步是讓 Codex 對整個網站做內容審計。審計範圍包含頁面、文章、資料檔、導覽、元件、公開圖片與文件，目標是找出真正會影響使用者理解或後續維護的問題，而不是為了整理而整理。

這份審計指出幾個明確問題：有兩篇文章正文高度重複但 metadata 指向不同主題，RSS 必須排除 draft，README 仍停留在 Astro starter 範本，About 頁還有「之後再細修」的語氣，週報與 Dashboard 的內容邊界需要更清楚，文獻功能也同時出現 Literature、Papers、Paper Lens 等不同名稱。這些發現讓我知道，網站不是缺更多按鈕，而是需要更清楚的資料邊界和命名方式。

# 第二步：安全整理既有內容

接著我先做一批比較安全的整理。這一輪的原則是只處理可以明確判斷的內容，不任意刪除歷史資料，也不補寫沒有來源的研究成果。

我把 RSS 調整成不會公開 draft，避免未來草稿意外進入訂閱；把 README 改成符合目前研究管理網站的說明；整理 About 頁，讓它比較像正式網站介紹；也把疑似貼錯正文的 VASP 文章先標成草稿，避免讀者看到 metadata 和內容不一致的文章。對於週報、Header 命名、文獻功能定位這些需要人工判斷的項目，則另外保留 follow-up 文件，不在同一輪直接重構。

# 第三步：建立 Conversation Journal Pipeline v1

內容整理完成後，我開始建立 Conversation Journal Pipeline v1。它的目的不是取代人工寫作，而是把分散在 Codex 任務或人工整理的 ChatGPT 對話摘要，轉換成可以檢查的研究日誌與週報草稿。

目前的流程是：

```text
Codex 或人工整理的對話摘要
-> 結構化 handoff
-> 格式與安全檢查
-> Blog 草稿
-> 週報草稿
-> 人工審核
-> 正式發布
```

v1 有幾個重要限制。它不使用 OpenAI API，不會自動讀取 ChatGPT 歷史，也不會自己理解任意原始對話。只有放進 `journal-inbox/pending/`、且符合 template 的 handoff 才會被處理。自動產生的 Blog 一律先是 draft，週報也只會寫入 generated weekly draft，不會直接改正式週報。

# 第四步：安全性與穩定性強化

在實作過程中，我發現 pipeline 真正困難的地方不是把文字寫成 Markdown，而是要避免錯誤寫入、重複處理和意外公開。

因此我把 frontmatter 解析改成 `js-yaml`，避免冒號、陣列、引號和時區字串造成解析問題。產生檔案前會限制 pending、processed 和 generated 的根目錄，避免 `../` 之類的路徑穿越。每份 handoff 會用 conversation id 和 SHA-256 content hash 記錄到 `processed.json`，避免同一份內容被重複轉換。若遇到同名 slug，也不會覆蓋既有草稿。

JSON 寫入則改成暫存檔加 rename，降低寫到一半導致資料損壞的風險。週報週次依 handoff 的 `createdAt` 計算 ISO week，而不是用簡單的日期除法，這樣跨年時比較不容易出錯。敏感資訊檢查只作為初步防線；如果偵測到可疑內容，錯誤訊息不會輸出完整秘密。

# 第五步：測試方式

這次我也替 pipeline 補上 Node.js 內建 `node:test` 測試，讓它能在暫存資料夾中驗證主要流程，而不是直接碰正式 inbox。測試範圍包含 handoff 格式驗證、缺少必要欄位、無效 source 與 privacy、private 內容跳過、疑似敏感資訊阻擋、dry-run 零寫入、重複 id 與 hash、同名 slug、Blog draft frontmatter、週報合併與去重、ISO week 跨年，以及中途失敗時不提前移動來源。

第一次真實 handoff 測試也已經完成。它用近期內容審計、內容整理、Pipeline v1 與安全強化的工作紀錄，產生了一篇 Blog 草稿與 `2026-W32` 週報草稿。測試結果讓我確認 v1 可以完成端到端流程，但自動文章仍偏工作清單式，需要人工改寫後才適合公開。

# 目前的使用方式

我現在比較適合用這套流程處理「有實質成果的一段開發或研究討論」。日常流程會是：完成一次 Codex 或 ChatGPT 討論後，先整理成 handoff，執行 `journal:validate` 檢查格式，再用 `journal:dry-run` 預覽結果。如果內容合理，再執行 `journal:generate` 產生草稿。最後仍要人工檢查 Blog 與週報草稿，確認沒有敏感資訊、沒有捏造結果，才把文章發布或合併進正式週報。

# 目前限制

這一版仍然是半自動流程。ChatGPT 對話需要人工整理成 handoff，文章品質也需要人工審查。週報草稿不會自動變成正式週報，仍要人工合併。敏感資訊偵測只能作為初步防線，不能保證百分之百安全。v1 也尚未加入 OpenAI API，沒有 GitHub Action 自動建立草稿 PR。

這些限制反而讓我比較放心，因為研究紀錄要能累積，也要能控制風險。現在的版本先確保資料來源明確、草稿不會直接公開、正式週報不會被腳本任意改寫。

# 下一步

接下來我會先持續使用 v1 累積幾次研究紀錄，觀察生成文章是否太像工作清單，以及週報草稿是否真的能減少整理時間。等流程穩定後，再考慮改善 handoff 的內容品質、建立更方便的草稿審核流程，或評估用 GitHub Action 自動建立草稿 PR。至於 OpenAI API 或更進階的語意整理，應該等目前的半自動流程足夠穩定後再進入 v2。
