# 航價簿 Flight Price Board

整合多筆「航班編號＋起飛日期」的歷史票價與最近報價，附免費 Chrome／Edge 更新助手。

**網站：** https://flight-fare-notebook.max411008.chatgpt.site/

## 功能

- 去回總價表：自選去回航班，依相同觀察日合計；缺任一段當日價格時不造總價。

- 新增不同航空公司、航線、日期的查詢並保存清單。
- 比較最近查到的價格、已取得歷史中的最低／最高價，以及價格曲線。
- Google Flights 有提供時，可直接讀取既有的每日歷史，不必從安裝日開始累積。
- 更新失敗保留舊資料，並標示來源錯誤及原查詢時間。
- 助手連線且網頁開啟時每小時更新，也支援手動批次更新。
- 清單與價格保存於網站的 Cloudflare D1 資料庫。

初始資料為 2026/10/23 JX201（TPE → MFM）及 2026/10/27 JX206（MFM → TPE），各 61 天歷史。資料是 2026/10/06 實際查詢快照，不代表現在的即時報價。

## 安裝免費更新助手

1. 從網站「設定免費更新助手」下載 ZIP，或下載本專案的 `public/fare-bridge.zip`。
2. 解壓縮至固定資料夾。
3. Chrome 開啟 `chrome://extensions`；Edge 開啟 `edge://extensions`。
4. 開啟「開發人員模式」，選「載入未封裝項目」，選取包含 `manifest.json` 的資料夾。
5. 用同一瀏覽器開啟網站並重新整理，確認頁首顯示「免費更新助手已連線」。

也可直接將此專案的 `extension/` 資料夾載入。助手僅讀取指定的 Google Flights 航班頁面；不訂票、不付款、不使用付費票價 API。需要瀏覽器與網站保持開啟；Codex 內嵌瀏覽器不能安裝 Chrome 擴充套件。

Google 要求人類驗證時，助手停止後續查詢；請自行在 Google Flights 處理後再更新。Google 頁面結構改變時可能需要調整解析器。

## 價格的意義

條件固定為單程、一位成人、經濟艙、新臺幣，使用 Google Flights 顯示的各通路最低售價。歷史涵蓋期間取決於 Google 實際提供的記錄，不保證所有航班或所有日期都有資料。航空公司官網價、不同通路票種、行李、匯率可能不同。兩段單程相加不等於來回票售價。

## 本機啟動

需要 Node.js 22.13 以上、npm。

```bash
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_high_malice.sql
npm run dev
```

開啟 http://127.0.0.1:5173/ 。資料庫初始化指令只在第一次執行；不要重複套用已執行的 migration。

```bash
npx tsc --noEmit
npm run build
```

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `components/board.tsx` | 多航班清單、歷史曲線、助手連線 |
| `app/api/flights/` | 查詢清單及票價儲存 API |
| `lib/flight-url.ts` | 指定航班的 Google Flights 連結 |
| `lib/seed.json` | 實際查詢所得的初始歷史快照 |
| `extension/` | 免費瀏覽器助手原始碼 |
| `public/fare-bridge.zip` | 可安裝的助手壓縮檔 |
| `db/`、`drizzle/` | D1 schema 與 migration |

網站使用 React、Vinext、Cloudflare Workers／D1。這是完整網站原始碼，並非可直接丟到 GitHub Pages 的純靜態 HTML；目前正式網站使用上方網址。移轉到其他網域時，須同步修改 `extension/manifest.json`、`extension/background.js` 的網站允許清單並重新打包助手。

## 驗證狀態

已通過 TypeScript 檢查、正式建置、兩筆實際 Google Flights 畫面的歷史解析、錯誤航班拒收、儲存失敗處理，以及擴充套件佇列模擬。Chrome／Edge 安裝後的完整更新流程仍需在使用者瀏覽器確認。

原始 starter 的開發說明保留於 `docs/STARTER-DEVELOPMENT.md`。第三方元件授權檔保留在原目錄。
