---
title: "論文題目探索紀錄：從 MACE 到鹵化物鈣鈦礦離子遷移"
description: "整理論文題目從 rare-earth-doped CsPbBr3、GeTe 備案，到 Pb／Sn／Ge 的 B-site chemistry 與 Br vacancy migration 研究主線，並規劃 DFT、NEB、MACE 與有限溫度分子動力學的分階段驗證。"
pubDate: "2026-08-29"
category: "計算化學"
tags:
  - "論文題目"
  - "研究規劃"
  - "鹵化物鈣鈦礦"
  - "CsPbBr3"
  - "CsSnBr3"
  - "CsGeBr3"
  - "Br vacancy"
  - "離子遷移"
  - "DFT"
  - "NEB"
  - "MACE"
  - "MLIP"
  - "分子動力學"
draft: false
showToc: true
---

這篇日誌整理近期論文題目討論的發展脈絡。題目並不是一次就確定，而是在材料意義、文獻重疊、缺陷模型複雜度與一年左右的研究可行性之間反覆比較，才逐漸收斂出目前的方向。

目前的暫定主線是：

> **先以 CsPbBr3 與 CsSnBr3 為基礎，用小型 DFT／NEB 找出值得 MLIP 深入回答的問題；若結果與方法建立成功，再延伸至 CsGeBr3，研究 Pb–Sn–Ge 的 B-site chemistry 對 Br-vacancy migration mechanism 的影響。**

**整理日期：** 2026 年 8 月 29 日  
**目前狀態：** 題目探索與研究規劃，尚不是已完成的計算結果

---

## 1. 起點：讓 MACE 回答真正的研究問題

討論最初從「如何把目前正在學的 MACE／MLIP 放進真正的研究題目」出發。

核心目標不是只做靜態 DFT，而是先用 DFT 產生 energy 與 force reference data，讓 MLIP 學習近似的 potential energy surface，再進一步執行較長時間尺度的 molecular dynamics（MD），觀察有限溫度下的原子動態。

因此，一開始就保留了兩條互相對照的方法主線：

- **Static calculation：** 用 DFT／NEB 分析 migration barrier。
- **Finite-temperature dynamics：** 用 MLIP-MD 觀察實際 hopping、diffusion 與局部結構變化。

最終希望比較：

> 靜態能障的預測，是否能解釋有限溫度下真正發生的離子遷移行為？

這個問題也成為後續不同題目版本中持續不變的核心。

---

## 2. 第一版方向：摻雜 CsPbBr3 的 Br vacancy migration

第一個較完整的構想，是研究 **B-site dopant 是否會影響 CsPbBr3 中由 Br vacancy 介導的離子遷移**。

當時規劃的流程包含：

1. 建立 pristine 與 doped CsPbBr3。
2. 建立 Br vacancy。
3. 用 CI-NEB 比較 static migration barrier。
4. 利用 DFT reference data 訓練或 fine-tune MACE。
5. 執行較長時間的 finite-temperature MD。
6. 分析 Br hopping、MSD、diffusion coefficient 與局部結構變化。

在 dopant 的選擇上，曾特別考慮 Nd、Sm、Gd 等 rare-earth elements。這個版本想回答的不只是 dopant 是否提高 migration barrier，而是：

> Static NEB 預測的 migration suppression，在有限溫度下是否仍然成立？

如果 NEB 與 MD 的趨勢不同，可能需要進一步檢查 lattice fluctuation、alternative pathway 或 cooperative motion 等有限溫度效應。

---

## 3. 第一版的問題：文獻重疊與缺陷複雜度

繼續整理文獻方向後，發現 rare-earth-doped CsPbBr3 的 Br-vacancy migration 已有相近的 static DFT／CI-NEB 工作。若只重做類似的能障比較，題目的新意可能不足。

此外，異價摻雜也會帶來額外變因：

- Pb2+ 被 M3+ 取代後的 charge compensation。
- Dopant 與 vacancy 的相對位置。
- Defect charge state。
- 不同 local configuration。

這使問題從單純的 migration comparison，擴大成多種缺陷組態與電荷平衡的組合。若希望在一年左右逐步完成研究，必須重新評估題目是否能被清楚拆解與驗證。

因此，研究方向開始從「dopant effect」轉向變因較乾淨的「B-site chemistry comparison」。

---

## 4. 支線探索：GeTe 與 phase-change materials

尋找替代方向時，也曾跳出 halide perovskite，考慮 GeTe／Ge–Sb–Te 等 **phase-change semiconductor**。

MLIP-MD 對 phase-change materials 很重要，因為相關研究常需要觀察：

- Crystal 到 liquid 的轉變。
- Quenching 後形成 amorphous structure。
- Nucleation。
- Crystal growth。
- Crystallization kinetics。

這些現象涉及大量原子的重新排列，也需要比一般 AIMD 更大的 system size 與更長的 timescale。

不過，pure GeTe crystallization、nanoconfinement、Ge-rich GeTe，以及 C／N doping 等方向已有不少 MLIP 或 MD 研究。如果沿這條線前進，仍需要先找出更明確的材料改質問題或 mechanism gap。

GeS2-modified GeTe、GeSe2-modified GeTe 等構想曾被短暫討論，但目前先保留為備案，沒有成為主要研究主線。

---

## 5. 方向轉折：從摻雜改為 Pb／Sn 比較

後來研究思路轉向比較：

> **CsPbBr3 與 CsSnBr3 的 Br-vacancy migration。**

這個轉折有兩個主要理由：

- Sn-based halide perovskite 是常見的 lead-free strategy。
- Pb2+ 與 Sn2+ 都是同價 B-site cation，相較於以 M3+ 取代 Pb2+，比較時可以減少 charge compensation 等額外變因。

研究問題因此從「某個 dopant 能否抑制 migration」，轉為：

> 當 B-site chemistry 從 Pb 變成 Sn 時，Br-vacancy migration 的 static barrier 與 finite-temperature dynamics 會如何改變？

這是一個較適合做 controlled comparison 的起點。

---

## 6. Pb／Sn 題目的文獻重疊與研究缺口

目前的文獻探索顯示，Pb／Sn 相關工作已分別涵蓋一些相近區塊：

- Sn-based perovskite 的 ion migration 傾向。
- CsSnBr3 intrinsic defect 與 defect diffusion 的 DFT 研究。
- CsPbBr3 的 machine-learning force field 與 long-time Br migration MD。
- Pb／Sn halide perovskite 的 lattice dynamics、octahedral tilting 與 dynamic disorder 比較。
- CsSnBr3 的 MACE-based finite-temperature structural dynamics。

因此，如果只得到「Sn 的 migration barrier 比 Pb 高」或「Sn 的 hopping 比 Pb 少」，可能只是再次驗證既有趨勢。

目前較值得追蹤的研究空間，是把以下項目放進同一套比較框架：

1. CsPbBr3 加上 Br vacancy。
2. CsSnBr3 加上 Br vacancy。
3. Static DFT／NEB migration barrier。
4. Long-time finite-temperature MLIP-MD。
5. Actual Br hopping／diffusion。
6. Local lattice response。

核心問題可以進一步縮成：

> **Static barrier 的差異，是否真的足以解釋 finite-temperature hopping behavior？**

這仍是根據目前討論形成的研究假設；後續需要更完整的文獻表與實際計算確認。

---

## 7. 從結果比較走向 migration mechanism

即使最後觀察到 CsSnBr3 的 NEB barrier 較高、Br hopping 較少，故事仍不能只停在材料排序。

因此，討論中加入了 mechanism analysis：

- Pb–Br 與 Sn–Br 的 local bonding。
- PbBr6 與 SnBr6 的 octahedral distortion。
- Hopping 前後的 bond-length／bond-angle 變化。
- Finite-temperature lattice fluctuation。
- Vacancy 周圍的 local atomic rearrangement。

這些分析不是另開一個新的 lattice-dynamics 題目，而是用來回答：

> **B-site 元素在局部結構與動態上造成了什麼改變，進而影響 Br migration？**

目前的研究邏輯因此形成三層：

| 層次 | 核心問題 | 可能方法 |
| --- | --- | --- |
| Static difference | Pb／Sn 的 migration barrier 是否不同？ | DFT、CI-NEB |
| Dynamic difference | 有限溫度下的 hopping／diffusion 是否不同？ | MLIP-MD、MSD、trajectory analysis |
| Mechanism | 哪些 B–Br chemistry 與 octahedral dynamics 可以解釋差異？ | Bond、angle、local distortion 與 hopping event analysis |

---

## 8. 後續延伸：Ge 與 Sn–Ge mixed systems

由於 Pb 到 Sn 的比較具有 lead-free 背景，後續也開始思考是否能加入同族 B-site 元素。最自然的下一個候選是 **Ge**。

探索範圍包含：

- CsGeBr3。
- CsSnxGe1-xBr3。
- Sn／Ge mixed B-site perovskites。

目前的初步整理顯示，Sn–Ge mixed systems 已有合成、結構、phase behavior、band gap、local chemistry 與 finite-temperature structural dynamics 等相關研究；但是否已有人完整串連 composition、Br-vacancy migration、NEB 與 long-time MLIP-MD，仍需要後續系統性查證。

Mixed system 也會增加模型複雜度：

- Sn／Ge 可能形成多種 local arrangement。
- 同一 composition 需要考慮多個 configurations。
- Vacancy 周圍可能出現 Sn–Sn、Sn–Ge、Ge–Ge 等不同 local environment。
- Phase behavior 可能隨 composition 改變。

因此，現階段不把 Sn–Ge alloy 納入第一階段，而是先將 CsGeBr3 視為 Pb／Sn 方法成熟後的延伸。

---

## 9. 收斂出的長期研究主題

目前最清楚的長期方向可以整理為：

> **Pb vs Sn vs Ge：B-site chemistry × Br-vacancy migration mechanism**

目標不只是比較哪個材料的 migration 較快，而是理解：

> B-site 元素從 Pb 到 Sn 再到 Ge 時，B–Br bonding、local structure、lattice dynamics 與 migration energy landscape 如何共同改變，最後如何影響 Br-vacancy migration mechanism？

相較於單純的 Pb／Sn 數值比較，這個方向多了一條可被驗證的 chemical trend。不過，Ge 是否適合直接納入同一比較框架，仍要等 Pb／Sn 的模型、相態與 defect definition 釐清後再決定。

---

## 10. 研究策略：先做小型 DFT，再決定 MLIP 問題

目前最重要的策略是：

> **先用小型 DFT 確認真正值得由 MLIP 回答的問題。**

不應一開始就大量建立 dataset、訓練 MACE、執行長時間 MD，最後才回頭追問 trajectory 能回答什麼。

較合理的順序是：

1. 閱讀核心論文，整理 Pb／Sn 材料與 migration literature。
2. 建立小型 CsPbBr3／CsSnBr3 模型。
3. 比較基本 relaxed structure。
4. 建立 Br vacancy。
5. 檢查 vacancy 周圍的 local relaxation。
6. 選擇一條主要 Br hopping path 做初步 NEB。
7. 根據 static DFT／NEB 結果，決定 MLIP-MD 最值得回答的 finite-temperature question。

### 情況 A：Sn 的 static barrier 明顯高於 Pb

後續 MLIP 可以檢查：

> 這個 static difference 在 finite-temperature hopping 中是否仍然成立？

### 情況 B：Static barrier 接近，但 dynamics 不同

若 Pb／Sn 的 static barrier 差異不大，而實驗或文獻暗示 dynamics 不同，MLIP 的價值會更明確：

> Finite-temperature lattice dynamics 是否才是差異的主要來源？

### 情況 C：Phase 或 defect model 出現複雜問題

如果相態、缺陷電荷或模型大小本身尚未收斂，應先處理材料模型與計算定義，不急著進入大規模 MLIP。

---

## 11. MLIP 在題目中的角色

在這個研究中，MLIP 是連接 DFT 精度與較長時間尺度動力學的工具，而不是研究終點。

概念流程為：

```text
DFT reference data
-> MACE training / fine-tuning
-> validation
-> long-time finite-temperature MD
-> Br hopping / MSD / diffusion analysis
-> local structure / migration mechanism analysis
```

Training data 不能只包含 equilibrium structures，還需要合理涵蓋：

- Thermal-distorted structures。
- Br vacancy structures。
- NEB／migration-region configurations。
- Hopping 附近的 high-energy local environments。

真正發生 hopping 時的 configuration，往往正是模型最需要可靠描述、也最容易因資料不足而 extrapolate 的區域。因此，後續除了整體 energy／force error，也需要針對 defect 與 migration region 做 validation。

---

## 12. 分階段執行規劃

### Stage 0：Literature／background

目標：

- 了解 CsPbBr3／CsSnBr3 的結構與基本材料差異。
- 了解 Br-vacancy-mediated migration。
- 整理 Pb／Sn ion migration 文獻已完成的範圍。
- 了解既有工作如何搭配 DFT-NEB 與 MLIP-MD。
- 找出真正值得用 MLIP 回答的 gap。

### Stage 1：Small-scale DFT

先進行：

- Pb vs Sn basic structure。
- Br vacancy model。
- Local relaxation。
- Preliminary migration path／NEB。

目的不是立即完成整個研究，而是確認 Pb 到 Sn 的變化是否產生值得深入追蹤的現象。

### Stage 2：MLIP／finite-temperature dynamics

若 Stage 1 出現明確問題，再進一步：

- 建立 DFT training data。
- Train／fine-tune MACE。
- 執行 long-time MD。
- 分析 hopping／diffusion。
- 比較 static NEB 與 finite-temperature dynamics。

### Stage 3：Ge extension

如果 Pb／Sn 的方法與 mechanism 已建立，再加入 CsGeBr3，將主題延伸為：

> **Pb vs Sn vs Ge：B-site chemistry × migration mechanism**

Sn–Ge mixed systems 暫時放在更後面的可能延伸，不作為初期必要工作。

---

## 13. 本階段結論與下一步

這次題目探索從 rare-earth-doped CsPbBr3，經過 GeTe／phase-change materials 的支線，再轉向較乾淨的 Pb／Sn comparison，最後形成 Pb 到 Sn 再到 Ge 的 B-site chemistry 主軸。

最重要的進展不是找到一個完全沒有人研究過的材料，而是把問題整理成可分階段驗證的形式：

> **材料 chemistry 的改變會如何改變 migration energy landscape？Static DFT 所看到的差異，是否真的能解釋 finite-temperature ion dynamics？**

接下來不急著繼續加入更多材料，而是先完成以下工作：

1. 建立核心文獻表，分開記錄材料、缺陷模型、計算方法與主要結論。
2. 確認 CsPbBr3／CsSnBr3 的相態、supercell、Br vacancy 與 charge state 定義。
3. 建立可重現的 pristine／defect relaxation 流程。
4. 選定一條可比較的 Br hopping path，先完成 preliminary NEB。
5. 依初步結果定義 MLIP-MD 的明確問題與 validation criteria。

目前的暫定題目，可以簡化成一句話：

> **先用小型 DFT／NEB 建立 CsPbBr3 與 CsSnBr3 的可比較基礎，再以 MACE-MD 檢查靜態能障能否解釋有限溫度下的 Br-vacancy migration；方法成熟後再評估延伸至 CsGeBr3。**
