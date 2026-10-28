# FoodWise v11｜VS Code 開啟與測試

## 開啟

1. 解壓 ZIP。使用 **VS Code → File → Open Folder**，選擇內含 `index.html` 的 `FoodWise-Prototype` 資料夾。
2. 安裝 VS Code Live Server（建議），在 `index.html` 右鍵 **Open with Live Server**，開啟 `http://127.0.0.1:5500/index.html`。
3. 或使用 Terminal：`python3 -m http.server 5500`（Windows：`py -m http.server 5500`），瀏覽同一網址。**不要透過 file:// 雙擊 index.html**。
4. 有 Node.js 20+ 時在 VS Code Terminal 執行 `npm test`；測試不必安裝額外 npm 套件。

## 使用者第一次開啟

- 無既有資料與訪客狀態時應看到 Welcome。按 **Continue as Guest** 可開始；新 Guest 的 My Food、Past Records、Cart、History、Story、Savings 全部為空。
- 如果沿用舊版 localhost 及瀏覽器，同一個 IndexedDB 會保留使用者自己新增的內容；這**不是**新帳號。要驗證「新使用者空白」請使用乾淨的瀏覽器設定檔，而不是重置現有資料。
- 畫面右上角可以切換中英文。全站使用確認的六色「日系奶油甜點」配色。

## 開發修改、後端交接與限制

- `docs/V10_REQUIREMENT_TRACE.md`：104 項前端規格逐條追蹤。**不是** 104 項都實機通過。
- `docs/V11_CHANGELOG.md`：此次續改內容。
- `docs/V10_BACKEND_CONTRACT.md`：Supabase／RLS／Story／Savings／影像／通知後端影響。
- `tests/v11-regression.test.js`：新增的逐項 Node 回歸測試。
- 本版本**只有前端**：登入、Google OAuth、任意商品照片 AI 辨識、任意收據 OCR、跨裝置同步、離線完整 jsQR/ZXing 套件及背景推播尚未接上真正服務。普通商品圖片不能被當成 QR 商品卡來假裝辨識成功。
- 本執行環境不允許 Chromium 連接 localhost，因此無法對真實頁面完成視覺／點擊 E2E；iOS／Android 拖曳、相機、日期和導航仍需實機驗收。

## 文件版本

此次原始碼在既有 v10 基礎上繼續修改；歷史 v8／v9 測試檔保留供比較，但其中某些針對舊 seed 資料與舊故事狀態機的斷言**不再是新版通過門檻**，不代表主測試全數失敗。最新主測試：`npm test`。
