---
id: conversation-20260903-mace-practice-ii
createdAt: "2026-09-04T03:38:28+08:00"
source: "codex"
sourceTitle: "整理 MACE Practice II Section 3.1–3.3 學習紀錄"
topics:
  - "MACE"
  - "MACE-MP-0"
  - "MLIP"
  - "Fine-tuning"
  - "XTB"
  - "RDF"
  - "分子動力學"
  - "計算化學"
privacy: "public-safe"
createJournal: false
updateWeekly: true
---

## 對話摘要

將 2026-09-03 在 Google Colab 完成的 MACE Practice II Section 3.1–3.3 整理成正式網站文章，聚焦 foundation model MD、XTB RDF reference、standard fine-tuning、Stage 1／SWA 指標與三模型 RDF 比較。依使用者要求，不收錄程式無法運行等除錯過程。

## 本次目標

- 將 MACE Practice II 的練習內容新增到 Kai Research Log。
- 延續既有 MACE Practice I 的文章格式、分類與標籤。
- 放入 fine-tuning metrics 與六組 RDF 比較圖。
- 清楚區分 numerical stability、structural stability 與 reference accuracy。

## 完成事項

- 新增一篇日期為 2026-09-03 的 MACE Practice II 正式文章。
- 整理 MACE-MP-0 small、Langevin MD、RDF、standard fine-tuning 與 SWA 的設定。
- 整理 Stage 1／Stage 2 的 train、validation、test energy 與 force RMSE。
- 分析 XTB、原始 MACE-MP-0 與 fine-tuned MACE 的六組 intramolecular RDF。
- 納入兩張使用者實際執行結果圖，並提供替代文字與判讀限制。

## 化學／計算化學內容

- 使用 12 原子的 C3H6O3 single molecule，在 1200 K 進行 2 ps Langevin MD。
- MACE-MP-0 trajectory 數值穩定，追蹤的 C–O 與 C–H bonds 沒有不可逆斷裂。
- XTB 與 MACE-MP-0 的 OO RDF 主峰位置接近，但原始 MACE-MP-0 較寬且略右移。
- Standard fine-tuning 使用 50 個 molecular configurations、H/C/O isolated references 與 1000 個 test configurations。
- SWA 明顯改善 energy RMSE，但沒有同步改善 test force RMSE。
- Fine-tuned MACE 的 CO 與 OO RDF 明顯接近 XTB；改善並非對所有 atom pairs 都一致。
- XTB 在此是 tutorial reference，不應被描述為實驗真值或普遍較高階方法。

## 網頁開發內容

- 沿用 Astro Content Collection frontmatter 與 `/public/blog/<slug>/` 圖片路徑。
- 新文章設為 `draft: false` 並開啟 `showToc`。
- 圖片使用 PNG 原始結果，不加入不相關的 Pb／Sn 晶體結構圖。

## 重要決策

- 文章只涵蓋本次已完成並討論的 Section 3.1–3.3，不把錯誤排查寫入公開內容。
- 將「MD 可完整執行」描述為 numerical stability，不延伸成模型準確性的證明。
- 絕對能量差異歸因於 atomic reference zero 不同，不做跨模型的直接物理解讀。
- handoff 設定 `createJournal: false`，避免 pipeline 重複產生文章；保留 `updateWeekly: true`。

## 遇到的問題

- 工作區同時保留 MACE 練習圖與另一條 Pb／Sn 研究線的結構圖，需要確認文章圖片範圍。
- 訓練輸出圖包含完整 Colab log，需要在文章內搭配整理後的數值表，避免讀者只依截圖判讀。

## 解決方式

- 只選用 fine-tuning metrics 與最終六組 RDF 圖；排除不屬於本篇主題的晶體圖。
- 另以 Markdown table 重列 Stage 1 與 Stage 2 指標，並在內文說明 energy 與 force metrics 的差異。

## 修改的檔案

- `src/content/blog/20260903-mace-practice-ii.md`
- `public/blog/20260903-mace-practice-ii/01-finetuning-metrics.png`
- `public/blog/20260903-mace-practice-ii/02-rdf-comparison.png`
- `journal-inbox/pending/2026-09-03-mace-practice-ii.md`

## 待確認事項

- 後續是否執行 multi-head fine-tuning，並與 standard approach 做同條件比較。
- 是否延長 trajectory 或增加 random seeds，以確認 RDF 差異的統計穩健性。

## 下一步

- 檢查 GitHub commit 與 Cloudflare 部署狀態。
- 視學習安排進行 multi-head fine-tuning，或開始 MACE Theory。
- 若套用到自己的材料，先建立收斂且物理定義清楚的 DFT reference dataset。
