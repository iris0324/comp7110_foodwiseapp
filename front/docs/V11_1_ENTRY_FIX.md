# v11.1 | Welcome 入口修正與驗收

## 已確認的缺陷
- v11 `boot()` 以舊 IndexedDB Food／Purchase／Cart 是否有資料判斷要不要顯示 Welcome。這不等於已登入、也不等於使用者選過 Guest。
- 之前本機儲存的 `fw-onboarding-v9` 能直接跳過新版本 Welcome。
- `#home` 等直接網址無全域入口保護。
- 原本有 `exit-guest` 動作，卻沒有清楚的設定頁按鈕。

## v11.1 修正
- 新建 `js/app/onboarding.js` 純邏輯入口檢查：在首次 v11.1 使用前，任何內頁 hash 一律導回 `#welcome`。
- Guest 同意後儲存版本專屬狀態，回訪可以直接進入 Home。
- 退出 Guest 時移除版本專屬狀態，重回 Welcome。
- Food Management 與 Ghost Buy Settings 都加入已批准的退出 Guest 入口。
- 直接變更 `location.hash` 也套用入口檢查。
- 不刪除或改寫既有 Food、Cart、History 等使用者資料。

## 驗收
- 新瀏覽器直接開 `/index.html` → Welcome。
- 新瀏覽器直接開 `/index.html#home` → Welcome。
- 有舊版 `fw-onboarding-v9=guest`、甚至 IndexedDB 有舊資料 → Welcome。
- Welcome → Log In → 登入 UI；Welcome → Create Account → 註冊 UI。
- Welcome → Continue as Guest → Home。
- Guest 重新整理 → 保留 Home。
- Settings → Exit Guest → Welcome。
- 未完成登入服務只顯示準確提示，不假成功。

## 瀏覽器實測狀態
- 此執行環境的 Chromium 對 localhost 及 file:// 頁面均回報 `ERR_BLOCKED_BY_ADMINISTRATOR`，所以不能宣稱實際瀏覽器點擊測試通過。
- 已執行 41 項 Node.js 測試，涵蓋入口純邏輯、Welcome 雙語與按鈕、原來 Food／Cart／Story／Savings 回歸。
- 請在 VS Code Live Server 開啟後依前述流程進行實機驗收。
