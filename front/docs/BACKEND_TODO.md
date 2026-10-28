# FoodWise — Supabase / Backend 待辦（此次前端版本不實作）

## 1. 身分、同步與安全

- Supabase Auth（可考慮匿名測試身分與正式註冊遷移）；定義每個使用者與資料的所有權。
- 每張 user-owned 表設定 Row Level Security（RLS），避免帳戶之間讀寫互相洩漏。
- 統一 local-first repository / remote adapter 介面。支援 IndexedDB 既有資料遷移、跨裝置同步、版本與衝突處理、離線重試、雙重提交去重。
- Server-side validation、request throttling、Storage access policies；絕不把 Supabase service_role key 放進前端。

## 2. 建議資料表

- `profiles`、`user_preferences`：語言、Expiry 1/3/5/7、Phone Notifications、Story Animations、Reduce Motion、Story Guidance。
- `food_items`：user_id、name、quantity、unit、category、is_starred、added_at、nullable expiry_date、status。
- `food_events`：使用、丟棄、剩餘量更改等事件與 timestamps。
- `receipt_imports` 和 `receipt_lines`：receipt fingerprint、QR payload（如有）、解析和編輯後紀錄、重複匯入防護。
- `ghost_cart_items`、`virtual_purchases`、`virtual_purchase_items`：商品快照、單價含 nullable、計劃數量、備註。
- `story_sessions`、`story_answers`、`story_outcomes`：每個商品及路線的多步分支、Ghosty 表情狀態、已用／分享／保存／丟棄／未決數量、最終完成狀態。
- `purchase_decisions`：原始預估單價／數量、最後買多少、決策類型、最後修改時間、revision。預估省錢總額從有效紀錄派生而非另外可任意寫入的數字。
- `notification_subscriptions`、`notification_events`：推播 endpoint、授權與設定、去重及發送結果。

## 3. 真正照片辨識

- Receipt Photo：上傳／OCR 或 vision 解析／候選品項／Review & Edit／確認寫入，必須支持看不清、不確定及沒有到期日的狀態，不得推測 expiry。
- Product Photo：商品圖片辨識→候選名稱／可確認之單價（不可憑空編造）→人工 Review／Add to Cart，失敗可手動錄入。
- 既有印刷 QR fixtures 作為驗證用資料，不能在主介面變成推薦商城或將固定樣本當通用圖片辨識。

## 4. 提醒

- User-entered expiry_date、可選提醒天數、`phone_notifications_enabled`。
- Service Worker / Web Push／使用者明確授權與推播訂閱／排程與時區、支持的瀏覽器、通知去重。
- Phone Notifications Off 時停止推送，**不影響 My Food 內到期紅字、排序、Days Since Purchase**。

## 5. 測試與上線

- RLS/Auth 權限測試、資料衝突和斷網恢復、QR 重複匯入、價格舍入、故事數量守恆、節省金額不重複統計。
- 照片隱私、資料儲存期限／刪除、使用者測試資料處理政策、監控與部署環境區隔。
- 真機 Chrome／Safari 相機兼容性、背景推播差異驗收。真實付款、交易、零售商品商城均不在 FoodWise Ghost Buy 需求範圍。
