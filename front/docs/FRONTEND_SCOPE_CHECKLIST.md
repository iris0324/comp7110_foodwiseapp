# FoodWise — Frontend integration checklist

**Important provenance note:** Previous chats explicitly confirmed the #16 receipt scanner and #17 product-card scanner. The exact text of the originally named #1–#15 list is **not in the available source package**; therefore the entries below are verified **functional coverage topics**, not a claim that each entry reproduces the missing original numbering word-for-word. A final 17/17 comparison needs the original list.

| Topic | Frontend v7 status / location |
|---|---|
| #1 Peach Jam visual system | Retained `styles/peach-jam.css`, tokens, artwork |
| #2 Ghost character and animation | Retained `assets/sprite-*`, `js/interaction/` |
| #3 Welcome and module selection | Retained `js/main.js` home |
| #4 Food inventory CRUD | Retained `js/ui/screens/food.js`, `js/domain/commands.js` |
| #5 Food batch, amount, date and usage | Retained and tested by original domain tests |
| #6 Manual Food input | Retained |
| #7 Receipt Review & Edit | Extended with QR item rows and price display |
| #8 Ghost Buy manual cart | Retained; catalog and QR additions |
| #9 Virtual checkout / receipt | Retained purchase receipt display (no payment) |
| #10 Three preset story routes | Retained story machine |
| #11 Make My Own Story | Retained template/custom text flow |
| #12 Ghost actions, time, food remainder | Retained user-driven action/recap flows |
| #13 Outcome / Your Choice | Retained original decisions and derived quantitative results |
| #14 Ghost History / actual-purchase confirmation | Retained |
| #15 Bilingual/local data and VS Code structure | Retained; separated CSS/JS/JSON and docs |
| **#16 Receipt Master v4 QR** | **Integrated** `data/receipts.json`, `js/scanners/`, `js/services/` and Review & Edit. Browser support still to test on target phone |
| **#17 Ghost Buy v1 QR** | **Integrated** `data/products.json`, eight product images, card scan / review / cart. Browser support still to test on target phone |

## Testing conducted

- `npm test`: 34 tests passed, including 4 newly added catalog/scan integration tests.
- Both official paper PDFs individually scanned by image decoder after rendering as actual PDF pages: 8/8 receipts and 8/8 product cards gave the exact matching QR payloads.
- End-to-end browser UI/camera tests on the target mobile devices: **not yet confirmed**. The execution environment blocked navigation by browser policy; this is not represented as a passed test.
- Backend: **not implemented** by agreement.
