# 內容整理後續人工確認清單

這份文件記錄本次內容整理中無法安全自動處理的項目。原則是：只修正明確錯誤，不刪除仍可能有價值的內容，不用推測補出研究紀錄。

## 1. VASP 原始文章內容

- 問題：`src/content/blog/20260708-vasp.md` 的正文與 `src/content/blog/first-website-record.md` 高度重複，但 metadata 顯示它應該是一篇 VASP 與 Gemini 協作文章。
- 目前判斷：已檢查 `git log --follow -p -- src/content/blog/20260708-vasp.md`，歷史中沒有找到真正的 VASP 正文，只看到從網站建置文章複製後改 metadata 的紀錄。
- 建議：先將該篇設為 `draft: true`，並在正文最上方加入 HTML TODO 註記，等日後人工補回真正內容。
- 需要人工回答的問題：是否有原始 VASP 筆記、截圖、對話紀錄或計算流程可以補回這篇文章。
- 刪除或修改風險：中。直接刪除會失去 slug 與 metadata；自行補寫則可能產生不實研究紀錄。

## 2. RSS 是否納入 D1 Blog

- 問題：目前 RSS 由 `src/pages/rss.xml.js` 在 build 階段透過 Astro Content Collection 產生，D1 Blog 則需要 Cloudflare runtime binding。
- 目前判斷：本次已讓 RSS 排除 `draft: true` 的 Markdown Blog，並依 `pubDate` 由新到舊排序。D1 Blog 尚未納入 RSS，避免為了這次安全整理而重構 runtime RSS。
- 建議：未來若要讓 D1 Blog 也出現在 RSS，可以將 RSS 改成 on-demand route，並共用 Blog 列表的資料讀取邏輯。
- 需要人工回答的問題：D1 Blog 是否需要對外提供 RSS，或 RSS 只維持 Markdown 正式文章即可。
- 刪除或修改風險：中。RSS 若強行改成 runtime 讀 D1，可能影響 Cloudflare 部署與快取行為。

## 3. 歷史週報與 seed 資料

- 問題：`src/data/weekly-reports.json` 與 `db/seed.sql` 中有早期文字，例如當時提到任務與週報仍需手動修改 JSON、尚未加入登入與後台編輯功能。
- 目前判斷：這些內容看起來是 `2026-W29` 的歷史週報，而不是明確 demo 或 sample。`db/seed.sql` 也像是由 JSON 產生的初始化資料。因此本次不修改。
- 建議：若想讓公開週報更像目前狀態，可以新增一篇新的週報，或在既有週報中明確標示「這是當週歷史狀態」。
- 需要人工回答的問題：`2026-W29` 是否應被視為真實歷史週報、示範資料，還是需要改寫成目前網站狀態。
- 刪除或修改風險：中。改寫歷史週報可能讓時間線失真；刪除 seed 可能影響 D1 初始化。

## 4. Header 命名方案

- 問題：Header 同時出現中文與英文，例如「學習日誌 (Blog)」、「研究筆記 (Notes)」、「文獻導航 (Literature)」。
- 目前判斷：現有導覽可用，但名稱風格稍微混雜。這不是錯誤，因此本次只新增 `docs/naming-proposal.md`。
- 建議：下一輪由人工確認後，再統一調整顯示名稱。
- 需要人工回答的問題：導覽要維持中英並列，還是改成純中文。
- 刪除或修改風險：低。只改顯示名稱風險不高，但會影響使用者熟悉度。

## 5. Literature、Papers 與 Paper Lens 定位

- 問題：`/literature` 同時包含文獻搜尋與 Paper Lens 分析；`/papers` 則保存文獻與分析結果，兩者容易被視為重疊。
- 目前判斷：兩頁功能其實不同，`/literature` 是找文獻與分析入口，`/papers` 是保存與回顧資料庫。
- 建議：保留兩頁，但在導覽或頁面說明中更清楚區分「搜尋與分析」和「保存與管理」。
- 需要人工回答的問題：Paper Lens 是否永遠放在 `/literature`，還是未來需要獨立為 `/paper-lens`。
- 刪除或修改風險：中。移除任何一個入口都可能讓既有工作流中斷。

## 6. Blog Admin 與 Journal Admin 是否合併

- 問題：`/blog/admin` 與 `/journal/admin` 都提供撰寫器，而且都支援貼上圖片，容易讓人誤會兩者是一樣的資料。
- 目前判斷：Blog 是正式日誌，Journal 是研究筆記，應維持分開；但表單與 editor UI 可以未來整理成共用元件。
- 建議：先保留兩個資料系統，之後抽出共用撰寫元件，並在文案上清楚說明發布位置。
- 需要人工回答的問題：哪些內容應該發到 Blog，哪些內容應該留在 Journal。
- 刪除或修改風險：中高。合併資料系統可能造成既有內容遷移與權限問題。

## 7. Categories 與 Tags 是否共用元件

- 問題：分類頁與標籤頁在卡片、膠囊、文章列表樣式上有相似程式碼。
- 目前判斷：這是維護性問題，不是內容錯誤。本次不重構。
- 建議：未來可以抽出 ArchiveCard、PostPreviewCard 或 TagPill 類型的共用元件。
- 需要人工回答的問題：是否希望先保留每頁可獨立調整樣式，還是優先減少重複 CSS。
- 刪除或修改風險：低到中。抽元件本身可行，但容易影響多個頁面的細節樣式。

## 8. Slab Builder 系列導覽

- 問題：Blog 中有多篇 Slab Builder 相關文章，主題連續但目前缺少系列導覽。
- 目前判斷：這不是重複內容，而是值得強化的內容結構。
- 建議：未來可以新增一篇 Slab Builder 系列索引，或在相關文章中加入上一章、下一章連結。
- 需要人工回答的問題：Slab Builder 是否要獨立成專題頁，還是只透過分類與標籤整理。
- 刪除或修改風險：低。新增導覽不會破壞現有文章，但需要人工確認文章順序。

## 9. 未使用圖片或檔案

- 問題：內容審計中列出部分 placeholder 圖片或低風險檔案候選。
- 目前判斷：本次需求明確禁止移除無法確認是否使用的圖片，因此不刪除任何圖片或檔案。
- 建議：未來可用 build output、`rg`、圖片清單與頁面截圖一起確認，再分批刪除。
- 需要人工回答的問題：哪些 placeholder 圖片仍想保留作為備用素材。
- 刪除或修改風險：中。圖片可能沒有被程式 import，但仍可能被 Markdown 路徑、外部文件或人工流程使用。
