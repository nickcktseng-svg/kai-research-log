---
title: "Cu(111) 吸附能計算實驗日誌"
description: "整理在台灣杉上進行 Cu(111) 與 CO 吸附能計算的流程、錯誤排查、固定層數測試，以及 ontop、bridge、hollow_fcc 的初步吸附能結果。"
pubDate: "2026-07-28"
category: "計算化學"
tags:
  - "VASP"
  - "HPC"
  - "台灣杉三號"
  - "Cu(111)"
  - "吸附能"
  - "Slurm"
draft: false
---

> 這份日誌整理了我這幾天在台灣杉（NCHC）上進行 Cu(111) 吸附能計算的流程、遇到的問題、解法，以及目前取得的數據結果。

## 快速導覽

可以從下面的章節快速回到這次計算紀錄的重點：

- [一、任務目標](#1-任務目標)
- [二、基本觀念整理](#2-基本觀念整理)
- [三、主要問題與排查](#3-我這幾天遇到的主要問題)
- [四、固定層數測試](#4-固定層數測試過程與數據整理)
- [五、最低標準任務吸附能結果](#5-最低標準任務3l--22--fix0-吸附能結果)
- [六、這次學到的事](#6-這次計算中我學到的事)
- [七、後續可以繼續做的事](#7-後續可以繼續做的事)
- [八、圖片索引與摘要](#8-圖片索引與對應)

---

## 1. 任務目標

這次的任務主要分成兩部分：

1. **最低標準任務**  
   建立 **Cu(111)、3 層、2×2、fix0（全鬆）** 的 slab，並比較 CO 吸附在三種位置的吸附能：
   - ontop
   - bridge
   - hollow_fcc

2. **額外收斂測試任務**  
   建立 **4L / 5L / 6L** 的 Cu(111) slab，並比較：
   - `fix0`：全部可移動
   - `fix2`：固定底下 2 層
   - `fix3`：固定底下 3 層

   目的是觀察固定層數與 slab 厚度改變時，能量是否趨於收斂。

---

## 2. 基本觀念整理

### 2.1 Cu(111) 中的「111」代表什麼？
Cu(111) 的 `111` 是 **Miller index（米勒指數）**，代表切出的晶面方向，**不是** 1×1、2×2 或 4×4 的意思。

### 2.2 Supercell 與每層原子數
這次我做過兩種規模：

- **3L / 2×2 / fix0**  
  每層 4 顆 Cu，3 層總共 12 顆 Cu  
  → 這是最低標準任務用的模型

- **4L / 5L / 6L（4×4）**  
  每層 16 顆 Cu  
  → 這是固定層數測試時用的模型

### 2.3 吸附能公式
吸附能使用下式計算：

```text
E_ads = E_(CO/Cu) - E_clean - E_CO
```

其中：

- `E_(CO/Cu)`：CO 吸附在 Cu 表面後的總能量
- `E_clean`：乾淨 Cu 表面的總能量
- `E_CO`：單獨 CO 分子的總能量

一般來說，**吸附能越負，表示吸附越穩定**。

---

## 3. 我這幾天遇到的主要問題

### 3.1 新電腦環境與 MobaXterm 連線設定
一開始剛換電腦，需要先把 MobaXterm 連到台灣杉，並建立工作目錄與常用指令。  
我後來確認工作位置在 `/work/u7826331`，而不是只在 `/home` 下操作。

![圖 1：MobaXterm 連線與工作目錄確認](/blog/20260728-cu111/fig01_mobaxterm_workdir.png)

**當時的重點：**
- 確認登入成功
- 確認目前所在主機
- 確認目前工作路徑
- 確認 `/work` 空間可正常使用

---

### 3.2 相對路徑／目前所在資料夾搞混，導致 cp 失敗
我有一段時間卡在 `cp cannot stat`，後來確認原因不是檔案不存在，而是**當前所在目錄不對**，卻用了從專案根目錄出發的相對路徑。

**學到的事：**
- 執行複製與提交前，先用 `pwd` 確認目前位置
- 不確定時直接用絕對路徑最安全
- `INCAR / KPOINTS / sub.sh / POTCAR` 最好在提交前全部檢查一次

---

### 3.3 MobaXterm 會自動登出
由於系統安全設定，MobaXterm 閒置一段時間後會被登出。  
這不會影響已經提交的 Slurm 工作，但會讓我以為計算中斷。

**結論：**
- 登出不代表作業停止
- 重連之後用 `squeue -u $USER` 檢查作業狀態即可

---

### 3.4 QOS / 提交數量限制
有一段時間我同時送太多工作，出現了類似：

```text
QOSMaxSubmitJobPerUserLimit
```

的訊息。

**處理方式：**
- 先等部分工作跑完
- 再補送剩下的工作
- 用 `ctest` 或 `ct224` 時，要注意 queue 狀態與資源限制

---

### 3.5 Python 版本太舊，腳本無法執行
我在台灣杉上執行腳本時，出現：

```text
SyntaxError: future feature annotations is not defined
```

原因是系統上的 `python3` 版本較舊，不支援：

```python
from __future__ import annotations
```

**後來的解法：**
- 改寫成 Python 3.6 可執行版本
- 避免使用太新的語法
- 成功在台灣杉上直接生成 CO 的 bridge / hollow / ontop 結構

---

### 3.6 GUI 產生的 bridge / hollow 一開始位置不正確
一開始我自己的圖形介面程式在產生 bridge 結構時，結果看起來和 ontop 幾乎一樣，表示吸附位置判斷可能有誤。

**後來的處理：**
- 先用腳本直接從 `POSCAR_relaxed` 建立吸附位點
- bridge 用兩顆表面 Cu 的中點
- hollow 用三顆表面 Cu 的中心
- 最後再補修 GUI 程式

---

### 3.7 POTCAR 順序與 POSCAR 元素順序要一致
吸附系統的 POSCAR 元素順序是：

```text
C Cu O
```

所以 POTCAR 的組合順序也必須是：

```text
POTCAR_C + POTCAR_Cu + POTCAR_O
```

如果順序不一致，後面的計算結果就會錯。

---

### 3.8 固定層數的確認不能只憑感覺
對於 `fix2` 與 `fix3`，我另外用 `grep / awk` 驗證了 FFF 與 TTT 的數量，確保：

- `fix2`：底下 2 層固定
- `fix3`：底下 3 層固定

也進一步用 `z` 座標分組，確認每一層確實有 16 顆原子。

![圖 6：各模型 fix2 / fix3 的固定與可動原子數量檢查](/blog/20260728-cu111/fig06_fix_count_summary.png)

![圖 7：4L/fix2 與 4L/fix3 的 FFF / TTT 詳細檢查](/blog/20260728-cu111/fig07_fix_count_detail_4L.png)

---

## 4. 固定層數測試：過程與數據整理

### 4.1 clean surface 能量結果（4×4 slab）

我完成了 4L、5L、6L 在 `fix2` 與 `fix3` 下的 clean surface 計算，結果如下：

| 模型 | TOTEN (eV) | 收斂 | err 檔 |
|---|---:|---|---|
| 4L / fix2 | -250.95613282 | OK | 0 |
| 4L / fix3 | -250.81304782 | OK | 0 |
| 5L / fix2 | -319.31341734 | OK | 0 |
| 5L / fix3 | -319.21253004 | OK | 0 |
| 6L / fix2 | -388.14846655 | OK | 0 |
| 6L / fix3 | -388.04039085 | OK | 0 |

![圖 2：4L / 5L / 6L 在 fix2、fix3 下的 clean surface 能量結果](/blog/20260728-cu111/fig02_clean_surface_fix2_fix3_results.png)

---

### 4.2 ionic relaxation 步數檢查
我也用 `OSZICAR` 檢查 ionic step 數量，例如其中一個模型顯示跑了 8 步才收斂。

![圖 3：以 OSZICAR 檢查 ionic step 與收斂過程](/blog/20260728-cu111/fig03_oszicar_steps.png)

---

### 4.3 每層 16 顆 Cu 的分層驗證
我另外用 `awk` 取出 `z` 座標後分組，確認每一層都確實有 16 顆 Cu。

![圖 4：利用 z 座標分組，確認各層各有 16 顆 Cu](/blog/20260728-cu111/fig04_layer_z_grouping.png)

---

### 4.4 為什麼 slab 越厚，TOTEN 會越負？
剛開始看到 4L、5L、6L 的 TOTEN 越來越負時，一度懷疑自己是不是算錯。  
後來理解到，這是**正常現象**，因為每多一層就多 16 顆 Cu，總能量自然會變得更負。

例如：

```text
E_5L - E_4L = -68.33498955 eV
E_6L - E_5L = -68.84994510 eV
```

所以 **不能直接拿不同層數的總 TOTEN 比較 slab 是否「收斂」**，因為系統大小本來就不同。  
真正要比較的是：
- 表面能
- 吸附能
- 或者在相同定義下的歸一化量

![圖 5：slab 越厚時 TOTEN 越負是正常現象](/blog/20260728-cu111/fig05_energy_more_negative_is_normal.png)

---

### 4.5 fix2 / fix3 的固定原子數量統計
以下是我檢查出來的固定／可動原子數量：

| 模型 | FFF（固定） | TTT（可動） |
|---|---:|---:|
| 4L / fix2 | 32 | 32 |
| 4L / fix3 | 48 | 16 |
| 5L / fix2 | 32 | 48 |
| 5L / fix3 | 48 | 32 |
| 6L / fix2 | 32 | 64 |
| 6L / fix3 | 48 | 48 |

這與我的設定一致：
- `fix2`：固定 2 層 → 2 × 16 = 32 顆固定
- `fix3`：固定 3 層 → 3 × 16 = 48 顆固定

---

### 4.6 top site 的初步測試結果（固定層數系列）
在固定層數研究中，我也曾對 top site 做過一輪初步測試，得到以下吸附能：

| Model | E_ads (eV) |
|---|---:|
| 4L_fix0_top | -0.96836678 |
| 4L_fix2_top | -0.95407431 |
| 4L_fix3_top | -0.93937241 |
| 5L_fix0_top | -0.96313446 |
| 5L_fix2_top | -0.99024962 |
| 5L_fix3_top | -0.98770434 |
| 6L_fix0_top | -0.89799446 |
| 6L_fix2_top | -0.91674229 |
| 6L_fix3_top | -0.91365867 |

> 這部分屬於我目前的額外進度，之後若要完整比較固定層數效果，還可以再搭配 bridge / hollow 一起分析。

---

## 5. 最低標準任務：3L / 2×2 / fix0 吸附能結果

### 5.1 參考能量

| 項目 | 能量 (eV) |
|---|---:|
| `E_clean`（Cu(111) 3L / 2×2 / fix0） | -45.25408614 |
| `E_CO`（isolated CO） | -14.80998297 |

---

### 5.2 ontop / bridge / hollow_fcc 吸附結果

| 吸附位置 | `E_(CO/Cu)` (eV) | `E_ads` (eV) | 收斂 | err 檔 |
|---|---:|---:|---|---:|
| ontop | -60.88909347 | **-0.82502436** | OK | 0 |
| bridge | -61.06093821 | **-0.99686910** | OK | 0 |
| hollow_fcc | -61.12719632 | **-1.06312721** | OK | 0 |

---

### 5.3 穩定度排序

因為吸附能越負表示吸附越穩定，所以這三個位置的穩定度為：

```text
hollow_fcc > bridge > ontop
```

能量差如下：

- hollow_fcc 比 bridge 更穩定：`0.06625811 eV`
- bridge 比 ontop 更穩定：`0.17184474 eV`
- hollow_fcc 比 ontop 更穩定：`0.23810285 eV`

---

### 5.4 結論整理
在 **Cu(111)、3 層、2×2、fix0** 的條件下，CO 吸附在三種位置的結果顯示：

1. 三個位置的吸附能都為負值，表示吸附在能量上是有利的。
2. `hollow_fcc` 的吸附能最負，因此最穩定。
3. `ontop` 的吸附能最不負，因此相對最不穩定。

可以用一句話總結：

> 在本次 Cu(111) 3L / 2×2 / fix0 的計算中，CO 在 hollow_fcc 位置的吸附最穩定，其次是 bridge，ontop 最弱。

---

## 6. 這次計算中我學到的事

1. **先確認工作路徑再下指令**，可以避免很多 `cp` / `sed` / `sbatch` 錯誤。  
2. **POTCAR 順序一定要對應 POSCAR 元素順序**。  
3. **Slab 越厚時 TOTEN 越負是正常的**，不能直接拿不同 slab 厚度的 TOTEN 比較。  
4. **固定層數要用 FFF / TTT 與 z 座標真的驗證**，不能只看檔名。  
5. **MobaXterm 被登出不等於作業中斷**，Slurm 工作仍會繼續跑。  
6. **吸附位點的幾何位置一定要檢查**，尤其是 bridge / hollow 是否真的落在正確位置。  
7. **在 HPC 上寫腳本時，要考慮系統 python 版本**，避免太新的語法導致無法執行。

---

## 7. 後續可以繼續做的事

目前我已完成最低標準任務，後續還可以往下延伸：

1. 把 `fix2 / fix3` 系列的 bridge 與 hollow 也補齊  
2. 比較不同 slab 厚度與固定層數對吸附能的影響  
3. 視覺化 `POSCAR_relaxed`，確認 CO 最後是否仍停留在原始吸附位置  
4. 若要更正式分析 slab 收斂，進一步計算或整理 surface energy / adsorption energy 的收斂行為

---

## 8. 圖片索引與對應

這次使用的截圖已整理到網站的 `/blog/20260728-cu111/` 路徑下，對應如下。

| 圖號 | 圖片檔名 | 用途 |
|---|---|---|
| 圖 1 | `fig01_mobaxterm_workdir.png` | MobaXterm 連線、工作目錄、主機與磁碟空間確認 |
| 圖 2 | `fig02_clean_surface_fix2_fix3_results.png` | 4L/5L/6L clean surface 的 fix2 / fix3 能量結果 |
| 圖 3 | `fig03_oszicar_steps.png` | 用 OSZICAR 檢查 ionic step 與收斂過程 |
| 圖 4 | `fig04_layer_z_grouping.png` | 用 z 座標分組驗證每層 16 顆 Cu |
| 圖 5 | `fig05_energy_more_negative_is_normal.png` | 說明為何 slab 越厚 TOTEN 會越負 |
| 圖 6 | `fig06_fix_count_summary.png` | 各模型 fix2 / fix3 的 FFF / TTT 數量總整理 |
| 圖 7 | `fig07_fix_count_detail_4L.png` | 4L/fix2 與 4L/fix3 的 FFF / TTT 詳細驗證 |

---

## 9. 可直接貼在報告中的摘要版本

> 本研究使用台灣杉計算資源，進行 Cu(111) 表面的吸附能計算。最低標準任務為建立 3 層、2×2、全鬆（fix0）的 Cu(111) 模型，並比較 CO 在 ontop、bridge 與 hollow_fcc 三種位置的吸附穩定性。計算結果顯示，三者吸附能分別為 -0.8250、-0.9969 與 -1.0631 eV，其中 hollow_fcc 最穩定、bridge 次之、ontop 最不穩定。除此之外，也額外進行了 4L / 5L / 6L 與 fix2 / fix3 的 slab 測試，確認固定層數設定正確，並初步觀察到不同 slab 厚度與固定條件對總能量與 top site 吸附能的影響。
