---
title: "MACE in Practice II：基礎模型、RDF 與標準 Fine-tuning"
description: "記錄在 Google Colab 使用 MACE-MP-0 執行分子動力學、以 XTB 比較 RDF，並用少量 XTB 資料進行 standard fine-tuning 的結果與判讀。"
pubDate: "2026-09-03"
category: "計算化學"
tags:
  - "MACE"
  - "MACE-MP-0"
  - "MLIP"
  - "Foundation Model"
  - "Fine-tuning"
  - "XTB"
  - "ASE"
  - "RDF"
  - "分子動力學"
  - "Google Colab"
  - "計算化學"
draft: false
showToc: true
---

這篇接續 [MACE in Practice I](/blog/20260814-mace-practice-i)，整理 **MACE Practice II Section 3.1–3.3** 的實作結果。這次在 Google Colab 的 NVIDIA GPU 環境中，比較三種描述同一個分子動力學系統的方法：

1. **GFN2-xTB**：本次 tutorial 的 reference method。
2. **MACE-MP-0 small**：直接使用、尚未針對此資料調整的 foundation model。
3. **Fine-tuned MACE**：以少量 XTB configurations 做 standard fine-tuning 的模型。

這次最重要的學習不只是把 MD 跑完，而是分辨三個不同問題：

> **計算是否穩定？分子結構是否合理？模型是否接近指定的 reference domain？**

三者不能只靠同一張 energy 或 temperature 圖判斷。

---

## 1. 這次練習要回答什麼？

MACE-MP-0 是以大量 DFT configurations 預訓練的通用模型，可以在沒有自行訓練模型的情況下直接進行 energy、force 與 MD 計算。然而，foundation model 的 reference level 與目標問題不一定相同。

這份 tutorial 的 MACE-MP-0 來自 PBE/PBE+U domain，練習資料則以 GFN2-xTB 作為 reference。因此，兩者的 RDF 不完全相同並不意外，也不能直接說其中一條曲線「錯了」。本節真正要測試的是：

> 使用少量 XTB labels fine-tune MACE-MP-0 後，模型產生的動態結構分布能否更接近 XTB？

這也是 transfer learning 的核心想法：保留預訓練模型已學到的表示，再用較少的目標資料調整模型。

---

## 2. Section 3.1：直接使用 MACE-MP-0 跑 MD

### 2.1 計算設定

Notebook 使用 `mace_mp()` 直接載入 small foundation model：

```python
from mace.calculators import mace_mp

macemp = mace_mp(model="small", device="cuda")
simpleMD(
    init_conf,
    temp=1200,
    calc=macemp,
    fname="moldyn/mace03_md.xyz",
    s=10,
    T=2000,
)
```

本次初始結構是資料中的第一個 single-molecule configuration，為 12 原子的 `C3H6O3` 分子。MD 的主要設定如下：

| 項目 | 設定 |
| --- | --- |
| Model | MACE-MP-0 `small` |
| Device | Colab GPU，`cuda` |
| Integrator | ASE Langevin dynamics |
| 初始速度溫度 | 300 K |
| 目標溫度 | 1200 K |
| Time step | 1 fs |
| Steps | 2000 |
| 總模擬時間 | 2 ps |
| 儲存間隔 | 每 10 steps |
| Trajectory frames | 201 |

### 2.2 穩定性的判讀

Trajectory 可以完整跑完，energy 保持有限，座標中沒有 `NaN` 或無限值。從數值角度來看，這代表 MACE-MP-0 能在這段高溫 MD 中穩定地提供 energy 與 forces。

接著再以初始鍵結為基準追蹤 5 個 C–O 與 6 個 C–H 距離。到 2000 fs 時：

| Bond type | 最終距離範圍 |
| --- | ---: |
| C–O | 1.205–1.609 Å |
| C–H | 1.063–1.187 Å |

部分 C–O 在 trajectory 中曾暫時拉長到約 1.84 Å，但之後回到原來的鍵長區間，沒有觀察到不可逆的斷鍵。

這裡必須保留一個重要限制：

> **MD 沒有爆掉，只能證明 numerical stability；它不等於模型在目標理論層級上已經足夠準確。**

因此還需要用結構分布與獨立 reference 進行比較。

---

## 3. Section 3.2：用 RDF 比較 MACE-MP-0 與 XTB

### 3.1 RDF 的計算方式

RDF（radial distribution function）用來描述 trajectory 中兩類原子距離的統計分布。因為這裡是 isolated molecule，Notebook 暫時給每個 frame 一個 100 Å 的假晶胞並開啟 PBC，目的是讓 `aseMolec` 的 RDF 函式能執行；這不代表系統真的變成凝聚態週期晶體。

```python
traj = read("moldyn/xtb_md.xyz", "50:")
for at in traj:
    at.pbc = True
    at.cell = [100, 100, 100]

rdf = aa.compute_rdfs_traj_avg(traj, rmax=5, nbins=70)
```

前 50 frames，也就是前 500 fs，被視為 equilibration 而排除；後續比較使用 151 frames。

### 3.2 尚未 fine-tune 的差異

在 `OO_intra` RDF 中，XTB 與原始 MACE-MP-0 的主峰都約位於 2.2–2.3 Å，表示兩者找到相近的主要 O–O 幾何尺度。但是原始 MACE-MP-0 的峰較寬，並略往較長距離偏移。

可以把這個現象解讀為：

- XTB trajectory 的 O–O 距離較集中。
- 原始 MACE-MP-0 顯示較寬的結構波動範圍。
- 差異可能來自 pretrained PBE/PBE+U domain 與 GFN2-xTB domain 的 reference mismatch。

這個比較的目的不是宣布 XTB 是真實答案，而是建立一個清楚、便宜而可重現的 fine-tuning target。

---

## 4. Section 3.3：Standard fine-tuning

### 4.1 Fine-tuning 設定

本次採用 standard fine-tuning：從 MACE-MP-0 small 的既有參數繼續訓練，而不是從隨機權重開始。

```yaml
model: MACE
foundation_model: small
multiheads_finetuning: false
train_file: data/solvent_xtb_train_50.xyz
valid_fraction: 0.10
test_file: data/solvent_xtb_test.xyz
forces_weight: 10.0
energy_weight: 1.0
batch_size: 10
max_num_epochs: 500
swa: true
seed: 345
device: cuda
```

資料包含 50 個 molecular configurations，以及 H、C、O 三種 isolated-atom references。Molecular configurations 依 90/10 分成約 45 個 training 與 5 個 validation structures；另外保留 1000 個 configurations 作為 test set。

從這個資料量可以看出 fine-tuning 的優勢：它嘗試用少量 target-domain labels 校正大型預訓練模型，而不是重新收集龐大資料並從頭訓練。

### 4.2 Stage 1 與 SWA 指標

訓練輸出會分別報告 energy RMSE、force RMSE 與 relative force RMSE。這些指標不能互相取代：energy 表現改善，不代表 forces 或 MD dynamics 一定等比例改善。

![Standard fine-tuning 的 Stage 1 與 Stage 2 train、validation、test 指標](/blog/20260903-mace-practice-ii/01-finetuning-metrics.png)

*圖中保留 Colab 訓練完成後的原始 error tables。Stage 2 是 SWA 階段的最終模型。*

| 階段 | Dataset | Energy RMSE (meV/atom) | Force RMSE (meV/Å) | Relative F RMSE |
| --- | --- | ---: | ---: | ---: |
| Stage 1 | Train | 18.5 | 62.2 | 3.54% |
| Stage 1 | Validation | 17.1 | 126.4 | 6.80% |
| Stage 1 | Test | 19.9 | 266.5 | 11.64% |
| Stage 2 / SWA | Train | 2.4 | 41.4 | 2.27% |
| Stage 2 / SWA | Validation | 6.4 | 131.7 | 7.08% |
| Stage 2 / SWA | Test | 7.5 | 271.2 | 11.84% |

結果顯示：

- SWA 後的 energy RMSE 明顯下降，尤其 test energy 從 19.9 降到 7.5 meV/atom。
- Training force RMSE 由 62.2 降到 41.4 meV/Å。
- Validation 與 test force RMSE 沒有同步改善，test force 甚至從 266.5 微升到 271.2 meV/Å。
- Training 與 test force 的差距提醒我們：50 個 target configurations 對 force generalization 仍然有限。

所以不能只挑最好看的 energy 數字作結論。若研究目的是真正跑長時間 MD，forces 與 trajectory-derived observables 仍是必要的檢查。

### 4.3 Fine-tuned model 再跑 2 ps MD

使用 Stage 2 模型，以相同的 1200 K、1 fs time step 與 2000 steps 再跑一次 MD。Trajectory 可以完整完成，座標與能量維持有限，表示模型至少通過這次短時間 numerical stability test。

Fine-tuned model 的絕對能量約為 -49 eV/atom，而原始 MACE-MP-0 的曲線約在 -5.5 eV/atom。這不是 fine-tuning 讓系統物理能量大幅降低，而是兩個模型使用不同的 atomic reference energy zero。能量基準不同時，不能直接比較絕對值；較合理的是比較同一模型內的波動、相對能量或使用一致基準後再比。

---

## 5. 三種方法的 RDF 結果

最後將 XTB、原始 MACE-MP-0 與 fine-tuned MACE 的六種 intramolecular RDF 放在一起比較：

![XTB、MACE-MP-0 與 fine-tuned MACE 的六種 intramolecular RDF 比較](/blog/20260903-mace-practice-ii/02-rdf-comparison.png)

*藍色為 XTB、橘色為未 fine-tune 的 MACE-MP-0、綠色為 fine-tuned MACE。每個 panel 的縱軸尺度應各自判讀，不應跨 panel 直接比較峰高。*

| RDF | Fine-tuning 後的觀察 |
| --- | --- |
| `HH_intra` | 綠線比原始橘線接近 XTB，但仍稍低、稍寬。 |
| `HC_intra` | 三條曲線幾乎重疊，原始 foundation model 已描述得不錯。 |
| `HO_intra` | 主峰位置改善，但綠線較尖，仍不是完全一致。 |
| `CC_intra` | 改善有限；XTB 主峰仍較高、分布較集中。 |
| `CO_intra` | Fine-tuned model 明顯往 XTB 靠近。 |
| `OO_intra` | 改善最清楚，綠線幾乎與 XTB 主峰重疊。 |

這張圖帶來兩個重要結論。

第一，fine-tuning 的確讓多數 target-domain 結構分布往 XTB 靠近，尤其是含氧原子對的 `CO_intra` 與 `OO_intra`。這表示少量 XTB labels 已經能有效調整 pretrained model 的局部 dynamics。

第二，改善並不平均。`CC_intra` 仍有差距，`HO_intra` 也出現過尖的情況。因此較準確的說法是：

> **Standard fine-tuning 改善了這個分子在 XTB domain 下的多項局部結構分布，但不代表所有 degrees of freedom 都同樣準確，也不代表模型具有普遍 transferability。**

另外，本次只有 2 ps trajectory，排除 equilibration 後僅剩 151 frames，較長距離區域的細小起伏很容易受 sampling noise 影響。正式研究需要更長 trajectory、多個初始條件，以及不確定度或重複計算。

---

## 6. 這次練習真正學到的判讀順序

### 6.1 Foundation model 可以直接用，但不能直接相信

MACE-MP-0 能 out-of-the-box 跑完這段 MD，展示了 foundation model 的便利性。不過，是否適合特定化學問題仍取決於 pretraining domain、目標 theory level 與待觀察的性質。

### 6.2 Stable 不等於 accurate

完整跑完 trajectory、沒有 `NaN`、分子沒有解離，是必要條件，但還不充分。至少還要檢查：

- energy 與 temperature 是否有異常趨勢；
- bond distances 是否出現不可逆變化；
- reference energy／force errors；
- RDF 或其他與研究問題相關的 observables。

### 6.3 Fine-tuning 成效要用多個指標交叉檢查

這次 SWA 大幅改善 energy RMSE，但 test force RMSE 沒有改善；另一方面，RDF 又顯示多個結構分布更接近 XTB。這正好說明單一數字不能概括模型品質。

### 6.4 Standard 與 multi-head fine-tuning 的差異

本次完成的是 standard approach，也就是直接從 pretrained parameters 繼續訓練。它適合快速適應 target domain，但可能犧牲一部分原有能力，也就是 catastrophic forgetting。

Tutorial 另外提供 multi-head fine-tuning 作為延伸：保留 pretraining head，並為新資料加入另一個 head，以降低遺忘。這部分可作為下一個比較實驗，但不是本次 standard fine-tuning 結論的一部分。

---

## 7. 本次進度與下一步

本次已完成並理解：

- Section 3.1：MACE-MP-0 small 的 2 ps MD；
- Section 3.2：MACE-MP-0 與 XTB 的 RDF 比較；
- Section 3.3：standard fine-tuning、指標判讀、fine-tuned MD 與六組 RDF 比較。

下一步可依研究需求選擇：

1. 做 multi-head fine-tuning，與 standard approach 比較 test errors、RDF 與原模型保留能力。
2. 延長 trajectory 或增加多個 random seeds，檢查目前的 RDF 結論是否穩健。
3. 進入 MACE Theory，補上 equivariance、message passing 與 atomic energy decomposition 的理論理解。
4. 在自己的材料研究中，先建立可信的 DFT reference data，再決定 foundation model、fine-tuning 或從頭訓練的策略。

這次 Practice II 最值得保留的一句話是：

> **模型的價值不只在於能把 MD 跑完，而在於它能否以可驗證的方式重現目標 theory level 下的重要結構與動力學分布。**
