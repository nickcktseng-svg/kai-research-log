---
title: "Br／Cl 2.48 eV 介電比較：晶層方向修正與法向投影"
description: "依晶層幾何修正 Br 與 Cl 的介電比較方向，整理 2.48 eV 的指定軸向與完整張量法向投影，並說明兩種取法的差異與限制。"
pubDate: "2026-09-21"
category: "計算化學"
tags:
  - "老師／高醫合作案"
  - "2D 鈣鈦礦"
  - "PbI4"
  - "介電張量"
  - "方向投影"
  - "Ghost layer"
  - "LOPTICS"
  - "Br／Cl 比較"
  - "VASP"
draft: false
showToc: true
---

> **研究線：老師／高醫合作案——2D Pb–I 分層介電模型**

這一階段要回答的問題，不只是「在 2.48 eV 讀出一個介電常數」，而是先確認應沿哪個晶體方向取值。Br 與 Cl 結構的晶胞軸排列不同；如果未檢查晶層法向便統一讀取 ZZ，數字雖可計算，卻不代表相同的物理方向。

老師指出 Br 的堆疊方向不是 Z 軸，因此 Br 應先看 XX，Cl 則維持 ZZ。為了避免晶層法向略微偏離單一笛卡兒軸所造成的誤差，本次也使用完整介電張量計算
[
arepsilon_n(E)=mathbf n^mathrm Toldsymbol{arepsilon}(E)mathbf n
]
其中 (mathbf n) 是由晶格向量求得的單位晶層法向。

## 目前階段

六組 total／organic／inorganic 計算皆使用 density-density 介電函數，並在 2.48 eV 以相鄰能量點線性內插。老師指定的軸向比較為：

- Br：XX
- Cl：ZZ

另一組結果則使用完整六個獨立張量分量投影到實際晶層法向。這兩種取法分別回答「沿指定笛卡兒軸」與「沿幾何法向」的介電響應。

## 2.48 eV 實部結果

| 模型 | Br：XX | Br：法向投影 | Cl：ZZ | Cl：法向投影 |
|---|---:|---:|---:|---:|
| Total | 6.1395 | 6.1897 | 5.8245 | 5.8235 |
| Organic | 3.1597 | 3.2018 | 3.0886 | 3.0876 |
| Inorganic | 3.0552 | 3.0621 | 3.1950 | 3.1945 |

![Br XX 與 Cl ZZ 的頻率相依介電函數](/blog/20260921-br-cl-direction-corrected-dielectric/01-axis-components.png)

*圖 1｜依老師指定方向比較 Br 的 XX 與 Cl 的 ZZ。虛線標示 2.48 eV；此處位於主要吸收峰之前，實部已隨能量上升，但虛部仍相對小。Br-total 使用 4 × 6 × 6，Br 分層模型使用 5 × 8 × 8；Cl 三組使用 8 × 8 × 5，因此曲線可用於目前階段的物理解讀，但不能把所有 Br／Cl 差異都歸因於材料本身。*

## 指定軸向與法向投影的差異

Br 的法向約為 ((0.9982, 0, 0.0601))，主要沿 X，但仍含少量 Z 分量；因此完整投影也會納入 ZZ 與 ZX 耦合項。2.48 eV 時：

- Br-total：6.1395 → 6.1897，差約 0.82%。
- Br-organic：3.1597 → 3.2018，差約 1.33%。
- Br-inorganic：3.0552 → 3.0621，差約 0.22%。

Cl 的法向約為 ((-0.0016, 0, 1.0000))，幾乎就是 Z 軸，因此 ZZ 與法向投影差異不到約 0.04%。這證明「Cl 取 ZZ」在幾何上是良好近似；Br 取 XX 也合理，但 organic 的約 1.3% 差異顯示，若要做精細比較，完整張量投影更嚴謹。

![Br／Cl 沿實際晶層法向的頻譜比較](/blog/20260921-br-cl-direction-corrected-dielectric/02-layer-normal-projection.png)

*圖 2｜將完整介電張量投影到各自的晶層法向後，比較 Br 與 Cl 的 total、organic、inorganic 頻譜。2.48 eV 附近兩材料的 organic 與 inorganic 實部相近；較高能區的峰位與強度差異較明顯。圖中結果仍受不同 K 點密度與 PBE 光學近似限制。*

## 數據解讀

在 2.48 eV：

- Total 的實部約為 5.82–6.19，高於分層模型，反映完整材料中的電子響應不能視為兩個 ghost-layer 數值的簡單相加。
- Br 的法向 organic 與 inorganic 分別為 3.2018 與 3.0621，差約 4.6%。
- Cl 的法向 organic 與 inorganic 分別為 3.0876 與 3.1945，差約 3.5%，而且高低順序與 Br 相反。

這些差異顯示 Br／Cl 有機取代可能改變層間介電對比，但目前幅度只有幾個百分點。由於 K 點設定尚未完全一致，現階段應把它視為「值得進一步驗證的趨勢」，不能直接宣稱已得到穩健的 dielectric confinement 差異。

2.48 eV 的虛部仍非零，代表該能量已有光學吸收通道；因此這裡的實部是頻率相依電子響應，不是靜態介電常數。若 2.48 eV 對應老師指定的實驗光學能量，報告中應明確寫成 (operatorname{Re}arepsilon_n(2.48,mathrm{eV}))。

## 限制與下一步

- Br-total 的 K 點仍為 4 × 6 × 6，與 Br 分層模型的 5 × 8 × 8 不一致。
- Br-inorganic 在先前兩組 K 點下的原始 ZZ 實部曾相差約 2.62%，說明目標能量處仍可能有 K 點敏感性。
- 本結果為 PBE、無 SOC 的固定離子電子響應，未包含離子振動、局域場與激子效應。
- Ghost-layer 使用母晶胞體積，未做層厚重標定；organic 與 inorganic 不能直接相加重建 total。
- Density-density 與 current-current 的低能差異尚未解決，本篇只比較 density-density。

下一步應先讓 Br-total 與 Br 分層模型使用一致且已收斂的 K 點，再重新檢查 2.48 eV 的指定軸向與法向投影。若差異仍維持相同順序，才適合進一步討論 Br／Cl 取代對分層介電對比的影響。
