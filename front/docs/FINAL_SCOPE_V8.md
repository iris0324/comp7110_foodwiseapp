# FoodWise v8 — 規格與交付檢查

本文件對照本段對話中確認的 FoodWise v7.1 Peach Jam 新版需求；主要 UI 面向日常使用，不展示開發者批次號碼或測試商品推薦商城。

## UI 和品牌

- Ghosty + FoodWise；Food 暖棕、Wise 珊瑚；沒有 A LITTLE CARE, EVERY DAY 標語。
- Home / Food Management / Ghost Buy、Receipt Review、Cart、Stories、Results、My Savings、History、兩套 Settings 保有有意義的卡片層次、配色和文案。
- Story 選項以三張插畫取代 01／02／03；保存 Ghosty 的多張獨立表情素材，避免故事固定同一張圖片。
- 全站中文／英文可切換；My Food 分類卡固定：果蔬 `#E6F2E3`、乳製品 `#E5F0FC`、肉蛋海鮮 `#FBE8E4`。

## Food Management

- Add Manually 保留現有流程；收據照片／相簿 → QR 對應資料 → Review & Edit → My Food。
- Expiry Date 選填，不猜日期、不自動丟棄。Days Since Purchase 固定顯示，從加入 My Food 的時間計算。
- 星號優先、接近到期依日期、其餘最早加入優先；1／3／5／7 天提醒預設 5 天，無論手機通知開關如何，頁內狀態持續存在。
- 兩個真正內容頁：How Food Management Works、About FoodWise。

## Ghost Buy

- 主畫面 Start Ghost Buy 為主入口；My Savings 和 History 為分開、較次要的入口。
- Cart 只有使用者實際新增的虛擬商品，不顯示八張測試 QR 商品做為商品推薦；移除 Save Draft 及離開三按鈕彈窗。
- 手動新增只需要 Item Name、Quantity、Estimated Unit Price（AUD，可空）、Note（可空）。編輯保留本地草稿。
- Virtual Receipt 顯示日期、品名、數量、預估金額；同一 Start Story 按鈕，1 件直入 Story，2+ 件先 Choose an Item。
- 三條 Story 各有問法與情境 Ghosty 對話，答題後按分支進入剩餘食物處理；Ghosty 表情隨選擇改變。
- Story Result 僅在選擇與對話完成後顯示；`Had + Shared + Saved + Discarded + Undecided = 原商品數量`。這是虛擬模擬，而非真的吃了或丟了。
- 最終 `What Will You Do Next?`：Don't Buy / Buy Less / Buy as Planned。只有前兩者進 Your Savings；後者正常完成，不要求再考慮。
- My Savings 彙總已完成的預估節省，History 保存包括 Buy as Planned 在內的所有虛擬購物與 Story 決定。進度與金額不得重複累加。
- 仍有其他未完成商品：Start Next Story → Choose an Item；否則 Done for Now。

## 自動化檢查

- `npm test`：新版 v8 邏輯與 QR 靜態整合測試 **23/23 通過**。
- 包含 **540 個 Story 分支組合**，依使用量、剩餘處置、未來處置及路線檢查數量守恆。
- 額外靜態手機版頁面預覽：Ghost Buy、Cart、Story、Choose an Item，檢查了典型 390 × 844 版面。
- 舊 `tests/domain.test.js` 基於 v7 drag-to-feed／舊 Seed／舊價錢定義，部分測試與 v8 已確認的新流程衝突；保留作為歷史差異材料，不能當成 v8 回歸標準。
- **尚未通過目標手機實機 E2E**：現有環境阻止自動化 Chromium 開啟本機 HTTP/File URL。需在 VS Code Live Server 和手機自行驗證相機、通知權限、捲動、完整點擊。

## 真實能力與預留接口

- 照片：瀏覽器 QR 可讀取現有 fixture；任意商品辨識與真實 OCR 需要未來辨識 API。
- Push：授權／頁面開啟通知可使用；背景 Web Push 需要後續服務。
- 本地儲存採 IndexedDB，沒有 Supabase 認證、同步或後端請求。
