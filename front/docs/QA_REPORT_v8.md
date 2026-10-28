# FoodWise v8 — 前端驗收紀錄

## 自動化（已執行）

- `npm test`：23 tests / 23 passed，0 failed。
- 覆蓋兩組原始 QR fixture JSON、QR 收據行資料核對、防止重複匯入、Ghost Buy 整組總價與 unit-price 換算。
- 540 組分支組合：Consumption amount／Purchase quantity／Storage & time × 商品數量 × 使用量 × 剩餘處置 × 保存後處置，確認模擬食物去向數量守恆。
- 檢查 Don't Buy、Buy Less、Buy as Planned 的分支差異；未知價格不虛構省錢；同一筆決策修改時不重複累加；多商品獨立進度。
- 檢查星號排序、分類、到期提醒開關獨立性、Custom Story 簡單模式，以及 Ghosty 表情／故事插畫資產存在。
- JavaScript 檔案通過 `node --check`，含 main、Story、Ghost Buy、commands 與中英文文字檔。

## 視覺（已執行的靜態預覽）

使用專案實際 HTML/CSS、390×844 CSS px 畫布輸出手機版靜態預覽並人工檢查：

- Ghost Buy 主入口與獨立 My Savings / History
- Cart 空白狀態
- Story 關鍵問題／Ghosty 對話與表情
- Choose an Item

已調整 Ghosty 裁圖以排除鄰接表情的殘影；卡片色系和文字層次已用 CSS 明確區分。

## 未能在本執行環境驗證（如實披露）

本環境管理政策阻止自動化 Chromium 導航本地 `http://127.0.0.1` 與 `file://` 網址，因此**尚未完成整個 App 的真實瀏覽器點擊 E2E、IndexedDB 真機重啟、相機、Android/iOS 權限和推播實機驗收**。不可將 Node domain 單元測試等同於手機真機驗收。

在目標手機上仍應核對：

1. 首次進入與重啟、IndexedDB 中老版本資料的進度恢復。
2. Receipt Photo QR 在目標瀏覽器是否支持 BarcodeDetector，若不支持能否手動加入。
3. Ghost Buy 兩件商品從 Virtual Receipt → Choose an Item → Story → Savings／中立完成 → Start Next Story，能否完整點擊。
4. 中文／英文及所有按鈕在 320px–430px 螢幕寬度是否可讀、是否有遮擋。
5. 通知權限與瀏覽器前景提醒行為。

## 將來 Backend

請見 `BACKEND_TODO.md`；前端目前沒有 Supabase 認證、雲端同步、任意照片 AI 辨識或關閉網頁後的背景推播。
