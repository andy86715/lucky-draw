# 抽獎系統 🌸

這是一個網頁抽獎系統，採用溫馨可愛的粉色系（Sakura Pink）設計。系統支援多種抽獎模式，包含拉霸機、轉盤、部門抽獎、員編抽獎、批量抽獎，並具備完整的後台管理功能。

## ✨ 功能特色

### 🎰 多樣化抽獎模式
1.  **拉霸機 (Slot Machine)**: 經典單人拉霸效果，搭配霓虹燈與滾動特效，適合抽出大獎。
2.  **多人拉霸 (Multiplayer Slot)**: 支援一次抽出多位得獎者 (Batch Draw)，適合普獎或多人獎項。
3.  **幸運轉盤 (Roulette)**: 物理模擬轉盤，視覺效果豐富，增加期待感。
4.  **員編抽獎 (Employee ID Draw)**: 遮罩解謎式抽獎，逐字揭曉員工編號，增加緊張感。
5.  **部門抽獎 (Department Draw)**: 兩階段式抽獎，先抽部門再抽該部門人員，搭配網格高亮動畫。

### 🛠️ 完整的後台控制 (Control Panel)
-   **抽獎與模式切換**: 隨時切換五種抽獎模式。
-   **獎項管理**:
    -   **Excel 匯入/匯出**: 支援下載範本與匯入 (`.xlsx`)。
    -   可新增、刪除獎項。
    -   設定獎項名稱與名額 (例如：頭獎 1 名、普獎 10 名)。
    -   即時顯示各獎項剩餘名額。
-   **名單管理**:
    -   **Excel 匯入/匯出**: 支援下載範本與匯入 (`.xlsx`)。
    -   **手動增刪**: 可單筆新增或刪除人員。
    -   **狀態篩選**: 可篩選「全部」、「未中獎」或「特定獎項得主」，方便管理。
    -   **防呆機制**: 中獎者會自動標記，避免重複中獎。
-   **系統設定**:
    -   **一鍵重置**: 清除所有抽獎紀錄。
    -   **匯出結果**: 將中獎名單匯出成 Excel。

### 🔊 音效與視覺體驗
-   內建轉動、停止、中獎歡呼等音效 (需自行放入音檔)。
-   全螢幕彩帶 (Confetti) 慶祝特效。
-   漂浮背景動畫，增添熱鬧氣氛。

---

## 🚀 安裝與執行 (Installation)

本專案使用 [Next.js](https://nextjs.org) 開發。請確保您的電腦已安裝 [Node.js](https://nodejs.org/) (建議 v18 以上)。

### 1. 下載專案
```bash
git clone https://github.com/your-username/lucky-draw.git
cd lucky-draw
```

### 2. 安裝依賴套件 (Install Dependencies)
```bash
npm install
# 或使用 yarn / pnpm
# yarn install
# pnpm install
```

### 3. 啟動開發伺服器 (Run Development Server)
```bash
npm run dev
```

啟動後，請打開瀏覽器瀏覽 [http://localhost:3000](http://localhost:3000)。

### 4. 建置生產版本 (Production Build - Optional)
若要在活動現場穩定執行，建議先建置：
```bash
npm run build
npm start
```

---

## 📖 使用說明 (Usage Guide)

### 1. 準備名單 (名單管理)
-   進入後台「名單管理」分頁。
-   點擊 **「下載範本」** 取得 `名單範本_Participants.xlsx`。
-   填入 `姓名`、`部門` 與 `員工編號` (支援 '員編' 或 '員工編號' 欄位)。
-   點擊 **「匯入 Excel」** 上傳檔案，系統將自動解析並載入名單。
-   *註：重複匯入將會替換現有名單。*

### 2. 設定獎項 (獎項管理)
-   進入後台「獎項管理」分頁。
-   **手動新增**：輸入獎項名稱與數量，點擊「+」新增。
-   **Excel 匯入**：
    -   點擊 **「下載範本」** 取得 `獎項範本_Prizes.xlsx`。
    -   填入 `獎項名稱` 與 `名額`。
    -   點擊 **「匯入 Excel」** 上傳。
    -   **⚠️ 注意：匯入獎項 Excel 會「覆蓋」目前所有獎項設定。**

### 3. 開始抽獎
1.  在「控制面板」首頁，選擇想要的抽獎模式 (如：拉霸機)。
2.  下拉選單選擇「目前要抽的獎項」。
3.  點擊畫面中央的 **START** 按鈕開始抽獎！
4.  抽獎結束後會跳出得獎者彈窗，可選擇「確認」或「重抽」。

### 4. 音效設定 (Optional)
目前系統預設使用外部音效連結。若需使用本地音效以確保穩定性：
1.  在專案根目錄的 `public/` 資料夾中建立 `sounds/` 資料夾。
2.  放入 `spin.mp3` (轉動聲), `drop.mp3` (掉落聲), `win.mp3` (中獎聲)。
3.  修改 `app/context/SoundContext.tsx` 或各組件中的路徑。

---

## 🛠️ 技術棧 (Tech Stack)
-   **Frontend**: Next.js 14 (App Router), React, TypeScript
-   **Styling**: Tailwind CSS, Framer Motion (Animation)
-   **State Management**: Zustand
-   **Utilities**: `xlsx` (Excel處理), `canvas-confetti`, `lucide-react` (Icons)

### 📚 開發者文件
- [🔗 抽獎機制詳解 (Fairness & Logic)](./MECHANISM.md)

Made with by [Andy](https://github.com/andy86715).
