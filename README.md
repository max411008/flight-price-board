# 航價簿 · GitHub Pages

完全免費的靜態航班價格看板。沒有伺服器、付費 API、帳號或資料庫。

## 網站發布

本 repo 的 `docs/` 已包含建置完成的網站與更新助手。第一次請進入 [Settings → Pages](https://github.com/max411008/flight-price-board/settings/pages)，選擇 **Deploy from a branch → main → /docs → Save**。

GitHub 完成部署後，網址為 https://max411008.github.io/flight-price-board/ 。上述網址只有在 Pages 設定啟用、部署成功後才會生效。

## 功能

- 任意航班編號、起飛日、IATA 機場代碼；可同時加入去回兩段。
- 成人數、孩童數、每位孩童起飛時歲數；未滿 2 歲可選占位／不占位。
- 人數和年齡分開保存，查詢真實多人總價，不用成人單價乘人數。
- 相同旅伴的去回總價、同日歷史最低、走勢圖、每日去回對照表。
- 顯示來源已有的歷史；Google 未提供時會明確顯示沒有資料。
- 本機儲存、JSON 備份匯出與匯入。相同查詢匯入時保留較新報價。

## 免費更新助手

下載網站中的 `fare-bridge.zip`，解壓縮。在 Chrome `chrome://extensions` 或 Edge `edge://extensions` 開啟「開發人員模式」，選「載入未封裝項目」，選取包含 `manifest.json` 的資料夾。回到 **同一個瀏覽器** 的 GitHub Pages 網站重新整理，按「更新全部」。v1 使用者請先移除舊版再載入 v2。

只會讀取自行開啟的 Google Flights 公開頁面。助手依序查詢、驗證航班／日期／機場／乘客條件及新台幣價格。遇到 CAPTCHA 停止，請自行在 Google 頁面完成驗證。瀏覽器不允許網站自動安裝擴充套件，初次安裝需要使用者完成。

Google 依年齡區間查詢：2–11 歲兒童，12 歲以上成人類別；0–1 歲分占位與不占位嬰兒。保留每位孩童歲數，但不代表 Google 接受逐歲報價；最終票價依航空公司。若去回途中生日導致歲數不同，可分別新增單程查詢（不自動合併不同歲數的紀錄）。

**限制**：並非所有航班或乘客组合都有歷史圖表。Google DOM 或查詢格式改變時助手可能需要更新。去回合計是兩張單程票相加，並非同一張來回套票；兩段最近報價可能不是同一時間。圖表的每一個點只合併同日、同乘客條件的來源歷史，缺失價格不補零、不內插。不占位嬰兒最多每名成人一位，總乘客最多九人。

網站必須開著、助手連線，才能手動更新或每小時更新；GitHub Pages 不在雲端持續抓票價。資料存於此瀏覽器的 localStorage，清除網站資料會移除清單。請先匯出備份再換裝置。

## 初始資料來源

`seed.json` 是 2026-10-06 從 Google Flights 公開頁面取得的 JX201（10/23 TPE→MFM）、JX206（10/27 MFM→TPE）**一位成人經濟艙**報價，以及來源當時顯示的 61 天價格記錄，並非即時售價或隨機範例。使用者新增的查詢不會套用這些價格。

## 開發

需要 Node.js 22+；**不需要 npm install，沒有套件依賴**。

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/serve.mjs
```

修改後重新建置，將原始碼和 `docs/` 一起提交。Pages 設定為 `main /docs` 後，GitHub 會自動發布更新。`docs/` 是產出檔，請修改 `src/`、`index.html`、`extension/` 再建置。
