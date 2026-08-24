---
title: "MACE in Practice I：從資料標記、模型訓練到分子動力學"
description: "整理 MACE Practice I 的完整 MLIP 工作流程，結合手寫筆記與 Jupyter Notebook 程式碼，說明碳酸酯資料、XTB 標記、MACE 超參數、RMSE、力分解與分子動力學測試。"
pubDate: "2026-08-14"
category: "計算化學"
tags:
  - "MACE"
  - "MLIP"
  - "機器學習勢能"
  - "ASE"
  - "XTB"
  - "GFN2-xTB"
  - "分子動力學"
  - "Python"
  - "計算化學"
draft: false
showToc: true
---

這篇是我完成 **MACE Practice I** 後的學習整理。  
這份 tutorial 的主線不是單純把程式跑完，而是完整走過一次 MLIP 的基本流程：

> **理解資料 → 建立 reference labels → 設定 MACE → 訓練模型 → 測試 accuracy → 跑 Molecular Dynamics**

MACE（**Multi-Atomic Cluster Expansion**）是一種 Machine Learning Interatomic Potential（MLIP）。  
它的目標可以先用一句話理解：

> 給模型原子的種類與三維位置，讓它快速預測系統的 **Energy** 與 **Forces**。

在真正研究中，reference data 常來自 DFT 或更高階的 quantum chemistry；這份 tutorial 為了降低計算成本，使用 **GFN2-xTB** 當作 reference method。

**學習日期：** 2026 年 8 月 14 日  
**整理材料：** MACE Practice I Notebook、程式執行內容與六頁手寫筆記

這篇除了保留 Notebook 的主要程式碼，也把每段程式分成「做什麼、資料存在哪裡、為什麼需要這一步」來閱讀。手寫筆記則放回資料、標記、模型設定、訓練與測試等對應章節，方便對照當時的理解。

---

## 0. Colab 環境

Tutorial 使用 Google Colab，並建議啟用 GPU。

```bash
!git clone https://github.com/imagdau/Tutorials.git
!pip install mace-torch nglview ipywidgets rdkit x3dase
!pip install git+https://github.com/imagdau/aseMolec@2633a672eb235c49a5c7d7161f76f52f4e218e99
!pip install -U numpy==2.0
%cd Tutorials
```

主要套件：

- **MACE**：訓練與使用 MLIP
- **ASE**：處理 atomic structures、calculator 與 MD
- **aseMolec**：處理 molecular clusters、RDF、force decomposition 等
- **XTB**：提供 reference energies / forces
- **RDKit**：畫出分子結構
- **x3dase**：3D trajectory visualization

### Notebook 中三種指令的角色

這個 Notebook 同時混合了 shell、IPython magic 與一般 Python。閱讀時先分清楚執行環境，會比較不容易把語法混在一起：

| 寫法 | 執行位置 | 用途 |
| --- | --- | --- |
| `!git clone`、`!pip install` | 系統 shell | 下載教學資料與安裝套件 |
| `%cd Tutorials` | Jupyter / IPython | 改變 Notebook 後續儲存格的工作目錄 |
| `from ase.io import read` | Python | 載入套件並開始處理原子結構 |

Notebook 將裝置設為 `cuda`，是因為原始教學以 Colab 的 NVIDIA GPU 為主。如果改在 Apple Silicon 執行，可評估 `mps`；若套件或操作不支援，再改回 `cpu`。這是執行環境的選擇，不會改變訓練資料本身。

---

## 1. Understanding the data

### 1.1 Diverse Molecular Conformations

這份資料是 carbonate molecular liquids 的 configurations，包含六種分子：

#### Cyclic carbonates

- VC：Vinylene carbonate
- EC：Ethylene carbonate
- PC：Propylene carbonate

#### Linear carbonates

- DMC：Dimethyl carbonate
- EMC：Ethyl Methyl Carbonate
- DEC：Diethyl carbonate

這些分子可以組成不同大小的 molecular clusters，包含 monomer、dimer，一直到六個 molecules 的 clusters。

---

#### 讀入 atomic configurations

```python
from ase.io import read, write
import numpy as np

db = read('data/solvent_configs.xyz', ':')
```

這裡：

```python
read('...', ':')
```

代表把 `.xyz` 裡的 **所有 configurations** 都讀進來。

此時每一個 configuration 主要只有：

- atomic number `Z`
- atomic position `R`

還沒有：

- Energy
- Forces

也就是還沒有可以拿來做 supervised learning 的 **labels**。

---

#### 辨認每個 configuration 裡有哪些 molecules

```python
from aseMolec import anaAtoms as aa

aa.wrap_molecs(db[:100], prog=False)
```

`wrap_molecs()` 會辨認哪些 atoms 屬於同一個 molecule，並加入額外資訊，例如：

- `Nmols`：這個 configuration 裡有幾個 molecules
- `Comp`：molecular composition
- `molID`：molecule ID

這段 `db[:100]` 只把前 100 個 configuration 當作示範。函式會直接替這些 ASE `Atoms` 物件補上分子資訊；若要處理完整約 5000 筆資料，Notebook 選擇直接載入預先處理好的 `solvent_molecs.xyz`，節省現場辨識分子的時間。

例如：

```text
DEC(1):EC(1)
```

表示這個 configuration 是由：

- 1 個 DEC
- 1 個 EC

組成的 dimer。

![手寫筆記：六種碳酸酯分子、configuration 與 wrap_molecs 產生的欄位](/blog/20260814-mace-practice-i/01-data-configurations.jpg)

*手寫筆記把 configuration 畫成「元素種類加上一組原子座標」。原子移動後，即使組成不變，也會形成新的 configuration。`Nmols` 回答有幾個分子，`Comp` 描述分子組成，`molID` 則把每顆原子對應到所屬分子；三者分別處理數量、種類與成員關係。*

這一步的重點是確認 training data 是否有足夠的 **diversity**。

如果資料只包含很少的 molecular environments，MLIP 就很難在沒有看過的 configurations 上做出可靠預測。

---

#### 檢查 cluster size 的分布

```python
db = read('data/solvent_molecs.xyz', ':')

Nmols = np.array([at.info['Nmols'] for at in db])

plt.hist(
    Nmols,
    align='left',
    bins=[1,2,3,4,5,6,7],
    rwidth=0.8
)
```

可以觀察不同 cluster size 的資料量。

Tutorial 的資料包含：

- 接近 1000 個 single-molecule configurations
- 超過 2000 個 dimers
- 最大到 6 molecules 的 clusters

接著還可以檢查每個 cluster size 裡，各種 molecular compositions 是否都有被 sample 到。

#### 這一節真正要理解的事情

Training data 不只是「越多越好」，還需要：

> **涵蓋模型未來可能遇到的不同 atomic / molecular environments。**

這件事情到了 Practice II 的 iterative training / active learning 會變得更重要。

---

### 1.2 Labeling Data with XTB Values

有 configurations 之後，下一步是準備 reference labels。

MLIP 主要要學：

```text
atomic species + positions -> energy E + forces F
```

這份 tutorial 使用 **GFN2-xTB** 產生：

- Energy
- Forces

真正研究中，這一步通常會換成 DFT 或其他 quantum-chemistry calculation。

---

#### 為什麼需要 isolated atom energies？

MACE 會使用 atomization energy。

其概念是：

```text
E_atm = E_tot - Σ_i E_i^0
```

其中：

- `E_tot`：整個 configuration 的 total energy
- `E_i^0`：isolated atom 的 reference energy

這個資料集含有：

- H
- C
- O

所以需要加入三個 isolated atoms：

```python
from ase import Atoms

db = read('data/solvent_molecs.xyz', ':')
db = [Atoms('H'), Atoms('C'), Atoms('O')] + db

for at in db[:3]:
    at.info['config_type'] = 'IsolatedAtom'
```

`Atoms('H')`、`Atoms('C')`、`Atoms('O')` 各自建立只有一顆原子的 ASE structure。把它們放在資料最前面並標記成 `IsolatedAtom`，MACE 才能分辨「元素本身的基準能量」與「原子形成分子後的能量差」。這也解釋了後面切 training set 時，為什麼 200 個 molecular configurations 會寫成 203 frames。

---

#### 使用 XTB 計算 Energy 和 Forces

```python
from xtb.ase.calculator import XTB

xtb_calc = XTB(method="GFN2-xTB")

for at in db[:15]:
    at.calc = xtb_calc

    at.info['energy_xtb'] = at.get_potential_energy()
    at.arrays['forces_xtb'] = at.get_forces()
```

這個 loop 的資料流可以拆成四步：

1. `at.calc = xtb_calc`：把 GFN2-xTB calculator 掛到目前的 structure。
2. `get_potential_energy()`：觸發計算並取得這個 configuration 的單一總能量。
3. `get_forces()`：取得每顆原子的三維力向量。
4. 把結果寫回 `at.info` 與 `at.arrays`，讓後續輸出的 extended XYZ 同時帶著幾何與 labels。

Notebook 只計算 `db[:15]` 作為示範，完整資料則使用已快取的標記結果。這裡的 slice 不是正式訓練資料量，而是避免教學現場花太久等待 XTB。

這裡做兩件事情。

#### Energy

```python
at.info['energy_xtb']
```

每一個 configuration 只有一個 total energy。

#### Forces

```python
at.arrays['forces_xtb']
```

每顆 atom 都有一個三維 force：

```text
F_i = (F_x, F_y, F_z)
```

所以 forces 的資料量會比 energy 大很多。

---

#### Energy 與 molecular interaction 的尺度

Tutorial 算出的 atomization energy 約為：

```text
約 -6 eV/atom
```

其中很大的部分來自 covalent bonds。

值得注意的是：

> **intermolecular / noncovalent interactions 相對 total energy 很小，但對 Molecular Dynamics 卻非常重要。**

這會直接連到 Section 3.3 的 intra/inter force decomposition。

![手寫筆記：XTB 標記流程、原子化能與 MD 中 forces 的角色](/blog/20260814-mace-practice-i/02-reference-labels.jpg)

*筆記把整條 reference-data 流程濃縮成 `atomic configuration → XTB → Energy + Forces → MACE training data`。Energy 是每個 configuration 一個值，Forces 則是每顆原子各有一個向量。MD 每一步都要依目前位置重新預測 forces，再更新原子位置，因此 force labels 的品質會直接影響 trajectory。*

手寫公式也提醒我：總能量中最大的部分常來自 isolated-atom baseline 與共價鍵結；真正控制分子彼此移動的 noncovalent interaction 尺度較小。只看整體能量或總 force RMSE，可能不足以判斷分子液體的 MD 是否可信。

---

## 2. Understanding MACE Hyperparameters and Interface

要 train MACE，主要需要指定三類資訊：

1. **Model hyperparameters**
2. **Data specification**
3. **Optimization parameters**

這些設定會放進 YAML configuration file，再交給 `mace_run_train`。

---

### 2.1 Model Parameters

#### `num_channels`

控制模型大小。

例如：

```yaml
num_channels: 32
```

Tutorial 用 32 是為了快速示範。

Notebook 給的方向是：

- `64`：較快
- `128`：推薦的一般設定
- `256`：更大的模型

通常：

> channels 越多 → model capacity 越高 → 可能更準，但計算也更貴。

---

#### `max_L`

控制 message 的 symmetry / equivariant information。

```yaml
max_L: 0
```

可先簡單理解：

- `max_L = 0`：最快，只傳 invariant information
- `max_L = 1`：速度與 accuracy 的折衷
- `max_L = 2`：通常更準，但較慢

這是對 MACE 計算成本與 accuracy 影響很大的 parameter。

---

#### `r_max`

local environment 的 cutoff radius。

```yaml
r_max: 4.0
```

代表在單一 message-passing layer 中：

> 距離超過 4 Å 的 atoms 不會直接互相溝通。

如果有多層 message passing，資訊仍可以透過中間 atoms 傳遞。

Tutorial 提到有效 receptive field 可以粗略理解為：

```text
receptive field ≈ num_interactions × r_max
```

這次預設：

```text
2 layers × 4 Å = 8 Å
```

---

#### `num_interactions`

控制 message-passing layers。

Tutorial 建議維持預設：

```yaml
num_interactions: 2
```

---

#### `correlation`

控制 many-body expansion 的階數。

預設：

```yaml
correlation: 3
```

目前不需要先把數學推導全部理解，只要知道：

> 它會影響模型能表示多複雜的 many-body atomic correlations。

---

#### `max_ell`

控制 spherical harmonics basis 的 angular resolution。

預設：

```yaml
max_ell: 3
```

它和 `max_L` 不同。

目前先理解：

> 越高可以表示更細的 angular information，但模型也會更慢。

![手寫筆記：MACE model parameters、cutoff 與 validation 的概念](/blog/20260814-mace-practice-i/03-model-parameters.jpg)

*這頁筆記把參數分成「模型容量」與「局部環境描述」兩類。`num_channels` 增加表示可承載更多 feature，但會拉高記憶體與訓練成本；`r_max`、`num_interactions`、`correlation`、`max_ell` 與 `max_L` 則決定模型怎麼接收鄰近原子、角度與 many-body 資訊。這些值互相影響，不能只把單一參數調大就假設一定更準。*

手寫筆記中「`2 layers × 4 Å = 8 Å`」適合作為理解訊息傳遞範圍的直覺圖像，但實際模型表達能力仍受結構、鄰居分布與多體特徵影響，因此不應把 8 Å 當成硬性的物理 cutoff 結論。

---

### 2.2 Optimization and Data Management Parameters

#### Training / Validation / Test

#### Training set

```yaml
train_file: ...
```

真正拿來更新 model parameters。

#### Validation set

```yaml
valid_fraction: 0.10
```

不拿來直接更新 parameters。

用途是：

- 監控 training 過程
- 判斷 generalization
- early stopping

#### Test set

```yaml
test_file: ...
```

完全獨立，在模型完成 training 後評估。

可以把三者想成：

```text
Train       → 學習
Validation  → 訓練期間檢查
Test        → 最後考試
```

---

#### `energy_key` / `forces_key`

```yaml
energy_key: "energy_xtb"
forces_key: "forces_xtb"
```

告訴 MACE：

> reference labels 在 ASE `Atoms` object 的哪一個欄位。

這兩個 key 必須和 dataset 內真正存放資料的位置一致。

---

#### `device`

```yaml
device: cuda
```

- `cpu`：CPU
- `cuda`：NVIDIA GPU
- `mps`：Apple Silicon

Tutorial 在 Colab 使用 GPU，所以選 `cuda`。

---

#### `batch_size`

```yaml
batch_size: 10
```

每次 parameter update 使用多少 configurations。

例如 training set 有 200 configs：

```text
10 configs
→ 算 gradient
→ update parameters

下一批 10 configs
→ update

...
```

---

#### `epoch`

```yaml
max_num_epochs: 100
```

一個 epoch 代表：

> 整個 training dataset 都被使用過一次。

---

#### `swa`

```yaml
swa: True
```

MACE training 中會調整 energy / force 在 loss 裡的重要程度。

Tutorial 的重點是：

> 前期先把 forces 學好，之後提高 energy contribution。

---

#### `seed`

```yaml
seed: 123
```

random seed 用來讓 training 比較容易重現。

在 Practice II 裡，seed 也會被拿來建立多個不同 initialization 的 committee models。

![手寫筆記：test set、batch size、epoch 與 SWA](/blog/20260814-mace-practice-i/04-optimization-parameters.jpg)

*這頁筆記把資料與最佳化參數分開：training set 用來更新權重，validation set 在訓練過程中監看泛化與 early stopping，test set 則留到最後評估。若有 200 筆 training data 且 `batch_size=10`，理想化地看，一個 epoch 約包含 20 次 batch update。*

SWA 階段不是單純「多訓練幾個 epoch」；在 MACE 的教學設定裡，它也會改變 loss 中 energy 與 force 的權重配置。前期先重視 forces，待 force 誤差下降後再提高 energy 的相對重要性，目的是讓兩類 supervision 都被模型妥善吸收。

---

## 3. Fitting and Testing MACE Models

### 3.1 Fitting the Model

#### 切分 training 和 test data

```python
db = read('data/solvent_xtb.xyz', ':')

write(
    'data/solvent_xtb_train_200.xyz',
    db[:203]
)

write(
    'data/solvent_xtb_test.xyz',
    db[-1000:]
)
```

`203` 的原因是：

```text
200 molecular configurations
+
3 isolated atoms
=
203 frames
```

最後 1000 configurations 則作為 test set。

---

#### 建立 YAML config

```yaml
model: "MACE"
num_channels: 32
max_L: 0
r_max: 4.0

name: "mace01"

train_file: "data/solvent_xtb_train_200.xyz"
valid_fraction: 0.10
test_file: "data/solvent_xtb_test.xyz"

energy_key: "energy_xtb"
forces_key: "forces_xtb"

device: cuda
batch_size: 10
max_num_epochs: 100
swa: True
seed: 123
```

這是一個刻意設計得比較小、比較快的 invariant MACE model。

---

#### 在 Python 中啟動 `mace_run_train`

```python
from mace.cli.run_train import main as mace_run_train_main
import sys
import logging

def train_mace(config_file_path):
    logging.getLogger().handlers.clear()

    sys.argv = [
        "program",
        "--config",
        config_file_path
    ]

    mace_run_train_main()
```

這段是把 command-line 的 MACE training interface 包進 Python function：

- `logging.getLogger().handlers.clear()`：清掉 Notebook 重複執行後可能累積的 log handlers，避免同一行 log 被印出多次。
- `sys.argv = [...]`：模擬在終端輸入 `mace_run_train --config ...` 的參數。
- `mace_run_train_main()`：呼叫 MACE CLI 的真正入口，讀取 YAML 後開始訓練。

這種包法適合互動式 Notebook，但它會改動全域 `sys.argv`。若改寫成一般研究專案，直接從 shell 執行 `mace_run_train --config config/config-02.yml` 會更清楚，也更方便留下可重現的 command history。

真正開始 train：

```python
train_mace("config/config-02.yml")
```

---

#### Training 真正發生的事情

可以把 training 流程想成：

```text
Atomic species + positions
          ↓
        MACE
          ↓
Predicted Energy / Forces
          ↓
與 XTB reference 比較
          ↓
        Loss
          ↓
Update model parameters
          ↓
下一個 batch / epoch
```

Training log 裡常看到：

- Epoch
- Energy RMSE
- Force RMSE
- Loss

理想上，隨著 training：

> prediction 與 reference 的誤差應該逐漸下降。

![手寫筆記：資料切分、MACE 訓練與參數更新迴圈](/blog/20260814-mace-practice-i/05-training-workflow.jpg)

*手寫筆記的核心迴圈是 `predict → compare → error → update parameters → predict again`。前 203 frames 包含 3 個 isolated atoms 與 200 個 molecular configurations；test set 則取資料尾端 1000 筆，讓模型在沒有參與權重更新的 configurations 上接受檢查。*

Notebook 另外會刪除舊的 checkpoint：

```python
import glob
import os

for file in glob.glob("MACE_models/*.pt"):
    os.remove(file)
```

原因是同名模型若改過 architecture，舊 checkpoint 可能無法正確恢復。這段程式只應限定在確認過的輸出資料夾中執行；正式腳本最好替每次實驗使用不同 `name` 或 run directory，保留訓練紀錄，而不是把所有 `.pt` 一次刪除。

---

### 3.2 Testing the Model: Simple RMSEs

Training error 好看並不代表模型真的可靠，所以要再使用 independent test data。

---

#### 使用 `mace_eval_configs`

```python
from mace.cli.eval_configs import main as mace_eval_configs_main
import sys

def eval_mace(configs, model, output):
    sys.argv = [
        "program",
        "--configs", configs,
        "--model", model,
        "--output", output
    ]

    mace_eval_configs_main()
```

`configs` 是要評估的 XYZ，`model` 是訓練完成的 `.model`，`output` 則是加入預測值後的新 XYZ。原始的 `energy_xtb`、`forces_xtb` 是 reference；輸出中的 MACE energy / forces 是 prediction。兩組資料保存在同一個 configuration 上，後面才能逐點比較。

接著分別 evaluation：

```python
eval_mace(
    configs="data/solvent_xtb_train_200.xyz",
    model="MACE_models/mace01_run-123_stagetwo.model",
    output="tests/mace01/solvent_train.xyz"
)
```

以及：

```python
eval_mace(
    configs="data/solvent_xtb_test.xyz",
    model="MACE_models/mace01_run-123_stagetwo.model",
    output="tests/mace01/solvent_test.xyz"
)
```

---

#### Correlation plots

Tutorial 比較三種量：

1. atomization energy per atom
2. total energy per atom
3. forces

Notebook 的 `plot_RMSEs()` 主要做三件事：

1. 用 `rename_prop_tag()` 相容不同 MACE 版本的欄位名稱。
2. 用 `ea.get_prop()` 從一批 ASE `Atoms` 中抽出 reference 與 prediction。
3. 把所有 force vectors 串成一維陣列後畫相關圖並計算 RMSE。

因此三張圖回答的是不同問題：atomization energy per atom 比較成鍵後的相對能量；total energy per atom 檢查完整能量尺度；forces 則直接檢查每個 Cartesian component，與後續 MD 的原子移動最相關。

圖的基本讀法是：

```text
X 軸：XTB reference
Y 軸：MACE prediction
```

如果 prediction 完美：

```text
y = x
```

所有 points 都會落在 diagonal line 上。

---

#### Train 和 Test 要一起看

#### Train 準，Test 也準

代表模型有比較好的 generalization。

#### Train 很準，Test 明顯較差

可能出現 overfitting。

#### Train / Test 都差

通常代表：

- data 不夠
- model capacity 不足
- hyperparameters 不適合
- training 還沒有收斂

---

#### Learning Curve

Notebook 另外建議改變 training data 數量：

- 400
- 1000
- 2000
- 4000

再觀察：

```text
Test Error vs. Training Set Size
```

這就是 learning curve。

它可以回答：

> 增加資料量到底還能不能有效改善模型？

---

### 3.3 Testing on the Intra / Inter Decomposition

這一節是在處理 molecular MLIP 很重要的問題：

> intermolecular interactions 通常比 covalent interactions 小很多，但 MD 卻高度依賴它們。

如果只看 total force RMSE，較大的 covalent forces 可能會把 intermolecular error 掩蓋掉。

因此 tutorial 把 force 拆成：

```text
f_i = f_i^trans + f_i^rot + f_i^vib
```

---

#### 1. Translational component

對 molecule `j`：

```text
F_j^trans = Σ_(k in j) f_k
```

先把 molecule 裡所有 atomic forces 加起來，得到整個 molecule 的 net translational force。

再按照 atomic mass 分回每一顆 atom：

```text
f_i^trans = (m_i / M_j) F_j^trans
```

---

#### 2. Rotational component

計算 molecule 的 torque：

```text
T_j = Σ_(k in j) (f_k × r_k)
```

再利用 inertia tensor 計算每顆 atom 對 rotation 的 contribution：

```text
f_i^rot = m_i r_i × (I_j)^(-1) T_j
```

---

#### 3. Vibrational component

剩下的 force：

```text
f_i^vib = f_i - f_i^trans - f_i^rot
```

---

#### Tutorial 的分類方式

```text
Intermolecular
= Translation + Rotation

Intramolecular
= Vibration
```

![手寫筆記：training log、RMSE correlation plot 與 force decomposition](/blog/20260814-mace-practice-i/06-testing-and-force-decomposition.jpg)

*筆記中特別標出 `RMSE_E_per_atom` 與 `RMSE_F` 的差別。Energy RMSE 常以 meV/atom 或 eV/atom 表示；Force RMSE 則比較 `F_x`、`F_y`、`F_z`。圖上 X 軸是 XTB reference、Y 軸是 MACE prediction，越靠近 `y = x` 越理想。*

force decomposition 的六個步驟則是在避免「大尺度的分子內共價力掩蓋小尺度的分子間作用」。先取得每個 molecule 的 net translation，再用 torque 與 inertia tensor 分離 rotation，最後的 residual 視為 vibration。這是一種針對 molecular systems 的診斷方法，不只是把總 force RMSE 換個畫法。

直覺上：

- molecule 整體移動 / 旋轉 → 比較反映 molecule 之間的 interaction
- bond stretching / bending / vibration → 比較反映 molecule 內部 interaction

Tutorial 的結果顯示：

> translational / rotational components 相對更難被準確 capture。

雖然它們的 absolute RMSE 可能比較小，但 relative error 可以比較大。

---

## 4. Molecular Dynamics with MACE

到 Section 4，問題從：

> 「模型在 test set 上準不準？」

變成：

> **「模型真的拿去跑 MD，會不會穩？跑出來的 dynamics 對不對？」**

這才是 MLIP 很重要的實際測試。

---

### 4.1 Is the Dynamics Stable?

Tutorial 使用 ASE 的 Langevin dynamics。

---

#### 建立 `simpleMD()`

```python
from ase.md.langevin import Langevin
from ase.md.velocitydistribution import (
    Stationary,
    ZeroRotation,
    MaxwellBoltzmannDistribution
)
```

初始速度使用：

```python
MaxwellBoltzmannDistribution(
    init_conf,
    temperature_K=300
)
```

再移除整體 translation / rotation：

```python
Stationary(init_conf)
ZeroRotation(init_conf)
```

建立 Langevin dynamics：

```python
dyn = Langevin(
    init_conf,
    1.0 * units.fs,
    temperature_K=temp,
    friction=0.1
)
```

這裡 time step 是：

```text
time step = 1 fs
```

`simpleMD()` 的參數可以這樣讀：

| 參數 | 意義 |
| --- | --- |
| `init_conf` | 起始 ASE `Atoms` configuration |
| `temp` | Langevin thermostat 的目標溫度 |
| `calc` | 每一步提供 energy / forces 的 calculator |
| `fname` | trajectory 輸出檔名 |
| `s` | 每隔多少 MD steps 記錄一個 frame |
| `T` | 總共執行多少 MD steps |

程式先用 `MaxwellBoltzmannDistribution(..., temperature_K=300)` 產生 300 K 的初始速度，再用 `Stationary()` 與 `ZeroRotation()` 移除整體平移與旋轉。接著 Langevin thermostat 把系統驅動到 `temp` 指定的溫度。因此範例中的「初始速度分布溫度」與「模擬目標溫度」是兩個不同設定。

`dyn.attach(write_frame, interval=s)` 會在 dynamics 進行中定期呼叫內部的 `write_frame()`：寫入 trajectory、記錄時間、溫度與每原子 potential energy，並更新圖表。若 `T=2000`、time step 為 1 fs，總模擬時間就是 2000 fs，也就是 2 ps；`s=10` 表示每 10 fs 記錄一次。

原 Notebook 用 `os.system('rm -rfv ' + fname)` 清掉同名 trajectory。這對一次性教學很方便，但若改成可重複使用的研究程式，應先限制輸出路徑，再以 `pathlib.Path.unlink()` 刪除單一已確認的檔案，避免檔名含空白或特殊字元時造成非預期 shell 行為。

---

#### 使用 MACE 作為 ASE calculator

```python
from mace.calculators import MACECalculator

mace_calc = MACECalculator(
    model_paths=[
        'MACE_models/mace01_run-123_stagetwo.model'
    ],
    device='cuda',
    default_dtype="float32"
)
```

`model_paths` 指向訓練完成的 stage-two model；`device='cuda'` 決定 inference 使用 GPU；`default_dtype='float32'` 則在速度與精度間取一個適合這份教學的折衷。把它指定為 ASE calculator 後，後面的 MD integrator 不需要知道神經網路細節，只需要透過 ASE 介面取得 energy 與 forces。

然後跑：

```python
simpleMD(
    init_conf,
    temp=1200,
    calc=mace_calc,
    fname='moldyn/mace01_md.xyz',
    s=10,
    T=2000
)
```

也就是：

- single molecule
- 1200 K
- 2000 MD steps
- MACE 提供 Energy / Forces

---

#### 為什麼 MD stability 很重要？

即使 fixed test set 上 RMSE 很小，MD 還是可能失敗。

原因是：

> MD 會自己一路產生新的 configurations。

一旦 trajectory 走到 training data 沒有涵蓋的 PES 區域，模型可能做出不合理 prediction。

因此：

```text
Good Test RMSE
≠
Guaranteed Stable MD
```

---

#### MACE vs XTB 的速度

Notebook 也使用相同 starting configuration 跑 XTB dynamics。

Tutorial 中：

- MACE：完整 dynamics 可在很短時間完成
- XTB：明顯更慢，所以只示範較短 trajectory

這就是 MLIP 最重要的價值之一：

> **用接近 reference PES 的 surrogate model，大幅降低 MD 中每一步計算 Energy / Forces 的成本。**

而且 MLIP inference 的成本，不會因為 reference method 原本有多昂貴而增加。

---

### 4.2 Is the Dynamics Accurate?

MD 不爆掉只代表：

> stable

但還不能直接代表：

> accurate

因此下一步要比較 MACE 與 XTB dynamics 是否 sample 到相似的 structural distributions。

Tutorial 使用 **Radial Distribution Function（RDF）**。

---

#### RDF 的基本概念

RDF 可以用來描述：

> 在距離 `r` 附近，出現某一類 atomic pair 的機率 / 分布。

例如：

- H–O
- C–O
- H–C

Tutorial 先看：

```python
tag = 'HO_intra'
```

也就是 intramolecular H–O distance distribution。

```python
rdf = aa.compute_rdfs_traj_avg(
    traj,
    rmax=5,
    nbins=50
)
```

程式從 trajectory 的第 50 個 frame 之後開始統計，目的是略過初期尚在 equilibration 的區段。`rmax=5` 設定統計到 5 Å，`nbins=50` 則把距離分成 50 個 bins。範例為了讓單分子 trajectory 能使用 RDF 工具，暫時加入 100 Å 的假週期盒；這是工具相容處理，不代表原模擬真的在高密度週期液體中進行。

實際重跑時還要確認 trajectory 檔名一致：XTB 範例輸出曾使用 `xtb_md_2.xyz`，而 RDF loop 讀取的是 `xtb_md.xyz`。原 Notebook 可能依賴預先快取的檔案；若要用自己的新結果，應統一輸出與讀取名稱，避免不小心分析到舊 trajectory。

再比較：

```text
XTB trajectory
vs
MACE trajectory
```

如果兩者 RDF peak 的：

- 位置
- 形狀
- 分布

很接近，代表兩個 dynamics sample 到相似的 molecular structures。

---

#### 為什麼不能只比較兩條 trajectory？

MD 是 chaotic system。

即使兩個 potential 都是正確的：

> 原子在每一個時間點的位置也不需要完全一樣。

所以真正比較 dynamics 時，更重要的是比較：

> **statistical distributions**

而 RDF 就是一種常用的 structural statistic。

---

### 4.3 MD of a Molecular Liquid?

這一節開始測試更進一步的問題：

> **MACE 是用 molecular clusters 訓練的，它能不能 transfer 到真正 periodic liquid environment？**

---

#### 讀入 liquid configuration

```python
init_conf = read(
    'data/solvent_liquid.xyz'
)
```

這是一個具有 periodic boundary conditions 的 liquid system。

Tutorial 指出這裡有：

> 12 molecules

比前面的 single-molecule example 大很多。

---

#### 使用 MACE 跑 liquid MD

```python
init_conf.center()

simpleMD(
    init_conf,
    temp=500,
    calc=mace_calc,
    fname='moldyn/mace01_md_liquid.xyz',
    s=10,
    T=2000
)
```

這次：

- temperature = 500 K
- periodic liquid
- 12 molecules
- MACE calculator
- 2000 steps

---

#### 為什麼這一步重要？

Training data 是：

```text
small molecular clusters
```

應用環境卻變成：

```text
periodic condensed-phase liquid
```

所以真正測試的是：

> **Transferability**

也就是：

> 模型在有限 clusters 上學到的 atomic interaction，能不能 transfer 到更大的 condensed-phase environment？

---

#### 這仍然是 open research question

Tutorial 特別提醒：

> cluster → condensed phase 的 transferability 並不是已經完全解決的問題。

如果這件事情能可靠成立，就可能建立：

```text
High-accuracy Quantum Chemistry
         ↓
small molecular clusters
         ↓
MLIP training
         ↓
periodic condensed-phase MD
         ↓
density / diffusivity / liquid structure
```

這也是 MLIP 很有研究潛力的地方：

> 使用小系統的高精度 quantum calculations，去預測更大、更長時間尺度的材料與液體性質。

---

## Practice I 的完整流程

最後可以把整份 tutorial 濃縮成：

```text
Raw Atomic Configurations
        ↓
檢查 molecular diversity
        ↓
加入 isolated atoms
        ↓
XTB 計算 Energy + Forces
        ↓
建立 labelled dataset
        ↓
設定 MACE hyperparameters
        ↓
Train / Validation / Test
        ↓
訓練 MACE
        ↓
Energy / Force RMSE
        ↓
Intra / Inter decomposition
        ↓
Single-molecule MD
        ↓
Stable?
        ↓
RDF comparison
        ↓
Accurate?
        ↓
Periodic liquid MD
        ↓
Transferability?
```

---

## 我目前對 MACE Practice I 的理解

完成 Practice I 後，我認為最重要的不是「會執行 `mace_run_train`」，而是開始理解一個 MLIP workflow 裡真正要注意的幾個問題：

### 1. Data coverage 很重要

模型只能根據它看過的 atomic environments 學習 PES。

所以 training configurations 是否夠 diverse，會直接影響後面的 stability 與 transferability。

### 2. Reference labels 決定模型在學什麼

這份 tutorial 使用 XTB。

真正研究若改成 DFT，模型學到的就是 DFT 所描述的 PES。

MLIP 並不是取代物理 reference，而是在學習並加速 reference method。

### 3. Test RMSE 只是第一關

Energy / Force RMSE 很重要，但不能單靠一個數字判斷 potential 是否可靠。

尤其 molecular systems 中，較小的 intermolecular forces 對 MD 很重要，因此還需要更細的 analysis。

### 4. Stable 和 Accurate 是不同問題

```text
Stable MD
≠
Accurate MD
```

先確認 trajectory 不會出現 unphysical failure，再利用 RDF 等 statistical properties 檢查 dynamics 是否合理。

### 5. 最終問題是 transferability

真正想把 MLIP 用在研究上，模型一定會遇到 training set 以外的環境。

因此：

> 如何知道模型什麼時候不可靠，以及如何補充 training data，

就是後續 Practice II 的核心。

---

## Practice I → Practice II

Practice I 建立了最基本的 MLIP workflow：

> **Prepare → Train → Test → MD**

Practice II 則開始處理更實際的問題：

> **當模型在 MD 裡失敗時，如何找出 failure configurations、補 training data，並利用 iterative training / active learning 改善模型。**

所以 Practice I 的重點是「建立第一個可用的 MACE」，而 Practice II 開始進入「怎麼讓 MACE 變得更可靠」。

---

## References

- MACE repository: https://github.com/ACEsuit/mace
- MACE documentation: https://mace-docs.readthedocs.io/
- MACE original paper: https://proceedings.neurips.cc/paper_files/paper/2022/file/4a36c3c51af11ed9f34615b81edb5bbc-Paper-Conference.pdf
- Tutorial molecular dataset background: https://doi.org/10.1021/acs.jpcb.2c03746
- Intra/Inter force decomposition reference: https://doi.org/10.1038/s41524-023-01100-w
