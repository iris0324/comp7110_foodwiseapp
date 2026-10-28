# FoodWise｜前後端資料契約（v11 前端交接版）

> **狀態：設計規格，不代表已部署。** 本 ZIP 是瀏覽器 IndexedDB Prototype；它沒有 Supabase 帳號、影像 AI 辨識 API、後台排程或正式 Web Push。請勿把下列資料表描述為已存在。

## 1. 確定的用戶規則

- 首次進站看 Welcome：Create Account / Log In / Continue as Guest。新身份資料集必須全空：foodItems、foodEvents、cart、drafts、purchases、purchaseItems、stories、outcomes、receiptImports、Savings AUD $0。QR fixtures **不得**作為用戶資料 seed。
- 用戶食品只有自己手動加入或審核收據後確認的記錄。`expires_on` nullable，禁止推測到期日和自動丟棄；Days Since Purchase 以記錄加入日期為基準，另存可選的實際購買日以備未來使用。
- Ghost Buy 每件商品必須有 name、quantity (>0)、estimated unit price (AUD cents, >=0)；Note optional。拍照辨識不得自行捏造價格。
- Checkout 保存**不可變快照**；修改 Cart 不影響已建 Receipt。
- 三條批准的 Story（amount、quantity、time）加 simple custom。不同路線用自己的步驟和分支。任何此前答案改變，都必須使後續不相容結果、Ghosty 互動完成旗標及 savings 失效。
- Ghosty 接收到的應是**餘量**。例如 planned 2、used 1、shared 0，remaining 1；處理 discarded 時只移動 1。保存、分享、丟棄及全部用完走不同畫面。
- 最後決定嚴格只有 buy_as_planned / buy_less / dont_buy。Buy Less 輸入**最後實際購買數量**，不是減少數量；節省金額以已確認估價計算。不要增加新的固定比例。
- My Savings 由每件完成 Story 最新有效的決定即時計算／以 View 派生；Buy as Planned = 0 但留在 History。購買模擬不會自動加入 My Food。

## 2. Supabase 建議表及關係

| Table | Primary key / FK | 必要字段／索引／約束 |
|---|---|---|
| `profiles` | `user_id uuid PK REFERENCES auth.users` | locale, created_at, updated_at |
| `user_preferences` | `user_id PK` | near_expiry_days CHECK IN (1,3,5,7), phone_notifications, story_animations, reduce_motion, story_guidance |
| `food_items` | `id uuid PK`, `user_id FK` | name, category enum/code, quantity numeric CHECK >0, unit, added_at timestamptz, purchased_on nullable date, expires_on nullable date, is_favorite, status ('available','used_up','discarded'), source ('manual','receipt') |
| `food_events` | `id PK`, `user_id`, `food_item_id FK` | event_type, amount_before, amount_after, happened_at. Used Up / Discarded 與 event 插入在同一 transaction |
| `receipt_imports` | `id PK`, `user_id` | fingerprint, source, QR payload hash, status ('draft','confirmed'), confirmed_at. `UNIQUE(user_id,fingerprint)` 用於已確認收據或用 partial unique index |
| `receipt_rows` | `id PK`, `receipt_id FK`, `user_id FK` | corrected name, quantity, unit, category, expiry nullable. 確認前編輯，確認後生成 food_items |
| `ghost_cart_items` | `id PK`, `user_id FK` | name, quantity, unit_price_cents NOT NULL, note, photo_ref nullable, updated_at |
| `virtual_checkouts` | `id PK`, `user_id FK` | created_at, estimated_total_cents, status |
| `checkout_items` | `id PK`, `checkout_id FK`, `user_id FK` | immutable name_snapshot, quantity_snapshot, unit_price_cents_snapshot, total_cents_snapshot |
| `story_sessions` | `id PK`, `user_id`, `checkout_item_id FK` | route (amount/quantity/time/custom), schema_version, revision integer, current_step, status, completed_at, custom_story_text nullable |
| `story_answers` | `id PK`, `story_session_id FK`, `user_id FK` | step_key, answer JSONB checked server-side, answer_order, answer_revision, created_at |
| `story_results` | `story_session_id PK`, `user_id FK` | used_qty, shared_qty, saved_qty, discarded_qty, undecided_qty, remaining_action, activity_completed_at; all quantities nonnegative |
| `purchase_decisions` | `id PK`, `user_id`, `story_session_id UNIQUE FK` | type, original_qty, **final_qty**, original_total_cents, final_estimate_cents, savings_cents, version, completed_at; do not insert additional rows on revision |
| `private_media` | `id PK`, `user_id FK` | Storage bucket/path, purpose (receipt/product), created_at, expires_at, processing_status |
| `push_subscriptions` | `id PK`, `user_id FK` | endpoint hash, subscription JSON encrypted/protected, timezone, enabled, last_seen_at |
| `notification_jobs` | `id PK`, `user_id FK`, `food_item_id FK` | reminder_date, send_status; dedupe unique (user_id, food_item_id, reminder_date, kind) |

Every private table must have `user_id` indexed; every inserted parent FK must belong to same user. A `user_id = auth.uid()` RLS predicate is necessary but **not sufficient** for join ownership unless parent relationships are verified in policies/functions.

## 3. Client↔server operations

| Workflow | Transaction / endpoint expectation | Retry / error conditions |
|---|---|---|
| Guest → account | Choose strategy first: local import on signup **or** Supabase anonymous identity upgrade. Explicit conflict review when logging into an existing account | stable UUID, idempotency key, never merge silently |
| Save Food / Food Event | `upsert_food_item`, `complete_food_item` transactions | invalid qty, cross-user food_id, conflict revision |
| Photo → QR → receipt review | pixel decode on client; parse supported format on service; return *proposed* rows only | QR may contain only verification URL, unsupported receipt, wrong receipt, duplicate fingerprint |
| Confirm receipt | `confirm_receipt(import_id, corrected_rows, idempotency_key)` | all-or-nothing food row creation, unique fingerprint check |
| Product recognition | Signed upload → Edge Function → trusted recognition provider → candidates; **never auto commit cart** | confidence low, wrong photo, rate limit, price unavailable |
| Checkout | `checkout_cart(idempotency_key)` creates immutable snapshots and one story session per item | invalid/missing unit price, concurrent cart edit, repeated POST |
| Story step | `save_story_answer(session_id, expected_revision, choice)` validates against versioned story schema | stale revision, disallowed value, conditional branch no longer valid |
| Story back | `rewind_story(session_id, target_step, expected_revision)` | invalidates later answers, result, ghost completion state and decision; recompute from authoritative answers |
| Finish Story | `finalize_decision(session_id, type, final_qty, expected_revision, idempotency_key)` | last qty 0 for don't buy, original qty for as planned, `0 < final < original` for buy_less; single-item packaging rules |
| My Savings | SQL view / query over one latest finalized decision per session | cents integer, owner isolation, no double accumulation |
| Notifications | Scheduler over subscribed users & eligible food dates | timezone, consent, dedupe, subscription expiration |

## 4. Quantity / money invariants

- Use Postgres `numeric` for food quantities with a declared finite precision; agree on units before syncing. All quantities ≥0 and `used + shared + saved + discarded + undecided = original` for completed story result. A *shared* item is not also counted as currently remaining. Remaining **before disposition** is `original − used`; handing over is only this remainder, not the original amount.
- Persist AUD prices as integer cents (`bigint` if high limit) or `numeric(12,2)`, never IEEE-754 floats. Snapshot: `original_total_cents = original_quantity × confirmed_unit_price_cents` subject to supported fractional-unit rounding policy.
- `buy_as_planned`: `final = original`, `savings = 0`. `dont_buy`: `final = 0`, `savings = original_total`. `buy_less`: `0 < final < original`, `savings = original_total − confirmed_new_estimate`. If units/package size change, require user-confirmed new estimated price; don't invent split-unit price.
- `purchase_decisions.story_session_id UNIQUE` plus transactional upsert prevents double counted savings. Replays must be idempotent; editing decision re-computes same row.

## 5. Auth + security + privacy

- Auth: email/password, verification, Google OAuth, password reset, logout, session refresh. No password columns in application DB.
- RLS explicit SELECT / INSERT / UPDATE / DELETE, check both owner and parent ownership; verify as two separate test users.
- Private Storage bucket; signed uploads/URLs; bounded size/types, content scanning as appropriate; never store service role or AI key client-side; restrict Edge Function CORS / user permissions.
- Retention & account deletion design for photos, food, receipts, historical stories, tokens. Real legal Terms / Privacy need operator approval before release; prototype must not invent a legal entity.
- Web Push requires Service Worker, HTTPS, opt-in, backend schedule, device subscription expiration & opt-out. The current toggle alone does not implement remote push.

## 6. Acceptance scenarios: block release if failed

1. Fresh Guest / fresh account returns all empty lists and AUD $0, no fixture records; reloading preserves legitimate additions.
2. Two accounts never see each other's Food/Cart/History/Photo/Preferences, even by guessed IDs or altered query.
3. Receipt duplicate confirmation across retries produces one logical import; 8 test QR fixtures only in isolated testing.
4. Original 2 packs, used 1 → only remaining 1 handed to Ghosty; update used 2 → no leftover handling.
5. Backtrack discard→share: downstream discarded result and previous savings no longer count; completed Story must reflect latest effective answers.
6. Planned 5 × AUD $4, Buy Less final 2 → savings AUD $12; As Planned $0; Don't Buy AUD $20; retry/reload/retake does not double-count.
7. Cart edits after checkout don't modify past receipts. Multi-item Story completion and resume identify items correctly.
8. iOS Safari / Android Chrome camera+album, QR libs local packaging, unsupported receipt feedback, and Web Push permission are tested on physical devices.

## 7. Scope boundary and file references

- Frontend prototype storage: `js/storage/repository.js`, `js/app/store.js` (IndexedDB), `js/domain/commands.js` (rules), `js/domain/story-v2.js`, `js/domain/selectors.js` (savings), `js/ui/screens/`.
- Supabase migration should map the stable `purchaseItemId`, `storyRevision` and cents data; do **not** simply replace all `Repository` calls with uncontrolled client writes.
- Both photography flows currently use QR fixture lookup as a test-only provider. Recognizing arbitrary product pixels and arbitrary receipt line-items require separate authorized external services and a backend.
- Require browser & real-phone tests and review the 104-line requirements tracker separately. Tests running only the Node domain do not establish real camera compatibility or responsive visual correctness.
