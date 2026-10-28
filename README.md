# FoodWise — Supabase integration

保留現有 Food Management、Ghost Buy 與 UI；登入帳號使用 Supabase，訪客繼續使用原有 IndexedDB。正式專案 comp7110 的 migration、owner RLS、Data API 與 Auth 回跳網址已套用；部署狀態以 GitHub Actions 為準。Email 登入及郵件驗證保持開啟；自訂 SMTP 尚未設定，公開註冊寄信與雙帳號登入仍須完成驗收。

## 必須手動設定

1. 在 Supabase **comp7110 → SQL Editor** 按順序執行尚未套用的 [`202610280001_foodwise.sql`](supabase/migrations/202610280001_foodwise.sql) 及 [`202610280002_api_grants.sql`](supabase/migrations/202610280002_api_grants.sql)（comp7110 已執行，勿重跑），或使用已連結正確 project 的 Supabase CLI `supabase db push`。先確認專案與備份。Migration 不刪除現有資料；不要重複直接執行同一 migration。
2. **Project Settings → Data API** 啟用 Data API，Exposed schemas 包含 `public`。這是控制台設定，SQL 無法代為切換。Migration 已建立 authenticated grants、四種 owner RLS 與 RPC 權限。Dashboard exposure toggle 會額外給 anon 權限；第二份 migration 收回這些權限。UI exposed 數量可能因此下降，實際以 authenticated API 與 RLS 驗收為準。
3. **Authentication → Providers → Email** 啟用 Email 登入，設定是否需要確認郵件；正式使用請設定 SMTP。**URL Configuration** 設定 Site URL：`https://iris0324.github.io/comp7110_foodwiseapp/`，Redirect URLs 加入同一網址及本機 `http://localhost:8080/`。確認信及重設連結應在發起請求的同一瀏覽器開啟（PKCE）。
4. 在 GitHub repository **Settings → Secrets and variables → Actions → Variables** 設定：
   - `SUPABASE_URL`：comp7110 的完整 project URL，不能由專案顯示名稱推算。
   - `SUPABASE_PUBLISHABLE_KEY`：該專案 publishable key，或舊版 `anon` key。
   這兩個值是可公開的前端設定。**禁止使用 service_role、sb_secret_ 或資料庫密碼**；build 會拒絕 secret key 與非 anon JWT。
5. GitHub Pages 的 Source 應為 GitHub Actions。Workflow 會測試、打包並發布 `front/dist`。

參考：[Supabase API grants 與 RLS](https://supabase.com/docs/guides/api/securing-your-api)、[owner RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)。

## 本機啟動與測試

需要 Node.js 22+。由 `front/` 執行：

```sh
npm ci
npm test
npm run test:backend
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY npm run build
python3 -m http.server 8080 --directory dist
```

開啟 `http://localhost:8080/`。請使用 build 後的 `dist`，原始碼需透過 esbuild 解析 SDK 套件。未提供設定時，本機 build 可測試訪客功能；CI 缺少設定會停止，不會發布無法登入的版本。QR decoder 由鎖定的 npm dependency 複製到本機資源，保留既有相機 / 收據流程。

測試包含既有前端回歸、PGlite PostgreSQL 實際 migration / CRUD / RLS（兩個帳號及 anon）、小數數量、到期日、重試去重、revision 衝突及舊資料保留。Auth 生命週期使用官方 SDK 與 mock HTTP，涵蓋註冊、錯誤密碼、登入、Session 還原、refresh 及登出；另有 `npm run test:live` 檢查真實 Auth 錯誤密碼及匿名 Data API／RPC 拒絕存取。這些檢查**不代表已通過已驗證帳號的正常登入、跨裝置持久化或雙帳號 E2E 測試**。

## 資料與安全

- `food_items` 保留原 int8 PK，加入 `client_id` 對應原前端 ID、`extra` 保存狀態 / 星號 / 位置 / 原始數量等既有欄位。`quantity` 由 int4 無損擴充為 numeric，以保留既有小數數量；存放剩餘數量，原始數量在 `extra.initialQuantity`。`expiry_date` 對應前端 `recordedDate`，分類、搜尋、到期提醒與統計繼續使用原有 selectors。
- `foodwise_state` 每帳號一筆 JSON aggregate，保存購物車、收據、事件、Ghost Buy 故事、歷史、偏好及統計來源。`foodwise_media` 保存原有照片；兩表皆有 owner RLS、Auth FK。
- RPC 為 **security invoker**，由 `auth.uid()` 決定帳號，並以 row lock + revision / epoch 檢查保護多分頁寫入。食物 CRUD、其他資料及照片同一交易提交，失敗不會留下半筆資料；重試沿用 operation ID 去重。跨裝置寫入衝突須重新載入後再操作。
- 登入帳號不讀取或上傳訪客 snapshot。原有 IndexedDB 與舊 localStorage 資料保留；草稿與提醒 key 按帳號 / guest 隔離，舊未署名草稿不自動載入。登出與跨分頁帳號切換會重新載入，避免把上一帳號畫面與未送出操作帶至下一帳號。SDK 自行管理 session / refresh。
- 沒有填入 mock 食物。八種教學商品 / QR 收據是原有 Ghost Buy 功能的靜態目錄，保留且不會自動寫入個人食物。
- Migration 保留 `user_id IS NULL` 或既有孤兒資料，它們不會顯示給任意登入者。owner FK / non-null check 採 `NOT VALID` 保留歷史列，同時限制新寫入。必須人工確認原始擁有者後才可指派，不能批次綁給目前登入者。

可於 SQL Editor 檢查未指派 / 孤兒列（不修改資料）：

```sql
select f.id, f.name, f.user_id
from public.food_items f left join auth.users u on u.id=f.user_id
where f.user_id is null or u.id is null;
```

待所有舊列都已確認並修正 owner 後，才執行：

```sql
alter table public.food_items validate constraint food_items_owner_fk;
alter table public.food_items validate constraint food_items_owner_required;
```

## 雲端驗收

設定完成後以兩個不同瀏覽器 / 帳號 A、B 驗收：註冊確認信、登入 / 重新整理保留 Session、忘記密碼與新密碼、登出。A 新增 / 編輯 / 刪除食物及收據，檢查分類、搜尋、到期日、星號、過去紀錄與 Ghost Buy 統計；刷新後資料應保留。B 看不到 A 的食物 / 照片 / state；以 B token 直接 SELECT A 資料應為空、INSERT A owner 及轉移 owner 應失敗、UPDATE / DELETE A 列不應影響資料。未登入的 anon 無法存取三張表或 RPC。最後檢查 GitHub Pages 子路徑資源與登入回跳。
