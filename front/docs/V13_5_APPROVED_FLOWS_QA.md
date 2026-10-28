# v13.5 — 已批准拍照流程的實作與驗收

**本輪只修改 Food Management 收據拍照、Ghost Buy 商品拍照，以及兩者需要的最小資料契約/路由。** 未清除現有本地資料。沒有重新設計 Welcome、Story、Savings、Ghosty 動畫或全站色卡。

| 模組 | 步驟 | UI 操作 | 儲存點 |
|---|---|---|---|
| 收據 | 1 照片預覽 | Retake Photo、Confirm Photo | 可保留暫存照片，不增加食品 |
| 收據 | 2 Review & Edit | 自動列出 8 組測試收據的匹配商品、加減數量、Edit、Remove、Add Missing Item、Next: Confirm Items | 不增加食品 |
| 收據 | 3 最終確認 | Edit Items、Add to My Food | 僅此處執行 `receipt_confirm`，一次加入全部經確認商品 |
| 收據 | 4 成功 | Added to My Food、View My Food、Add Another Receipt | 顯示已確認的新增項目數 |
| Ghost Buy | 1 商品照片預覽 | Retake Photo、Confirm Photo | 不加入購物車 |
| Ghost Buy | 2 資料編輯 | 自動載入已知 QR 商品資料／未知則手動核對，名稱、數量、單位、必填預估價格、價格意義、選填 Note、Confirm Item | 不加入購物車 |
| Ghost Buy | 3 最終確認 | Edit Item、Add to Cart | 此處執行既有 `cart_save` 並保留商品照片 |
| Ghost Buy | 4 Cart | 已加入商品，原本結帳與 Story 操作不變 | 已存在 Cart 中 |

### 特別鎖定

- 首張照片一定等使用者按 `Confirm Photo`，不得先自動掃描或跳轉。
- 全部流程**不顯示**內部收據 ID（例如 `FW-R01`）或頂部進度指示器。
- 使用者選中文就只顯示中文 UI 字串；英文亦然，不雙語混排按鈕。
- 收據 QR 失敗不遺失圖片，不把沒有辨識到的商品當已識別。
- 最終確認以前不可寫入 My Food 或 Cart；重複確認的資料庫操作必須具備 idempotency。
- 真正的新帳號/訪客不得被預先放入 fixture 食品或購物紀錄；保留原始 8 組 QR fixture 作辨識參照。
- Ghost Buy 的 Photo 確認頁**不直接開始 Story**，仍先進 Cart → Virtual Checkout → Virtual Receipt → Story。

### 變更檔案

- `index.html`：新流程樣式引入及更新主程式 cache key。
- `styles/receipt-ghost-flow-v13-5.css`：僅新增流程畫面排版。
- `js/main.js`：照片確認才開始辨識、階段切換、資料驗證、最後提交、返回。
- `js/ui/screens/food.js`：四個收據畫面與緊湊可編輯商品清單。
- `js/ui/screens/ghost-v8.js`：商品照片、資料、摘要三頁，最後返回 Cart。
- `js/app/router.js`：收據成功頁路由。
- `js/services/catalog-service.js`、`js/domain/commands.js`：保留已識別商品 `unit`。
- `tests/`：增加新流程測試，修正舊測試在「拍完立即掃描」方面與已批准流程衝突的期待。

### 測試狀態

`npm test`：97 通過、0 失敗。部署預檢：20 靜態資源、28 個 JS 原始檔通過檢查。320/375/402/430px 的離線靜態渲染沒有水平溢出。**不能宣稱 iPhone 實機操作已驗收**；需要部署到 GitHub Pages 後在手機上測四步驟、重新拍攝、未知 QR、切換語言與最終儲存。
