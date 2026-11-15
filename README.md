# 拉爾妮蒂的直播點歌庫

這是一個 Vite + React + Supabase 的第一版網站專案，包含公開歌曲搜尋、管理員登入、歌曲 CRUD，以及直播主專屬歌詞編輯。

## 功能
- 觀眾無須登入，可搜尋歌曲名稱、歌手及分類。
- 直播主以 Supabase Auth Email/Password 登入。
- 管理員可新增、修改、刪除歌曲與歌詞。
- 歌詞存放在獨立的 `song_lyrics` 資料表，公開角色沒有任何讀取政策。
- RLS 在資料庫端限制管理操作，不依賴前端隱藏按鈕。

## 本機啟動
1. 安裝 Node.js 20 或更新版本。
2. 在此資料夾執行 `npm install`。
3. 複製 `.env.example` 為 `.env`，填入 Supabase Project URL 和 anon/public key。
4. 在 Supabase SQL Editor 執行 `supabase/schema.sql`。
5. 在 Supabase Authentication > Users 建立直播主 Email/Password 使用者。
6. 複製該使用者 UUID，依 schema.sql 最後的註解將 UUID 加入 `public.admin_users`。
7. 執行 `npm run dev`，開啟終端機顯示的本機網址。

## 免費公開部署（不必購買網域）
建議使用 Vercel 免費提供的 `*.vercel.app` 網址：
- 建立 Vercel 帳號並匯入此專案（或連結 GitHub repository）。
- Build command：`npm run build`
- Output directory：`dist`
- 設定環境變數 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`
- 部署時選擇可用的免費 `vercel.app` 子網域，例如 `larlini-live-songbook.vercel.app`。名稱是否可用以平台當下顯示為準，不能預先保證。
- 在 Supabase Authentication URL Configuration 設定正式網站 URL 與允許的 Redirect URLs。

也可使用 Cloudflare Pages，取得免費 `*.pages.dev` 子網域。Cloudflare Pages 官方文件：https://developers.cloudflare.com/pages/

## 安全提醒
- `anon` / publishable key 可以放在前端；資料庫 RLS 才是權限邊界。
- 絕不可將 `service_role` / secret key 放在前端。
- 歌詞表不授權 `anon` 或一般 `authenticated` 使用者讀取；只有 `admin_users` 中的帳號可讀寫。
- 不要在歌曲公開欄位或公開 API 回傳歌詞內容。
- 上線前請用登出狀態測試：歌曲清單可讀、歌詞 API 讀取被拒絕、歌曲新增/修改/刪除被拒絕。
