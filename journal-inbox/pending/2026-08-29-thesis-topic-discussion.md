---
id: conversation-20260829-thesis-topic-discussion
createdAt: "2026-08-29T02:51:28+08:00"
source: "codex"
sourceTitle: "整理論文題目討論脈絡並發布研究日誌"
topics:
  - "計算化學"
  - "鹵化物鈣鈦礦"
  - "DFT"
  - "NEB"
  - "MACE"
  - "MLIP"
  - "研究規劃"
privacy: "needs-review"
createJournal: false
updateWeekly: true
---

## 對話摘要

將近期論文題目討論整理為網站研究日誌。內容從 rare-earth-doped CsPbBr3、GeTe 備案，逐步收斂到 CsPbBr3／CsSnBr3 的 Br-vacancy migration 比較，並把 CsGeBr3 保留為後續延伸。

## 本次目標

- 將使用者提供的題目討論稿整理為正式研究日誌。
- 建立清楚的章節結構與快速導覽。
- 依材料、缺陷與計算方法設定分類及標籤。
- 明確區分研究規劃、文獻印象與已完成計算結果。

## 完成事項

- 新增 2026 年 8 月 29 日的論文題目探索日誌。
- 整理題目從摻雜效應到 B-site chemistry comparison 的轉折。
- 將研究問題分為 static difference、dynamic difference 與 mechanism 三層。
- 整理 Stage 0 至 Stage 3 的分階段執行策略。
- 設定計算化學分類與 DFT、NEB、MACE、MLIP、Br vacancy 等標籤。

## 化學／計算化學內容

- 暫定以 CsPbBr3／CsSnBr3 的 Br-vacancy migration 作為第一階段主線。
- 先以 small-scale DFT、defect relaxation 與 preliminary NEB 確認研究問題，再決定 MLIP-MD 的範圍。
- 後續可評估 CsGeBr3，建立 Pb／Sn／Ge 的 B-site chemistry trend。
- Sn–Ge mixed systems 因局部組態與相態複雜度較高，暫不列為初期必要工作。

## 網頁開發內容

- 使用既有 Blog Content Collection frontmatter。
- 啟用 `showToc: true`，由 BlogPost layout 產生章節快速導覽。
- 不修改既有頁面、元件或資料結構。

## 重要決策

- 文章以「題目探索與研究規劃」呈現，不將討論中的假設寫成計算結果。
- 分類使用「計算化學」。
- 文章已由人工來源整理，因此 Pipeline 不再重複產生日誌，只更新週報草稿候選。

## 遇到的問題

- 原稿包含文獻探索後的初步判斷，但沒有完整 reference list。
- 題目曾跨越多種材料系統，需要避免讓主線與備案混在一起。

## 解決方式

- 對尚待查證的文獻缺口使用保守措辭，並註明需要後續系統性確認。
- 將 CsPbBr3／CsSnBr3 設為近期主線，Ge 與 phase-change materials 分別標示為延伸與備案。

## 修改的檔案

- `src/content/blog/20260829-thesis-topic-discussion.md`
- `journal-inbox/pending/2026-08-29-thesis-topic-discussion.md`

## 待確認事項

- 後續需補齊核心文獻表與逐篇 reference。
- 需確認材料相態、supercell、Br vacancy charge state 與 NEB path 的一致定義。
- Ge 是否納入同一研究框架，應等待 Pb／Sn 第一階段結果後決定。

## 下一步

- 建立 Pb／Sn ion migration 核心文獻比較表。
- 建立 CsPbBr3／CsSnBr3 的小型 DFT 模型。
- 比較 pristine 與 Br vacancy 周圍的 local relaxation。
- 選定初步 Br hopping path 並執行 NEB。
