import React, { useEffect, useMemo, useState } from 'react';
import { Search, Music2, LockKeyhole, LogOut, Plus, Pencil, Trash2, X, Save, Mic2, SlidersHorizontal } from 'lucide-react';
import { supabase, isConfigured } from './supabase';

const CATEGORIES = ['全部分類', '華語', '台語', '日語', '韓語', '英文', '其他'];
const emptySong = { title: '', artist: '', category: '華語' };

export default function App() {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部分類');
  const [session, setSession] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySong);
  const [lyrics, setLyrics] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    loadSongs();
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadSongs() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from('songs').select('id,title,artist,category').order('title');
    if (error) setNotice('歌曲載入失敗：' + error.message);
    else setSongs(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => songs.filter(song => {
    const matchesText = `${song.title} ${song.artist}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesText && (category === '全部分類' || song.category === category);
  }), [songs, query, category]);

  async function login(e) {
    e.preventDefault(); setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError('登入失敗，請確認帳號密碼。');
    else { setAdminMode(true); setLoginPassword(''); }
  }

  async function logout() {
    await supabase.auth.signOut(); setAdminMode(false); setShowForm(false); setEditing(null);
  }

  async function openEditor(song = null) {
    setEditing(song);
    setForm(song ? { title: song.title, artist: song.artist || '', category: song.category || '華語' } : emptySong);
    setLyrics('');
    if (song) {
      const { data } = await supabase.from('song_lyrics').select('lyrics').eq('song_id', song.id).maybeSingle();
      setLyrics(data?.lyrics || '');
    }
    setShowForm(true);
  }

  async function saveSong(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    let songId = editing?.id;
    if (editing) {
      const { error } = await supabase.from('songs').update({ ...form, title: form.title.trim(), artist: form.artist.trim() }).eq('id', songId);
      if (error) return setNotice('儲存失敗：' + error.message);
    } else {
      const { data, error } = await supabase.from('songs').insert({ ...form, title: form.title.trim(), artist: form.artist.trim() }).select('id').single();
      if (error) return setNotice('新增失敗：' + error.message);
      songId = data.id;
    }
    const { error: lyricError } = await supabase.from('song_lyrics').upsert({ song_id: songId, lyrics }, { onConflict: 'song_id' });
    if (lyricError) return setNotice('歌曲已儲存，但歌詞儲存失敗：' + lyricError.message);
    setShowForm(false); setEditing(null); setNotice('歌曲已儲存'); await loadSongs();
  }

  async function deleteSong(song) {
    if (!window.confirm(`確定刪除「${song.title}」嗎？`)) return;
    const { error } = await supabase.from('songs').delete().eq('id', song.id);
    if (error) setNotice('刪除失敗：' + error.message);
    else { setNotice('歌曲已刪除'); await loadSongs(); }
  }

  if (!isConfigured) return <SetupScreen />;

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-icon"><Music2 size={21}/></span><span>拉爾妮蒂的直播點歌庫</span></a>
      <div className="top-actions">
        {session && <span className="admin-chip"><LockKeyhole size={14}/> 管理員已登入</span>}
        {session ? <button className="ghost-btn" onClick={logout}><LogOut size={16}/> 登出</button> :
          <button className="ghost-btn" onClick={() => setAdminMode(v => !v)}><LockKeyhole size={16}/> 直播主登入</button>}
      </div>
    </header>

    <main className="container">
      <section className="hero">
        <div className="eyebrow"><span className="live-dot"/> LIVE SONG LIST</div>
        <h1>想聽哪一首歌？</h1>
        <p>搜尋看看拉爾妮蒂的歌單裡，有沒有你想聽的歌曲。</p>
        <div className="search-box"><Search size={21}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="輸入歌名或歌手名稱搜尋…" aria-label="搜尋歌曲"/></div>
        <div className="hero-foot"><span><Music2 size={15}/> {songs.length} 首已登記歌曲</span><span>歡迎來到拉爾妮蒂的音樂小天地</span></div>
      </section>

      {adminMode && !session && <section className="login-panel">
        <button className="close-btn" onClick={() => setAdminMode(false)} aria-label="關閉"><X size={18}/></button>
        <div className="panel-icon"><LockKeyhole/></div><h2>直播主管理登入</h2><p>只有獲得授權的直播主帳號可以管理歌單與歌詞。</p>
        <form onSubmit={login} className="login-form">
          <label>電子郵件<input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required placeholder="管理員 Email"/></label>
          <label>密碼<input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required placeholder="密碼"/></label>
          {loginError && <p className="error">{loginError}</p>}
          <button className="primary-btn" type="submit">登入管理後台</button>
        </form>
      </section>}

      <section className="songs-section">
        <div className="section-heading"><div><div className="eyebrow muted">THE PLAYLIST</div><h2>歌曲清單</h2></div>
          {session && <button className="primary-btn add-btn" onClick={() => openEditor()}><Plus size={17}/> 新增歌曲</button>}
        </div>
        <div className="filters"><div className="filter-label"><SlidersHorizontal size={16}/> 歌曲分類</div><div className="category-list">{CATEGORIES.map(c => <button key={c} className={`category-pill ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
        {notice && <div className="notice" onClick={() => setNotice('')}>{notice}<button aria-label="關閉"><X size={14}/></button></div>}
        {loading ? <div className="empty-state">歌曲載入中…</div> : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><Music2 size={27}/></div><h3>{songs.length ? '找不到符合的歌曲' : '歌單準備中'}</h3><p>{songs.length ? '試試其他歌名、歌手或分類。' : '直播主新增歌曲後，就會顯示在這裡。'}</p></div> :
          <div className="song-list">{filtered.map((song, index) => <article className="song-row" key={song.id}><div className="song-number">{String(index+1).padStart(2,'0')}</div><div className="song-art"><Music2 size={19}/></div><div className="song-info"><h3>{song.title}</h3><p>{song.artist || '未提供歌手'}</p></div><span className="song-category">{song.category}</span>{session && <div className="song-actions"><button title="編輯歌曲與歌詞" onClick={() => openEditor(song)}><Pencil size={16}/></button><button title="刪除歌曲" onClick={() => deleteSong(song)}><Trash2 size={16}/></button></div>}</article>)}</div>}
      </section>

      <footer><div className="footer-mark"><Mic2 size={17}/> 拉爾妮蒂的直播點歌庫</div><span>Made for music & good moments</span></footer>
    </main>

    {showForm && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowForm(false)}><section className="editor-modal">
      <div className="modal-head"><div><div className="eyebrow muted">SONG MANAGEMENT</div><h2>{editing ? '編輯歌曲' : '新增歌曲'}</h2></div><button className="close-btn" onClick={() => setShowForm(false)}><X/></button></div>
      <form onSubmit={saveSong} className="editor-form">
        <label>歌曲名稱 *<input value={form.title} onChange={e => setForm({...form,title:e.target.value})} required placeholder="例如：告白氣球"/></label>
        <label>歌手名稱<input value={form.artist} onChange={e => setForm({...form,artist:e.target.value})} placeholder="例如：周杰倫"/></label>
        <label>歌曲分類<select value={form.category} onChange={e => setForm({...form,category:e.target.value})}>{CATEGORIES.filter(x=>x!=='全部分類').map(x=><option key={x}>{x}</option>)}</select></label>
        <label>直播主專屬歌詞<textarea rows="9" value={lyrics} onChange={e => setLyrics(e.target.value)} placeholder="在這裡輸入歌詞…&#10;這個欄位只有管理員登入後才能讀取與編輯。"/></label>
        <div className="privacy-note"><LockKeyhole size={15}/> 歌詞僅限直播主帳號讀取，觀眾搜尋頁不會取得歌詞資料。</div>
        <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>取消</button><button type="submit" className="primary-btn"><Save size={16}/> 儲存歌曲</button></div>
      </form>
    </section></div>}
  </div>;
}

function SetupScreen() {
  return <div className="setup-wrap"><div className="setup-card"><div className="brand-icon"><Music2/></div><h1>拉爾妮蒂的直播點歌庫</h1><p>網站前台已備妥，接下來需要連接資料庫與管理員登入服務，才能正式啟用歌曲同步和私人歌詞。</p><ol><li>建立 Supabase 專案</li><li>執行專案內 <code>supabase/schema.sql</code></li><li>設定 <code>.env</code> 的 Supabase 網址與 anon key</li><li>建立直播主帳號並依照 README 授權管理員</li></ol><p className="small-note">安全設計：公開訪客只能讀取歌曲名稱、歌手與分類；歌詞資料表只允許授權管理員存取。</p></div></div>;
}
