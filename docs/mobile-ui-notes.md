# 手機版 UI 調整紀錄

## 調整重點

- Header 在手機版改為 Logo 加 Menu 按鈕，展開後顯示主要導覽。
- 全站加入 box sizing、圖片與長文字防溢出規則，降低手機橫向捲動風險。
- Blog、文章內頁、Dashboard、Tasks、Weekly、Categories、Tags、Literature、Papers、Journal、About 與 Login 補強手機版留白、卡片間距與觸控尺寸。
- 長標題、長標籤、表格與程式碼區塊加入換行或局部橫向捲動處理。

## 特別處理頁面

- `/blog`：搜尋框滿版、分類篩選與標籤自然換行、文章列表手機單欄。
- `/dashboard`：摘要、任務、文章與快速入口卡片在手機版改成更清楚的單欄或兩欄。
- `/tasks`：任務 metadata 膠囊可換行，管理入口在手機版更容易點擊。
- `/weekly`：週報區塊單欄化，週次、摘要與清單間距更清楚。
- `/literature`：分析器、搜尋列、篩選器與結果卡片在手機版一欄化。

## 後續可再優化

- 用真機確認 iOS Safari 與 Android Chrome 的 Header 展開手感。
- 若管理頁使用頻率提高，可針對 `/blog/admin/`、`/journal/admin/` 與 `/tasks/admin/` 做第二輪表單體驗優化。
- 若文章圖片增加，可建立統一的圖片 caption 與手機版圖表展示樣式。
