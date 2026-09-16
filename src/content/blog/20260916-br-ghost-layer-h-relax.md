---
title: "Br 中性 Ghost-layer 模型：H-relax 提交驗證與排程除錯"
description: "記錄 Br 中性 organic／inorganic ghost-layer 模型進入 H-relax 階段後的提交狀況，區分尚未送出、排程等待與立即失敗，並建立一次只驗證一個工作的除錯流程。"
pubDate: "2026-09-16"
category: "計算化學"
tags:
  - "2D 鈣鈦礦"
  - "Ghost layer"
  - "VASP"
  - "HPC"
  - "SLURM"
  - "結構最佳化"
  - "DFT"
draft: false
showToc: true
---

Br 中性分層模型已從組成與質子轉移設計階段，推進到 organic／inorganic 子模型的 H-relax 測試。不過，本次提交後在 SLURM 佇列中沒有看到工作，也沒有留下可確認的 job ID。因此，目前只能確認「佇列中沒有工作」，不能據此判定計算已成功完成或模型本身有問題。

本篇整理目前能確定的狀態、排程判讀上的限制，以及下一次提交應採用的最小驗證流程。

## 1. 已完成與確認的結果

### 1.1 已建立 H-relax 計算階段

目前 Br neutralized ghost-layer 工作已拆分為兩個計算方向：

- **Organic H-relax**：處理有機層去質子化後的幾何調整。
- **Inorganic H-relax**：處理加入質子後的 Pb–I 無機層幾何調整。

這個階段的目標是先讓轉移後的 H 與周圍原子得到合理的局部幾何，再進入後續介電計算。它不代表 full／organic／inorganic 三組介電結果已經完成。

### 1.2 目前排程中沒有可見工作

提交嘗試後，使用者佇列未顯示 organic 或 inorganic 工作；同時也沒有取得可核對的：

```text
Submitted batch job <job_id>
```

因此，目前尚未建立「工作確實被 SLURM 接收」的證據。

## 2. 解讀：空佇列不等於計算成功

`squeue` 沒有顯示工作，可能對應多種情況：

1. `sbatch` 指令沒有成功送達排程器。
2. 提交時發生通訊逾時，工作是否被接收仍不明。
3. 工作已被接收，但在極短時間內失敗或結束。
4. 工作完成後已離開 `squeue`，需要改查 job／slurm 輸出或 accounting 記錄。

所以不能僅以「佇列是空的」判斷 H-relax 已完成，也不能直接把問題歸因於模型、INCAR 或 VASP。

## 3. 為什麼改成一次只提交一個模型

下一輪先只測 `Br_organic_Hrelax`，暫不提交 inorganic。這樣可以把排程問題與模型問題分開：

- 若連 job ID 都沒有，優先檢查提交指令、腳本權限與排程器連線。
- 若取得 job ID 後立即結束，再查看 slurm 輸出與 VASP 錯誤。
- 若 organic 能正常排程，才用相同方式提交 inorganic，減少兩個模型同時失敗時的混淆。

這是提交層級的除錯策略，不表示 organic 模型在科學上比 inorganic 模型更重要。

## 4. 限制與尚未確認事項

目前仍未確認：

- Organic H-relax 是否曾被 SLURM 接收。
- 是否已產生 job／slurm 輸出檔。
- 工作若曾啟動，是正常結束、VASP 初始化失敗，還是因資源或腳本設定退出。
- H-relax 後的鍵長、質子位置與總能量是否合理。
- Organic 成功後，inorganic 模型是否能沿用完全相同的提交設定。

本次沒有新的結構或能量結果，因此尚不能討論 H-relax 的物理合理性。

## 5. 下一步：完成單一工作的可驗證提交

先檢查兩個資料夾是否已有舊的 job 輸出：

```bash
ls Br_organic_Hrelax/job-* Br_inorganic_Hrelax/job-*
```

若沒有既有輸出，只提交 organic：

```bash
(cd Br_organic_Hrelax && sbatch sub.sh)
```

接著立即記錄 `sbatch` 回傳的 job ID，並查詢：

```bash
squeue -u "$USER"
```

若工作很快離開佇列，應檢查對應的 job／slurm 輸出；若系統支援 accounting，也可用 job ID 查詢最終狀態與 exit code。

這一步的完成標準不是「H-relax 已收斂」，而是：

1. 取得明確的 job ID。
2. 確認工作曾進入排程或留下可追蹤的結束狀態。
3. 若失敗，取得足以定位問題的錯誤輸出。

完成這三點後，再決定是否修正 organic 設定，或開始提交 inorganic 模型。
