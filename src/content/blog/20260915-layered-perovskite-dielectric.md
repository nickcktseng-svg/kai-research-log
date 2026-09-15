---
title: "2D Pb–I 鈣鈦礦介電計算：分層模型、PL 取值與收斂判讀"
description: "整理 Br／Cl 取代 2D Pb–I 鈣鈦礦的 total、organic、inorganic 介電模型，釐清 LOPTICS 頻譜取值、ghost-layer 中性化方式，以及現有 PL 資料的適用限制。"
pubDate: "2026-09-15"
category: "計算化學"
tags:
  - "2D 鈣鈦礦"
  - "PbI4"
  - "介電常數"
  - "介電張量"
  - "VASP"
  - "LOPTICS"
  - "K 點收斂"
  - "Ghost layer"
  - "DFT"
  - "PL 光譜"
draft: false
showToc: true
---

這篇日誌整理 Br／Cl 取代 2D Pb–I 鈣鈦礦介電計算的最新判讀。這一輪最重要的進展，不是新增一組計算數字，而是重新核對主文、Supporting Information（SI）與老師提供的 CIF 後，修正了兩個會直接影響後續工作的假設：

1. 論文比較的介電值取自**實驗發光能量所對應的頻率**，不能只報告零頻率極限。
2. 2019 年論文的 neutralized ghost-layer model 不是單純刪除另一層，而包含有機層去質子化與無機層質子化。

這兩點決定了模型該怎麼建立，以及最後應從 VASP 頻譜的哪個能量位置取值。

## 1. 已完成與確認的結果

### 1.1 兩個結構都是有機取代的 Pb–I 系統

老師提供的兩份結構為：

- (rmathrm{MBrThMA}_2mathrm{PbI}_4)
- (rmathrm{MClThMA}_2mathrm{PbI}_4)

檢查 CIF 的元素與鍵結後，可確認 Br／Cl 是接在有機分子上的取代基，不是無機骨架中的鹵素。兩個系統的無機層均為 Pb–I。

每個完整晶胞共有 82 個原子，可先拆成以下兩部分：

| 模型 | Br 系統 | Cl 系統 |
|---|---|---|
| Full | 完整有機層＋Pb–I 層，82 原子 | 完整有機層＋Pb–I 層，82 原子 |
| Organic，未中性化 | C₂₄H₃₆Br₄N₄S₄，72 原子 | C₂₄H₃₆Cl₄N₄S₄，72 原子 |
| Inorganic，未中性化 | Pb₂I₈，10 原子 | Pb₂I₈，10 原子 |

因此，建立 organic model 時必須保留 Br／Cl；不能因為它們是鹵素元素，就把它們歸入 inorganic model。

兩個材料的 inorganic model 雖然化學組成相同，但其原子幾何來自各自最佳化後的完整結構，因此仍應分開計算，不應直接共用同一份結果。

### 1.2 Br 的完整結構電子介電張量

Br full model 使用 (4	imes6	imes6) K 點所得的零頻率電子介電實部張量為：

[
oldsymbol{arepsilon}^{mathrm{elec}}_{mathrm{full}}(0)
=
egin{pmatrix}
4.763763 & 0.001077 & 0.278936 \\
0.001077 & 4.355388 & 0.062089 \\
0.278936 & 0.062089 & 4.579660
end{pmatrix}
]

其跡平均值為：

[
ar{arepsilon}
=
rac{mathrm{Tr}(oldsymbol{arepsilon})}{3}
=
4.5663
]

由 (3	imes4	imes4) 加密至 (4	imes6	imes6) 後，三個對角分量的最大變化約 0.22%，跡平均值變化約 0.14%。這表示**零頻率電子介電實部**對這次 K 點加密已相當穩定。

但這個結論不能直接延伸到整段介電頻譜。先前在約 2 eV 比較虛部時仍觀察到明顯 K 點敏感性，因此目標發光能量附近的實部與虛部仍需獨立做收斂判斷。

## 2. 論文方法重新核對後的解讀

### 2.1 主要比較量應取自 PL 能量

兩篇方法參考論文都不是單純以 (omegaightarrow0) 的介電值比較有機 barrier 與無機 well，而是依各材料的實驗發光波長，取得對應能量下的介電響應。

波長與光子能量可用下式換算：

[
E_{mathrm{PL}}(mathrm{eV})
=
rac{1239.84}{lambda_{mathrm{PL}}(mathrm{nm})}
]

目前的工作判讀是：

- 主要整理 (operatorname{Re}oldsymbol{arepsilon}(E_{mathrm{PL}}))，討論該發光能量下的介電響應。
- 同時保留 (operatorname{Im}oldsymbol{arepsilon}(E_{mathrm{PL}}))，檢查吸收與損耗是否顯著。
- (operatorname{Re}oldsymbol{arepsilon}(0)) 可作為額外的電子介電參考值，但不能代替論文在 PL 能量的比較。
- VASP 的 `LOPTICS` 在此提供的是頻率相依的**電子**響應；零頻率結果不含晶格振動造成的離子介電貢獻。

因此，Br full model 已完成的零頻率結果仍有價值，但最後的 well／barrier 比較不能只停在這個數字。

### 2.2 論文確實提供 PL 光譜與峰值

2019 年 JACS 論文的 Figure 2 與 Table 1 提供下列 Sn–I 材料的 PL 峰值：

| 論文材料 | PL 峰值 |
|---|---:|
| TEA₂SnI₄ | 645.2 ± 1.2 nm |
| p-FPEA₂SnI₄ | 640.1 ± 0.4 nm |
| PEA₂SnI₄ | 638.0 ± 1.2 nm |
| p-BrPEA₂SnI₄ | 637.2 ± 1.2 nm |
| p-ClPEA₂SnI₄ | 635.1 ± 0.8 nm |

2020 年 Small 論文也提供 TEA₂SnI₄ 的吸收與發光光譜；加入 7% NH₄SCN 的樣品發光峰約為 645 nm，半高寬約 35 nm。

這些數據證明論文的介電計算可以對應到具體 PL 能量，但**不能直接套用至目前兩個 Pb 材料**，原因包括：

- 論文無機骨架是 Sn–I，目前 CIF 是 Pb–I。
- 論文的有機陽離子是 TEA、PEA、p-BrPEA 或 p-ClPEA；目前結構是含硫的 rMBrThMA／rMClThMA。
- 名稱中雖然同樣出現 Br 或 Cl，實際分子結構與材料組成都不同。

目前仍缺少的是 (rmathrm{MBrThMA}_2mathrm{PbI}_4) 與 (rmathrm{MClThMA}_2mathrm{PbI}_4) 自身的實驗 PL 峰值或其原始文獻來源。

## 3. Neutralized ghost-layer model 的建立方式

2019 年論文 SI 所用的 neutralized model 包含質子轉移：

- organic layer：每個有機陽離子移除一個 H⁺。
- inorganic layer：加入由有機層移出的 H。
- 晶格參數沿用完整結構最佳化後的晶胞。

目前晶胞內有四個有機陽離子，因此依論文方法推得的中性分層組成為：

| 中性模型 | 組成，X = Br 或 Cl | 原子數 |
|---|---|---:|
| Organic | C₂₄H₃₂X₄N₄S₄ | 68 |
| Inorganic | H₄Pb₂I₈ | 14 |

這裡只確認了**組成與電荷中性化邏輯**。尚未確認的部分是：

1. 四個有機分子應各移除哪一個 N–H。
2. 四個 H 在 inorganic model 中應放置於哪些位置。
3. 分層模型是否需要依論文條件做局部最佳化，或完全固定 full model 的原子幾何。
4. 2020 年論文使用的 charged ghost-layer 方法是否需要另作一組敏感性比較。

在這些問題確認前，不應只刪除另一層便將模型標記為 neutralized ghost layer。

## 4. 張量方向不能直接以 XX／YY／ZZ 命名層內與層外

CIF 幾何檢查顯示，Br 與 Cl 結構的層面相對晶軸排列不同；而 Br full model 的介電張量也存在非零的 (ZX) 分量。因此不能在未確認層法向量前，直接把 (ZZ) 當成層外介電常數。

若單位層法向量為 (mathbf{n})，層外分量應計算為：

[
arepsilon_{perp}
=
mathbf{n}^{mathrm{T}}
oldsymbol{arepsilon}
mathbf{n}
]

兩個層內方向的平均值則可寫成：

[
arepsilon_{parallel,mathrm{avg}}
=
rac{mathrm{Tr}(oldsymbol{arepsilon})-arepsilon_{perp}}{2}
]

後續 Br、Cl、organic 與 inorganic 的所有張量，都應先轉換至共同的「層內／層外」座標再比較。

## 5. 限制與尚未確認事項

目前需特別保留的限制如下：

- Br full model 的零頻率實部已近似收斂，不等於目標 PL 能量附近的頻譜已收斂。
- 兩篇 Sn 論文的 PL 峰值只能用來理解方法，不能替代目前 Pb 材料的實驗數據。
- Neutralized model 的化學組成已可推定，但 H 的確切位置尚未建立。
- Br 與 Cl 的晶軸方向不同，K 点網格與張量方向都必須依各自晶胞檢查。
- Organic／inorganic model 不宜在電荷、質子位置與幾何處理尚未確認時直接批量提交。

## 6. 下一步

接下來建議依以下順序推進：

1. 從兩份 CIF 檔頭檢查 `_publ_*`、資料庫編號、完整化學名稱與作者資訊，追查原始文獻。
2. 找到兩個 Pb 材料各自的 PL 峰值；若原文未報告，明確列為需向合作老師索取的資料。
3. 在尚未取得 PL 前，先保存 Br／Cl full model 的完整 (arepsilon_1(E)) 與 (arepsilon_2(E)) 頻譜，不任意指定取值能量。
4. 依 SI 的質子轉移方式建立 Br neutralized organic／inorganic 測試模型，先完成元素、原子數、總電荷與 H 位置的人工檢查。
5. 取得目標 (E_{mathrm{PL}}) 後，在該能量附近重新比較 K 點收斂，再正式整理 full／organic／inorganic 的張量及 dielectric contrast。

目前最關鍵的前置資料仍是這兩個 Pb 材料的原始來源與 PL 峰值。找到之後，現有的 VASP 頻譜與分層模型才有一致、可重現的取值基準。
