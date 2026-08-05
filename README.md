# Kai Research Log

## 專案用途

Kai Research Log 是一個個人研究管理網站，用來整理計算化學學習、研究工具開發、文獻搜尋、每日任務、週報與研究日誌。網站目前同時保留公開閱讀頁面與本人登入後的管理入口，目標是把零散的研究過程累積成可回頭查找的資料庫。

目前網站整合的功能包含：

- 研究日誌與 Markdown 文章
- 文章分類與標籤
- 計算化學、VASP、HPC、ASE 與工具開發紀錄
- 文獻搜尋、文獻分析輔助與文獻庫
- 每日與每週任務
- 研究週報
- 研究 Dashboard

## 主要頁面

| 路由 | 用途 |
| --- | --- |
| `/` | 首頁與主要入口 |
| `/dashboard` | 研究狀態、任務、週報、日誌與文獻資料總覽 |
| `/blog` | 研究與開發日誌列表 |
| `/blog/admin` | 本人登入後撰寫與發布 Blog 日誌 |
| `/categories` | Blog 文章分類總覽 |
| `/tags` | Blog 文章標籤總覽 |
| `/journal` | 研究筆記列表 |
| `/journal/admin` | 本人登入後撰寫研究筆記 |
| `/literature` | OpenAlex 文獻搜尋與 Paper Lens 分析輔助 |
| `/papers` | 已保存文獻、閱讀狀態與分析紀錄 |
| `/tasks` | 每日與每週任務管理 |
| `/tasks/admin` | 本人登入後新增與更新任務 |
| `/weekly` | 研究週報與每週大綱 |
| `/about` | 網站目的、研究方向與工具介紹 |
| `/login` | 本人或訪客登入入口 |
| `/api/health` | Cloudflare Worker 與 D1 連線健康檢查 |

## 技術架構

- Astro 7 作為主要網站框架
- Astro Content Collection 管理 Markdown Blog 文章
- Cloudflare Workers adapter 作為部署執行環境
- Cloudflare D1 儲存任務、週報、Blog 日誌、研究筆記與文獻資料
- Cloudflare KV binding 用於登入 session
- OpenAlex API 用於文獻搜尋
- GitHub 作為版本管理與 Pull Request 工作流程
- Wrangler 管理 Cloudflare Worker、D1 與本機測試流程

## 本機開發

安裝依賴：

```sh
npm install
```

啟動本機開發：

```sh
npm run dev
```

建立正式版本：

```sh
npm run build
```

D1 資料庫初始化、seed 與 Cloudflare 人工設定請參考 [db/README.md](./db/README.md)。

## 內容管理方式

Markdown Blog 文章位於 `src/content/blog/`。每篇文章使用 frontmatter 設定 `title`、`description`、`pubDate`、`category`、`tags` 與 `draft`。其中 `draft: true` 會讓文章不出現在公開 Blog 列表、分類頁、標籤頁與 RSS；但如果 Repository 是公開的，草稿內容仍然可能在 GitHub 原始碼中被看到。

目前網站也支援本人登入後透過 `/blog/admin` 撰寫 Blog 日誌，這些日誌會寫入 D1，並在 `/blog` 與 Dashboard 中顯示。靜態分類頁、標籤頁與 RSS 目前仍以 Markdown Content Collection 為主要資料來源。

任務與週報頁面會優先讀取 D1；當 D1 binding 不可用時，會回到 `src/data/tasks.json` 與 `src/data/weekly-reports.json` 作為靜態備援資料。`db/seed.sql` 由 JSON 資料產生，主要用於初始化或補齊 D1 測試資料。

研究筆記與文獻庫目前透過 D1 儲存。圖片貼上與文獻分析內容的正式儲存方式仍應依照網站管理頁的提示與後續開發規劃確認。

## 安全與隱私

- 不要把 API Key、Cloudflare Token、帳號密碼或 `.dev.vars` 提交到 Repository。
- 不要將公司機密、未公開研究資料、私人帳號資訊或敏感實驗資料放入公開 Repository。
- `draft: true` 只是網站顯示層的過濾，不是隱私或權限保護。
- Cloudflare 的正式 secret 應在 Cloudflare Dashboard 或 Wrangler secret 中設定，不應寫入原始碼。

## 目前開發狀態

### 已完成

- Blog 文章列表、分類頁與標籤頁
- Blog 撰寫管理入口與 D1 Blog 資料讀取
- 研究筆記撰寫與列表
- 任務列表、任務管理入口與 D1 任務資料讀取
- 週報頁、週報大綱與 D1 週報資料讀取
- Dashboard 研究管理總覽
- OpenAlex 文獻搜尋、Paper Lens 分析輔助與文獻庫
- Cloudflare Workers、D1 與健康檢查 API 基礎
- 本人與訪客登入流程

### 進行中

- Blog、Journal、Literature、Papers 等名稱需要確認最終顯示方式。
- D1 Blog 尚未納入靜態分類頁、標籤頁與 RSS。
- 早期週報與 seed 資料需要人工判斷哪些是歷史紀錄、哪些是示範資料。
- 部分研究文章仍需要補上更完整的問題、解法、結論與下一步。

### 未來規劃

- 將重複的卡片、標籤、文章列表與日期格式整理成共用元件。
- 建立更完整的文獻搜尋策略與本地端分析流程。
- 改善圖片儲存流程，例如接入 Cloudflare R2。
- 強化週報從任務、日誌與文獻資料整理大綱的工作流。
- 針對 Slab Builder、VASP、HPC 等主題建立更清楚的系列導覽。
