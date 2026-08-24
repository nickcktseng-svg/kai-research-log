---
id: conversation-20260824-mace-practice-i-journal
createdAt: "2026-08-24T11:54:30+08:00"
source: "codex"
sourceTitle: "整理 MACE Practice I 學習日誌"
topics:
  - "MACE"
  - "MLIP"
  - "ASE"
  - "XTB"
  - "分子動力學"
  - "計算化學"
privacy: "needs-review"
createJournal: false
updateWeekly: true
---

## 對話摘要

將使用者提供的 MACE Practice I Markdown、Jupyter Notebook 與六頁手寫筆記整理成網站研究日誌。文章日期設定為 2026 年 8 月 14 日，並補充程式碼用途、資料流、模型訓練、測試與分子動力學的閱讀說明。

## 本次目標

- 將 MACE Practice I 學習內容發布到研究日誌。
- 把手寫筆記放入相對應的技術章節並加上解讀。
- 擴充 Notebook 程式碼的用途、輸入輸出與注意事項。
- 提供可點擊的文章章節快速導覽。

## 完成事項

- 新增一篇日期為 2026-08-14 的 MACE Practice I 正式文章。
- 新增 MACE、MLIP、機器學習勢能、ASE、XTB、GFN2-xTB、分子動力學、Python 與計算化學標籤。
- 將六張 HEIC 手寫筆記轉為適合網頁顯示的 JPEG，依序放入資料、標記、模型參數、最佳化、訓練與測試章節。
- 補充 Jupyter 指令、ASE 資料欄位、XTB labels、MACE CLI 包裝、checkpoint、RMSE、MD callback 與 RDF 程式碼說明。
- 將公式改成網站現有 Markdown 可穩定顯示的文字公式。
- 確認文章出現在 Blog 列表，快速導覽、圖片與手機版顯示正常。

## 化學／計算化學內容

- 整理六種碳酸酯分子的 molecular configurations 與資料多樣性。
- 說明 GFN2-xTB reference energies、forces 與 isolated atom energies。
- 說明 MACE model parameters、training/validation/test、RMSE 與 force decomposition。
- 整理 Langevin MD、RDF 與 cluster-to-liquid transferability 的學習重點。
- 沒有新增或宣稱新的未公開研究結果。

## 網頁開發內容

- 使用既有 Astro Content Collection frontmatter 與 BlogPost 章節導覽。
- 將 HEIC 筆記轉成 sRGB JPEG，加入描述性替代文字。
- 在 390px viewport 檢查文章沒有橫向溢出，六張圖片均成功載入。

## 重要決策

- 文章直接整理為正式內容，`draft` 設為 `false`。
- handoff 的 `createJournal` 設為 `false`，避免 Pipeline 再產生重複日誌。
- handoff 保留 `updateWeekly: true`，供後續週報草稿整理本次完成事項。
- 不公開上傳原始 Notebook，只擷取並解釋與文章相關的程式碼。

## 遇到的問題

- 一般 HEIC 轉檔得到全黑預覽，需要使用 macOS Quick Look 正確解碼後再轉成 JPEG。
- 專案沒有數學公式渲染套件，原稿的 LaTeX 語法無法保證正常顯示。
- Astro build 在受限沙盒中因本機字型處理需要 listen 權限而出現 `EPERM`。

## 解決方式

- 先用 Quick Look 產生正確的 16-bit PNG，再轉成壓縮後的 sRGB JPEG。
- 將公式改成可讀的 `text` code block 與 inline code，避免錯誤色塊。
- 允許 build 使用必要的本機監聽後重新執行，完整建置成功。

## 修改的檔案

- `src/content/blog/20260814-mace-practice-i.md`
- `public/blog/20260814-mace-practice-i/01-data-configurations.jpg`
- `public/blog/20260814-mace-practice-i/02-reference-labels.jpg`
- `public/blog/20260814-mace-practice-i/03-model-parameters.jpg`
- `public/blog/20260814-mace-practice-i/04-optimization-parameters.jpg`
- `public/blog/20260814-mace-practice-i/05-training-workflow.jpg`
- `public/blog/20260814-mace-practice-i/06-testing-and-force-decomposition.jpg`
- `journal-inbox/pending/2026-08-24-mace-practice-i-journal.md`

## 待確認事項

- 使用者可人工閱讀文章，確認技術用語與手寫筆記解讀是否符合當時的學習脈絡。
- Notebook 教學中的預先快取檔案與 trajectory 命名，實際重跑時仍需要依本機資料確認。

## 下一步

- 建立 Pull Request 並由使用者確認是否合併發布。
- 未來進行 Practice II 時，可接續整理 active learning、failure configurations 與 iterative training。
