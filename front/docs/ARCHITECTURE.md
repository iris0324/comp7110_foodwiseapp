# FoodWise Frontend v8 — 架構

| 層 | 路徑 | 責任 |
|---|---|---|
| Router / UI event orchestration | `js/main.js`, `js/app/` | 中英文、模組導航、表單、草稿、設定 |
| Data domain | `js/domain/` | Food Management commands、Ghost Buy checkout、Story v8 state machine、savings selectors |
| Storage | `js/storage/repository.js` | IndexedDB 本地 snapshot、media、樂觀 revision 檢查 |
| UI components and screens | `js/ui/`, `styles/` | Peach Jam / v8 UI cards and mobile responsive hierarchy |
| Ghosty / visual assets | `assets/ghosty/`, `assets/story-cards/` | 不同 Ghosty 表情與三條 Story 選擇插畫 |
| Scanner and sample fixtures | `js/scanners/`, `js/services/`, `data/` | QR Photo 解碼、八份可核對資料；非通用商品影像 AI |
| Future backend | `docs/BACKEND_TODO.md` | Supabase Auth/RLS/Storage、照片辨識、Web Push |

## 數量與金額語意

- 新 Cart 表單的估計價為 **unit price（每件單價）**；qty × unitCents 得到整筆估價。舊資料缺少 `priceMeaning` 時保留 total-price 歷史語意，避免無聲更改用戶價格。
- Story recap 的 food quantities 是**虛擬模擬**；`used + shared + saved + discarded + open = 原始數量`。
- Your Savings 僅使用已完成 Story 中 `Don't Buy`、`Buy Less` 的最後決策計算；沒有估計價格不產生虛構金額；`Buy as Planned` 有 History 但沒有省錢金額。
- Ghost Buy 的模擬購買永不直接寫入實際 Food Management 庫存。
- Expiry Date 是 nullable 且 user-entered；`Days Since Purchase` 根據加入 My Food 的時間，不可偷偷改為收據日期。

## Local-first 維持

版本仍使用 IndexedDB，保留現有來源 URL 的資料；在未來加入雲端同步前，必須先規劃資料遷移及對舊故事進度的相容處理，**不得清空原使用者的本機記錄**。
