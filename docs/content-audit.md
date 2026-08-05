# 網站內容審計報告

本報告只針對目前網站內容、路由、資料檔、導覽、元件與可維護性進行審計。此 PR 不刪除文章、不修改頁面內容、不更改 JSON 資料，也不重構任何元件。

掃描範圍包含：`src/pages/`、`src/components/`、`src/layouts/`、`src/content/`、`src/data/`、`src/lib/`、`src/types/`、`public/`、`db/`、`scripts/`、`package.json`、`astro.config.mjs`、`tsconfig.json`、`wrangler.jsonc`、`README.md`、`AGENTS.md`、`CLAUDE.md`、`.gitignore`。目前沒有 `.github/` GitHub Actions 目錄。

## 1. 網站內容地圖

| 路由 | 對應檔案 | 用途 | 導覽入口 | 狀態 |
| --- | --- | --- | --- | --- |
| `/` | `src/pages/index.astro` | 首頁與主要外部工具入口 | Header、Logo | 內容已客製化，但首頁、Header、Dashboard 都提供多個入口，部分功能導覽重複。 |
| `/dashboard` | `src/pages/dashboard.astro` | 研究管理首頁，整合任務、週報、Blog、研究筆記與文獻庫 | Header、首頁、Weekly、Blog admin、Journal admin、Papers | 主要功能完整；資料來源混合 D1、JSON 與 content collection，需要更清楚說明。 |
| `/blog` | `src/pages/blog/index.astro` | 學習日誌列表、搜尋、分類篩選、日誌撰寫入口 | Header、首頁、Dashboard、Journal、Categories、Tags | 會合併 Markdown Blog 與 D1 Blog；分類與標籤篩選依合併後資料產生。 |
| `/blog/:slug` | `src/pages/blog/[...slug].astro` | 單篇學習日誌，支援 Markdown 與 D1 Blog | Blog 列表、Dashboard、分類頁、標籤頁 | 功能完整；若 slug 不存在會導回 `/blog`。 |
| `/blog/admin` | `src/pages/blog/admin.astro` | 本人登入後撰寫 Blog 日誌 | Blog、Dashboard | 功能與研究筆記編輯器高度相似，可列為未來共用元件候選。 |
| `/categories` | `src/pages/categories/index.astro` | 文章分類總覽 | Blog | 只統計 Markdown content collection，不含 D1 Blog。 |
| `/categories/:category` | `src/pages/categories/[category].astro` | 單一分類文章列表 | Blog、Categories | 只顯示 Markdown content collection，不含 D1 Blog。 |
| `/tags` | `src/pages/tags/index.astro` | 文章標籤總覽 | Blog | 只統計 Markdown content collection，不含 D1 Blog。 |
| `/tags/:tag` | `src/pages/tags/[tag].astro` | 單一標籤文章列表 | Blog、Tags | 只顯示 Markdown content collection，不含 D1 Blog。 |
| `/journal` | `src/pages/journal.astro` | 研究筆記公開列表 | Header、Dashboard、Weekly | 只讀取 D1，沒有 JSON fallback；和 Blog 名稱/用途需要在 UI 中更清楚區隔。 |
| `/journal/:slug` | `src/pages/journal/[slug].astro` | 單篇研究筆記 | Journal | 只讀取 D1 已發布筆記；D1 不可用或找不到內容時導回 `/journal`。 |
| `/journal/admin` | `src/pages/journal/admin.astro` | 本人登入後撰寫研究筆記 | Journal、Dashboard | 與 Blog admin 有大量重複 CSS、markup 與 editor script。 |
| `/tasks` | `src/pages/tasks.astro` | 任務公開列表，分今日、本週、已完成 | Header、Dashboard、Weekly | D1 優先、JSON fallback；目前 `tasks.json` 已清空，主要依 D1。 |
| `/tasks/admin` | `src/pages/tasks/admin.astro` | 本人登入後管理任務 | Tasks | 受 owner session 保護；具新增、更新、完成與清空任務能力。 |
| `/weekly` | `src/pages/weekly.astro` | 週報頁與本週自動大綱 | Header、Dashboard | D1 優先、JSON fallback；自動大綱為規則式整理，不是 AI 生成。 |
| `/literature` | `src/pages/literature.astro` | Paper Lens 本地規則式分析與 OpenAlex 搜尋 | Header、首頁、Dashboard、Papers | 頁名、導覽名稱與功能名稱不完全一致，需要統一文案。 |
| `/papers` | `src/pages/papers.astro` | 我的文獻庫，保存閱讀狀態、筆記與分析結果 | Header、首頁、Dashboard、Literature | D1 版文獻庫；訪客只看公開文獻，本人登入後看私人文獻與編輯。 |
| `/about` | `src/pages/about.astro` | 研究背景與網站用途 | Header、首頁 | 仍含明確 placeholder 文案，應補成正式自我介紹。 |
| `/login` | `src/pages/login.astro` | 本人登入與訪客登入 | Header、受保護頁 redirect | 登入功能已可用；訪客登入用途需要說明，否則可能讓使用者困惑。 |
| `/rss.xml` | `src/pages/rss.xml.js` | Blog RSS feed | Footer | 目前讀取所有 Markdown Blog，沒有排除 `draft`，也沒有包含 D1 Blog。 |
| `/api/health` | `src/pages/api/health.ts` | Worker 與 D1 健康檢查 | 無 UI 入口 | 只讀 API，適合保留。 |
| `/api/auth/*` | `src/pages/api/auth/*.ts` | 登入、登出、訪客與 session 狀態 | Login | 受 Cloudflare secrets 與 session cookie 控制。 |
| `/api/db/*` | `src/pages/api/db/*.ts` | D1 只讀資料 API | 無 UI 入口 | 公開只讀；需持續確認回傳資料不含私人內容。 |
| `/api/admin/tasks/*` | `src/pages/api/admin/tasks*.ts` | 受保護任務寫入 API | Tasks admin | 需本人 session 或 token。 |
| `/api/admin/blog/*` | `src/pages/api/admin/blog*.ts` | 受保護 Blog 寫入 API | Blog admin | 需本人 session 或 token。 |
| `/api/admin/journal/*` | `src/pages/api/admin/journal*.ts` | 受保護研究筆記寫入 API | Journal admin | 需本人 session 或 token。 |
| `/api/admin/papers/*` | `src/pages/api/admin/papers*.ts` | 受保護文獻庫與分析結果寫入 API | Literature、Papers | 需本人 session 或 token。 |

## 2. 高優先問題

高優先問題共 8 項。

### 1. `20260708-vasp.md` 正文與另一篇文章完全相同

- 問題描述：`src/content/blog/20260708-vasp.md` 的標題、description、category 與 tags 指向 VASP/Gemini，但正文和 `src/content/blog/first-website-record.md` 完全相同。這會讓讀者以為是 VASP 文章，實際讀到的是網站建置紀錄。
- 檔案路徑：`src/content/blog/20260708-vasp.md`、`src/content/blog/first-website-record.md`
- 具體位置：兩篇文章 frontmatter 後的完整正文；`20260708-vasp.md` 第 1-14 行 metadata 與正文主題不一致。
- 建議處理方式：確認 2026-07-08 當天是否有真正 VASP/Gemini 內容；若有，替換正文；若沒有，將這篇改成草稿、重新命名，或合併回網站建置文章。
- 是否安全自動修正：否，需要人工決定保留哪個版本與真正文章內容。

### 2. 分類與標籤頁不包含 D1 Blog

- 問題描述：`/blog` 已經合併 Markdown Blog 與 D1 Blog，但 `/categories`、`/categories/:category`、`/tags`、`/tags/:tag` 只使用 `getCollection('blog')`。因此後台發布的 D1 Blog 會出現在 Blog 列表，卻不一定出現在分類與標籤歸檔。
- 檔案路徑：`src/pages/categories/index.astro`、`src/pages/categories/[category].astro`、`src/pages/tags/index.astro`、`src/pages/tags/[tag].astro`
- 具體位置：上述檔案的 `getCollection('blog', ({ data }) => !data.draft)`。
- 建議處理方式：下一輪可建立共用 Blog loader，讓 Blog index、Dashboard、分類、標籤與 RSS 使用同一套資料來源策略。
- 是否安全自動修正：部分安全，但會改變路由資料來源，建議另開小 PR 測試。

### 3. RSS 未排除 draft，且未包含 D1 Blog

- 問題描述：`src/pages/rss.xml.js` 使用 `getCollection('blog')`，沒有排除 `draft: true`。目前文章都不是 draft，但未來若新增草稿，RSS 可能意外公開。同時 RSS 也不會包含 D1 Blog。
- 檔案路徑：`src/pages/rss.xml.js`
- 具體位置：第 6 行 `const posts = await getCollection('blog');`
- 建議處理方式：至少改成排除 draft；若要完整一致，後續可把 D1 Blog 也加入 RSS。
- 是否安全自動修正：排除 draft 是安全小修；加入 D1 Blog 需要配合 server route 策略。

### 4. 週報資料仍描述已完成功能為未完成

- 問題描述：`weekly-reports.json` 與 `db/seed.sql` 中仍寫著「任務與週報仍需手動修改 JSON」、「尚未加入登入與後台編輯功能」、「週報尚未能自動從任務資料產生」。目前網站已有登入、任務後台、Blog/Journal 後台、D1 與自動週報大綱，這些文字若出現在正式週報會造成過時印象。
- 檔案路徑：`src/data/weekly-reports.json`、`db/seed.sql`
- 具體位置：`src/data/weekly-reports.json` 第 18-27 行；`db/seed.sql` 第 40-45 行。
- 建議處理方式：確認這份週報是歷史紀錄還是最新狀態。如果是歷史紀錄，可加入「當週狀態」文字；如果被當成最新週報，應更新為目前實際狀態。
- 是否安全自動修正：否，需要人工判斷是否保留歷史語境。

### 5. README 仍是 Astro Starter Kit 範本

- 問題描述：`README.md` 仍寫 `Astro Starter Kit: Blog` 與範本說明，沒有描述目前研究管理網站、Cloudflare Workers、D1、登入、Blog/Journals/Papers 工作流。
- 檔案路徑：`README.md`
- 具體位置：第 1-63 行。
- 建議處理方式：改寫成專案 README，包含功能地圖、本機啟動、Cloudflare/D1 設定、資料來源、登入 secrets 與部署流程。
- 是否安全自動修正：是，但應另開文件更新 PR。

### 6. About 頁仍含 placeholder 語氣

- 問題描述：About 頁開頭仍寫「這裡先放一版研究定位與網站介紹文字，之後可以再依課程、實驗室與研究題目細修。」這是公開頁面，會讓網站看起來尚未完成。
- 檔案路徑：`src/pages/about.astro`
- 具體位置：第 108 行。
- 建議處理方式：替換成正式研究背景介紹，例如目前研究方向、使用工具、網站目的與未來更新方式。
- 是否安全自動修正：部分安全，但正式自我介紹最好由本人確認。

### 7. Header 導覽過長且中英混用

- 問題描述：Header 目前有 10 個主連結，且格式為「中文 (English)」。功能增加後，首頁、Dashboard 與 Header 都提供大量入口，手機版可能顯得擁擠，也會讓新使用者不知道優先從哪裡開始。
- 檔案路徑：`src/components/Header.astro`
- 具體位置：第 10-19 行。
- 建議處理方式：將 Header 保留高頻公開入口，例如首頁、儀表板、日誌、文獻、關於；管理入口放 Dashboard 或登入後區塊。
- 是否安全自動修正：否，需要人工決定資訊架構。

### 8. 文獻功能命名與使用流程不夠一致

- 問題描述：同一組功能在不同位置被稱為「文獻導航」、「文獻總結系統」、「文獻搜尋」、「Paper Lens」、「我的文獻庫」。這些名稱都合理，但目前缺少清楚層次，可能讓使用者不知道 `/literature` 與 `/papers` 的差異。
- 檔案路徑：`src/components/Header.astro`、`src/pages/index.astro`、`src/pages/dashboard.astro`、`src/pages/literature.astro`、`src/pages/papers.astro`
- 具體位置：Header 第 16-17 行；首頁文獻卡片；Dashboard quickLinks；Literature h1；Papers h1。
- 建議處理方式：統一文案，例如「文獻導航：搜尋與本地分析」和「文獻庫：保存與閱讀狀態」。在 `/literature` 頁首加一段簡短流程說明。
- 是否安全自動修正：部分安全，但命名策略最好先確認。

## 3. 重複內容候選

重複內容候選共 8 項。

| 內容 A | 內容 B | 重複原因 | 建議保留方式 | 信心程度 |
| --- | --- | --- | --- | --- |
| `src/content/blog/first-website-record.md` | `src/content/blog/20260708-vasp.md` | 正文完全相同，但 metadata 不同；其中一篇疑似貼錯內容。 | 保留網站建置文，另補 VASP/Gemini 正文或將錯誤文章改草稿。 | 高 |
| `src/pages/blog/admin.astro` | `src/pages/journal/admin.astro` | 編輯器 UI、圖片插入、表單、列表、訊息處理高度相似。 | 未來抽成共用 RichTextEditor 與 admin shell，但目前不要急著重構。 | 高 |
| `src/pages/categories/[category].astro` | `src/pages/tags/[tag].astro` | 文章列表 markup、卡片樣式、返回連結幾乎相同。 | 未來抽成共用 archive list component。 | 高 |
| `src/pages/weekly.astro` 的已儲存週報 | `src/pages/dashboard.astro` 的最新週報 | Dashboard 摘要週報合理重複，但若完整文字越來越多，可能和 Weekly 頁重疊。 | Dashboard 保留摘要與前三項，完整內容留在 Weekly。 | 中 |
| `src/pages/tasks.astro` 任務卡 | `src/pages/dashboard.astro` 任務卡 | 狀態、優先、分類、tags 呈現邏輯重複。 | 未來建立 TaskCard 與 label helper。 | 中 |
| `src/data/weekly-reports.json` | `db/seed.sql` | seed SQL 由 JSON 產生，內容重複且可能不同步。 | 保留 JSON 作 fallback，seed 由 script 重新產生；避免人工手改 seed。 | 高 |
| Header、首頁功能卡、Dashboard quickLinks | 多頁入口都列出同一批主要功能 | 入口重複不是錯，但可能讓新使用者不知從哪裡開始。 | Header 簡化，Dashboard 作完整功能中心，首頁作公開導覽。 | 中 |
| 三篇 Slab Builder Pro 文章 | `20260709`、`20260710`、`20260713` | 是連續開發紀錄，不是重複，但主題相近且可形成系列。 | 不合併正文，建議加系列導覽或「上一篇/下一篇」。 | 低 |

## 4. 過時或不一致內容

- `README.md` 仍是 Astro starter template，已不符合目前研究管理平台狀態。
- `src/pages/about.astro` 仍保留「先放一版、之後細修」語氣。
- `src/data/weekly-reports.json` 與 `db/seed.sql` 的週報文字描述舊狀態，和目前 D1、登入、後台與自動週報大綱不一致。
- `first-website-record.md` 與 `20260708-vasp.md` 都寫 Cloudflare Pages，但目前 `astro.config.mjs` 與 `wrangler.jsonc` 顯示網站使用 Cloudflare Workers adapter。歷史文章可保留，但若是最新說明需補註。
- `/blog`、`/dashboard` 可顯示 D1 Blog，但 `/categories`、`/tags` 與 `/rss.xml` 還沒有完整納入 D1 Blog。
- `/journal/admin` 預設分類是「研究日誌」，但公開頁名是「研究筆記」，容易和 `/blog` 的「學習日誌」混淆。
- Header 連結採中文加英文括號，頁面內有些按鈕只用中文，有些頁面又出現 Paper Lens、OpenAlex 等英文名稱；可以建立命名規則。
- `src/components/Header.astro` 匯入 `SITE_TITLE` 但未使用，是小型未使用 import 候選。
- `src/pages/rss.xml.js` 沒有 draft filter，未來草稿文章可能被 RSS 公開。
- `src/pages/literature.astro` 描述可「嘗試讀取 pdf」，但若 PDF 文字被壓縮需要貼上文字；建議讓限制說明更靠近上傳區或加上簡短範例。

## 5. 建議新增的內容

建議新增內容共 12 項。

| 內容 | 等級 | 建議位置 | 說明 |
| --- | --- | --- | --- |
| 專案 README | 必要 | `README.md` | 說明網站目的、主要頁面、本機啟動、D1、登入 secrets、部署與資料來源。 |
| Blog 與研究筆記差異說明 | 必要 | `/blog`、`/journal`、Dashboard | 讓使用者知道 Blog 是公開整理文章，Journal 是較自由的研究筆記。 |
| 文獻工作流說明 | 必要 | `/literature`、`/papers` | 交代「搜尋 -> 本地分析 -> 儲存到文獻庫 -> 週報整理」的流程。 |
| 資料來源與更新方式 | 必要 | Dashboard 或 README | 解釋哪些資料來自 D1，哪些仍保留 JSON fallback 或 Markdown。 |
| 公開/私人資料提醒 | 必要 | Login、Papers、Admin 頁 | 說明公開頁、訪客、本人登入、private paper 的資料可見範圍。 |
| About 正式研究背景 | 建議 | `/about` | 補上研究背景、工具、研究題目、目前階段與聯絡/展示目的。 |
| Dashboard 使用導覽 | 建議 | `/dashboard` | 用短句說明儀表板適合每日從哪裡開始。 |
| Literature 推薦分數解釋 | 建議 | `/literature` | 解釋引用數、年份、Open Access、推薦理由如何產生。 |
| Weekly 自動大綱限制 | 建議 | `/weekly` | 說明目前為規則式整理，不等於 AI 生成完整週報。 |
| 空資料狀態下一步 | 建議 | Tasks、Journal、Papers、Weekly | 空狀態可直接提供「去新增任務/筆記/文獻」入口與原因說明。 |
| 功能路線圖 | 可選 | README 或 `/about` | 列出 R2 圖片、文獻定期掃描、本地模型、週報產生等未來方向。 |
| 專有名詞小字典 | 可選 | `/about` 或獨立文件 | 解釋 DFT、VASP、HPC、ASE、Slab、OpenAlex、D1 等縮寫。 |

## 6. 可以刪除的內容候選

以下只列為候選，不建議本 PR 刪除。

| 檔案 | 原因 | 是否確認未被引用 | 刪除風險 |
| --- | --- | --- | --- |
| `src/assets/blog/dummy.txt` | 1 byte 空檔，搜尋未見引用。 | 是，`rg` 未找到引用。 | 低 |
| `public/blog/20260709/1.txt` | 1 byte 空檔，搜尋未見正式引用。 | 是，`rg` 未找到引用。 | 低 |
| `public/blog/20260710/1.txt` | 1 byte 空檔，搜尋未見正式引用。 | 是，`rg` 未找到引用。 | 低 |
| `public/blog/20260706/260706-1` | 1 byte extensionless 檔案；同資料夾已有 `260706-1.png` 並被文章引用。 | 是，`rg` 未找到 extensionless 路徑引用。 | 低 |
| `src/assets/blog-placeholder-2.jpg` | 未見 import 或路徑引用。 | 是，`rg` 未找到引用。 | 低 |
| `src/assets/blog-placeholder-3.jpg` | 未見 import 或路徑引用。 | 是，`rg` 未找到引用。 | 低 |
| `src/assets/blog-placeholder-4.jpg` | 未見 import 或路徑引用。 | 是，`rg` 未找到引用。 | 低 |
| `src/assets/blog-placeholder-5.jpg` | 未見 import 或路徑引用。 | 是，`rg` 未找到引用。 | 低 |
| `src/assets/blog-placeholder-about.jpg` | 未見 import 或路徑引用。 | 是，`rg` 未找到引用。 | 低 |
| `src/assets/blog/20260628-1.png` | 未見 import 或正式引用；public 目錄已有同名文章圖片。 | 未完全確認，因檔名也出現在 public 圖片引用中。 | 中 |
| `public/blog/20260710/20260710-3.png` | 文章未引用，但可能是當天素材之一。 | 是，`rg` 未找到引用。 | 中 |

## 7. 可以合併的元件或樣式

- 頁面基本排版：多個頁面重複 `.page-title`、`.page-desc`、`main` max-width 與 RWD 樣式。
- 膠囊樣式：`.pill`、`.pill-dark`、`.pill-light` 在 Dashboard、Tasks、Weekly、Journal、Papers、BlogPost 等多處重複。
- 卡片樣式：任務卡、週報卡、文章卡、文獻卡都使用白底、淡灰 border、陰影與小圓角，可抽成共用 class 或 component。
- 文章列表：`/blog`、分類頁、標籤頁、Dashboard 最新日誌都有類似 post card markup。
- 任務狀態翻譯：`statusLabels`、`priorityLabels`、`typeLabels` 在 Tasks、Tasks admin、Dashboard 重複。
- 文獻閱讀狀態翻譯：`readingStatusLabels` 和 `statusLabels` 可集中到 helper。
- 日期格式化：Markdown Blog 使用 `FormattedDate`，Journal 和部分 D1 資料用 `Intl.DateTimeFormat` 或字串，未來可統一。
- Rich text editor：Blog admin 與 Journal admin 的表單、工具列、圖片插入、列表載入與錯誤訊息高度相似。
- API 錯誤文案：admin pages 都有 `readError` 類似邏輯，可共用前端 helper。

## 8. 建議的網站結構

建議維持現有路由，不需要大幅更名；先用文案與導覽層級整理即可。

- 公開核心入口：`/`、`/dashboard`、`/blog`、`/literature`、`/papers`、`/about`
- 研究紀錄：`/blog` 放正式整理後的學習日誌；`/journal` 放較自由、可快速保存圖片與觀察的研究筆記
- 歸檔瀏覽：`/categories`、`/tags` 作為 Blog 的主題瀏覽；下一階段應納入 D1 Blog
- 任務與週報：`/tasks` 顯示當前與歷史任務；`/weekly` 顯示規則式自動大綱與已儲存週報
- 文獻流程：`/literature` 負責搜尋與本地分析；`/papers` 負責保存、閱讀狀態、私人/公開可見性與分析結果
- 本人管理入口：`/login`、`/tasks/admin`、`/blog/admin`、`/journal/admin`，建議從 Dashboard 或登入後狀態區進入
- API 分層：`/api/health` 健康檢查；`/api/auth/*` 身分；`/api/db/*` 公開只讀；`/api/admin/*` 受保護寫入

理想導覽可以簡化成：首頁、儀表板、日誌、文獻、關於、登入。任務、週報、研究筆記、分類、標籤、文獻庫可放 Dashboard 或各功能頁內互相連結。

## 9. 建議執行順序

### 第一批：安全的小型修改

1. 改寫 `README.md`，讓它符合目前網站功能與 Cloudflare/D1 狀態。
2. 處理 `20260708-vasp.md` 與 `first-website-record.md` 完全重複的正文問題。
3. 修正 `/rss.xml`：先排除 `draft: true`，再評估是否納入 D1 Blog。
4. 把 About 頁 placeholder 文案改成正式介紹。
5. 更新或標註 `weekly-reports.json` 與 `db/seed.sql` 中的過時週報文字。
6. 移除已確認未引用且低風險的 1 byte 空檔與未使用 placeholder 圖片。

### 第二批：需要人工確認

1. 決定 Header 是否要簡化，以及是否保留中英並列命名。
2. 決定 Blog、研究筆記、研究日誌三個名稱的邊界與顯示方式。
3. 決定 `/literature`、Paper Lens、文獻導航、文獻總結系統、文獻庫的正式命名。
4. 決定歷史週報是否要保留當時語氣，或改成目前狀態說明。
5. 決定哪些文章需要系列導覽、交叉連結或合併。

### 第三批：未來功能

1. 建立共用 Blog loader，讓 Blog、Dashboard、Categories、Tags、RSS 對 D1 與 Markdown 的處理一致。
2. 抽共用卡片、膠囊、文章列表、任務卡與 rich text editor 元件。
3. 加入更完整的文獻工作流說明與推薦分數解釋。
4. 將 Blog/Journal 圖片從 data URL 逐步移到 Cloudflare R2 或其他資產儲存。
5. 改善週報產生流程，讓任務、Blog、Journal、Papers 能更穩定地彙整成週報草稿。
6. 評估是否加入 GitHub Actions，在 PR 自動執行 `npm run build`。
