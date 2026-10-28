# FoodWise v11.1 · VS Code 開啟說明

1. 解壓縮 ZIP，在 VS Code 選擇 File → Open Folder，選擇內含 `index.html` 的 `FoodWise-Prototype`。
2. 使用 VS Code Live Server（建議右鍵 `index.html` → Open with Live Server），或在終端機執行 `python3 -m http.server 5500`。
3. 瀏覽 `http://127.0.0.1:5500/index.html`；第一次載入 v11.1 必須先看見 **Welcome to FoodWise**（Create Account、Log In、Continue as Guest）。
4. 選擇 **Continue as Guest** 後才會進到 Home；同一瀏覽器再次開啟會保留 Guest 狀態；在 Food/Ghost Settings 點 **Exit Guest / Back to Log In** 可回到 Welcome。
5. 本版只展示帳號 UI，Create Account／Log In 的真實服務尚未串接 Supabase，不會假裝登入成功。
6. 使用 `npm test` 執行前端測試；本版另外提供 `tests/v11-1-onboarding.test.js` 驗證入口規則。

### 這次入口錯誤的原因

舊版入口程式錯誤地把 `IndexedDB` 裡有食品或 Cart 資料當成「已完成首次使用」，並沿用舊的 `fw-onboarding-v9` 儲存旗標，導致使用相同網址開啟新 ZIP 時直接進入 Home。v11.1 改用獨立狀態判斷，不依賴是否存在食品資料，且不清除原有使用者資料。
