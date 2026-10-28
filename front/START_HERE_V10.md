# FoodWise v10 — VS Code 快速啟動

## 1. 在 VS Code 打開

選擇 `File → Open Folder…`，打開 ZIP 解壓後的 **`FoodWise-Prototype`** 資料夾（這個資料夾內有 `index.html`、`js/`、`styles/`、`assets/` 和 `tests/`）。

## 2. 啟動

請不要直接雙擊 `index.html` 用 `file://` 開啟；QR fixture JSON 與 ES Modules 需要 HTTP。

VS Code 的 Live Server 擴充功能：在 `index.html` 上按右鍵 → **Open with Live Server**，瀏覽 `http://127.0.0.1:5500/index.html`。

不安裝擴充功能也可：在 VS Code Terminal 執行 `python3 -m http.server 5500`（Windows 可用 `py -m http.server 5500`），再在瀏覽器開同一網址。

## 3. 自動測試

有 Node.js 20+ 時在 Terminal 執行 `npm test`；此專案**不需要** `npm install` 即可執行領域回歸測試。

## 4. 你的資料與測試 QR

- 新瀏覽器／新 Guest 的 Food、Past Records、Cart、History、Savings 和 Story 都是空的；不會寫入八組測試資料。
- 既有 IndexedDB 使用者資料不會因為此次更新而整庫刪除。以前有 `source=sample` 標記的示例食品會在目前畫面排除、下次寫入時清除。
- 瀏覽器資料按同一瀏覽器設定檔隔離；這**不是**真實帳號與雲端同步。
- 收據／商品 8 組 QR fixtures 只供測試；一般商品照片 AI 識別、任意收據 OCR、後台推播目前仍不可用。

## 5. 如果發現不一致

逐項對照 `docs/V10_REQUIREMENT_TRACE.md`，並參照 `docs/V10_BACKEND_CONTRACT.md` 對照哪些要待後端才能完成。

## 6. 注意

Account Create／Log In 顯示真實的「尚未串接帳號服務」提示，不會以虛假登入成功取代 Supabase Auth。
相機需要 localhost 或 HTTPS 加上瀏覽器授權；仍需要 iOS／Android 實機驗收。
