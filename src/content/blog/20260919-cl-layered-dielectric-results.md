---
title: "Cl 分層介電響應：Total NBANDS 與 Organic／Inorganic 第一輪結果"
description: "整理 Cl 取代 2D Pb–I 系統的 total、organic 與 inorganic 電子介電結果，說明 ZZ 比較、方向性、NBANDS 測試及尚未完成的收斂工作。"
pubDate: "2026-09-19"
category: "計算化學"
tags:
  - "老師／高醫合作案"
  - "2D 鈣鈦礦"
  - "PbI4"
  - "Ghost layer"
  - "介電張量"
  - "LOPTICS"
  - "NBANDS 收斂"
  - "Cl 取代"
  - "VASP"
draft: false
showToc: true
---

> **研究線：老師／高醫合作案——2D Pb–I 分層介電模型**

完成 Br 系統後，這一階段把相同流程延伸至 Cl 有機取代結構：先計算完整材料（total）的電子介電響應，再以中性 organic／inorganic ghost-layer 模型拆解有機阻障層與 Pb–I 無機層的貢獻。

本合作案依老師指定，以介電張量的 **ZZ 分量**作為後續報告的主要比較欄位。不過，ZZ 是本案的比較慣例，不能在其他晶胞中未檢查軸向便自動等同於幾何上的層外方向。

## 1. Cl-total：先確認完整材料的基準

Cl-total 使用 Gamma-centered 6 × 6 × 4 K 點完成第一輪 LOPTICS 計算。NBANDS = 576 時的零頻電子介電實部張量為：

[
arepsilon_1(0)=
egin{bmatrix}
4.489168 & 0.033710 & 0.201590 \
0.033710 & 4.332733 & 0.004145 \
0.201590 & 0.004145 & 4.597167
end{bmatrix}
]

對角平均為 4.473023，老師指定的 ZZ 分量為 4.597167。這是固定結構下的電子響應，不包含離子振動，也不是實驗發光能量處的介電值。

![Cl-total 的頻率相依電子介電函數](/blog/20260919-cl-layered-dielectric-results/01-cl-total-spectrum.png)

*圖 1｜Cl-total 在 0–6 eV 的 density-density 電子介電實部與虛部。三個方向的頻譜差異顯示明顯各向異性；圖上的峰值位置可用於後續選定 PL 能量後取值，但目前不能把零頻或任一峰值直接稱為實驗介電常數。*

### NBANDS 測試

將 NBANDS 由 576 增加至 864 後，零頻實部 ZZ 由 4.597167 變為 4.610107，變化約 **+0.281%**。

這表示 Cl-total 的零頻 ZZ 對空能帶數已相對穩定，至少通過目前採用的約 1% 初步工作判準。不過，這項結論只適用於目前比較的 ZZ 與這兩個 NBANDS 點；完整張量、整段頻譜與 K 點敏感性仍需分開檢查。

## 2. Organic／inorganic 分層模型

Organic 與 inorganic 模型都完成 H-relax，並在 6 × 6 × 4 K 點下取得 2000 點的完整頻率相依介電資料。第一輪零頻實部張量如下。

### Organic model

[
arepsilon_{organic}(0)=
egin{bmatrix}
2.411446 & 0.000893 & 0.211681 \
0.000893 & 2.291216 & 0.000063 \
0.211681 & 0.000063 & 2.697269
end{bmatrix}
]

對角平均為 2.466644，ZZ 為 **2.697269**。

### Inorganic model

[
arepsilon_{inorganic}(0)=
egin{bmatrix}
3.127371 & 0.002117 & 0.088886 \
0.002117 & 3.170423 & 0.002932 \
0.088886 & 0.002932 & 2.602691
end{bmatrix}
]

對角平均為 2.966828，ZZ 為 **2.602691**。

![Cl organic 與 inorganic ghost-layer 的完整介電頻譜](/blog/20260919-cl-layered-dielectric-results/02-cl-layer-spectra.png)

*圖 2｜Cl organic 與 inorganic 中性 ghost-layer 在 0–6 eV 的 XX、YY、ZZ 電子介電頻譜。Organic 的強 ZZ 結構集中在較高能區；inorganic 的 XX／YY 與 ZZ 峰形分布不同，說明平均值不足以描述分層模型的方向性。圖中結果尚待 NBANDS 與 K 點收斂。*

## 3. 數據代表什麼

如果只看張量平均，inorganic 的 2.9668 高於 organic 的 2.4666，表示 Pb–I 層在目前的模型與母晶胞體積定義下具有較強的整體電子極化響應。

但依老師指定的 ZZ 比較，organic 的 2.6973 反而略高於 inorganic 的 2.6027；inorganic／organic 的 ZZ 比值約為 **0.9649**。這說明：

- 「無機層平均介電響應較高」不等於每個方向都較高。
- Dielectric contrast 必須明確指出比較的是張量平均、ZZ，還是幾何投影後的層內／層外分量。
- 目前 ZZ 差距只有約 3.5%，在分層模型完成 NBANDS 與 K 點測試前，不宜把它解讀成已確立的強介電侷限。

兩個分層張量不能直接相加來重建 total，因為 ghost-layer 使用母晶胞體積、化學中性化與獨立電子結構，並不是簡單的線性體積分割。

## 4. 尚未解決的問題

目前仍需保留以下限制：

- Organic 與 inorganic 尚未完成各自的 NBANDS 測試。
- Total 與分層模型仍需確認 K 點收斂。
- 材料本身的實驗 PL 波長尚未取得，因此不能在正確的發光能量處比較介電值。
- Density-density 與 current-current 在低能虛部仍有差異；不能混用兩種表示法。
- 計算為 PBE 電子介電響應，未包含 SOC、離子振動、局域場與激子效應。
- Cl 與 Br 的晶胞軸向不同；跨材料直接比較原始 ZZ 時，必須遵循老師指定的比較方式並清楚標註座標定義。

## 5. 下一步

下一步應先固定 6 × 6 × 4 K 點，分別提高 organic 與 inorganic 的空能帶數：

- Organic：576 → 864
- Inorganic：288 → 432

若主要張量分量與目標能量區域的頻譜變化足夠小，再固定已收斂的 NBANDS 加密 K 點。取得材料的實驗 PL 後，最後在對應能量重新比較 total／organic／inorganic 的實部與虛部。

目前可下的結論是：**Cl-total 的零頻 ZZ 已初步通過 NBANDS 測試；Cl 分層模型也已呈現清楚的方向性，但 organic 與 inorganic 的正式 dielectric contrast 仍需等待分層 NBANDS、K 點及 PL 能量處的收斂確認。**
