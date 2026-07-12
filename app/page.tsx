"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Item = { id: string; name: string; product: string; price: number; order_id: string };
type Order = { id: string; title: string; note: string; deadline_at: string | null; created_at: string; items: Item[] };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function db<T>(path: string, options: RequestInit = {}) {
  if (!url || !key) throw new Error("尚未完成資料庫設定");
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: key, "Content-Type": "application/json", ...(options.headers ?? {}) } });
  if (!response.ok) throw new Error("資料同步失敗，請稍後再試");
  return response.json() as Promise<T>;
}

function todayPassword() {
  const values = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return ["year", "month", "day"].map((type) => values.find((item) => item.type === type)?.value ?? "").join("");
}
function deadlineText(value: string | null) {
  return value ? new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) + " 截止" : "開放訂購中";
}
function isClosed(value: string | null) { return Boolean(value && Date.now() >= new Date(value).getTime()); }

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeId, setActiveId] = useState("");
  const [person, setPerson] = useState("");
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("正在載入訂購單…");
  const [saving, setSaving] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorStep, setCreatorStep] = useState<"password" | "details">("password");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creatorError, setCreatorError] = useState("");

  async function loadOrders() {
    try {
      const [savedOrders, items] = await Promise.all([db<Omit<Order, "items">[]>("orders?select=*&order=created_at.desc"), db<Item[]>("order_items?select=*&order=created_at.asc")]);
      const hydrated = savedOrders.map((order) => ({ ...order, note: deadlineText(order.deadline_at), items: items.filter((item) => item.order_id === order.id) }));
      setOrders(hydrated);
      setActiveId((current) => hydrated.some((order) => order.id === current) ? current : (hydrated[0]?.id ?? ""));
      setMessage(hydrated.length ? "" : "還沒有訂購單，建立第一張吧！");
    } catch (error) { setMessage(error instanceof Error ? error.message : "無法讀取訂購資料"); }
  }
  useEffect(() => { void loadOrders(); }, []);
  const activeOrder = orders.find((order) => order.id === activeId);
  const closed = isClosed(activeOrder?.deadline_at ?? null);
  const total = useMemo(() => activeOrder?.items.reduce((sum, item) => sum + item.price, 0) ?? 0, [activeOrder]);

  function openCreator() { setCreatorOpen(true); setCreatorStep("password"); setPassword(""); setTitle(""); setDeadline(""); setCreatorError(""); }
  function verifyPassword(event: FormEvent) {
    event.preventDefault();
    if (password === todayPassword()) { setCreatorStep("details"); setCreatorError(""); }
    else setCreatorError("密碼不正確，請輸入今天的年月日（yyyyMMdd）。");
  }
  async function createOrder(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !deadline) { setCreatorError("請填寫訂購名稱與截止時間。"); return; }
    const end = new Date(deadline);
    if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) { setCreatorError("截止時間必須晚於現在。 "); return; }
    setSaving(true);
    try {
      const [order] = await db<Omit<Order, "items">[]>("orders", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ title: title.trim(), deadline_at: end.toISOString() }) });
      setCreatorOpen(false); setActiveId(order.id); await loadOrders();
    } catch (error) { setCreatorError(error instanceof Error ? error.message : "無法建立訂購單"); } finally { setSaving(false); }
  }
  async function addItem(event: FormEvent) {
    event.preventDefault(); const amount = Number(price);
    if (!activeOrder || closed || !person.trim() || !product.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    try { await db<Item[]>("order_items", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ order_id: activeOrder.id, name: person.trim(), product: product.trim(), price: amount }) }); setPerson(""); setProduct(""); setPrice(""); await loadOrders(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "無法加入品項"); } finally { setSaving(false); }
  }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="揪訂單首頁"><span>揪</span>訂單</a><div className="top-actions"><div className="status"><i />開放訂購中</div><button className="create-order" onClick={openCreator}>＋ 新增訂購</button></div></header>
    <section className="hero" id="top"><div><p className="eyebrow">TEAM ORDERING, MADE SIMPLE</p><h1>一起訂，<br />一目瞭然。</h1><p className="intro">建立一張訂購單，分享連結給同事；每個人填完品項與價格，總額立即算好。</p></div><div className="hero-card"><span className="card-emoji">🥡</span><p>今天想吃什麼？</p><strong>揪團，不再手忙腳亂</strong><div className="dots"><b /><b /><b /></div></div></section>
    <section className="workspace"><aside className="orders-panel"><div className="panel-title"><div><p className="eyebrow">ORDERS</p><h2>訂購清單</h2></div><span>{orders.length}</span></div><div className="order-list" aria-label="訂購清單，可左右滑動">{orders.map((order) => <button type="button" className={`order-tab ${order.id === activeId ? "selected" : ""}`} onClick={() => setActiveId(order.id)} key={order.id}><span className="order-icon">{order.id === activeId ? "●" : "○"}</span><span><b>{order.title}</b><small>{isClosed(order.deadline_at) ? "已截止，可查詢" : order.note}</small></span></button>)}</div></aside>
      <section className="order-area">{activeOrder ? <><div className="order-heading"><div><p className="eyebrow">CURRENT ORDER</p><h2>{activeOrder.title}</h2><p>{closed ? "訂購已截止，僅供查詢" : activeOrder.note}</p></div><div className="total"><small>目前總額</small><strong>NT$ {total.toLocaleString("zh-TW")}</strong><span>{activeOrder.items.length} 份品項</span></div></div>{closed ? <div className="closed-banner">此訂購單已截止，無法再加入品項。</div> : <form className="entry-form" onSubmit={addItem}><label>你的名字<input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="例如：小安" /></label><label>想訂什麼<input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="例如：無糖綠茶" /></label><label className="price-field">價格<input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /></label><button disabled={saving} type="submit" className="add-button">{saving ? "儲存中…" : <>加入訂單 <span>→</span></>}</button></form>}<div className="items-header"><span>訂購人</span><span>品項</span><span>價格</span></div><div className="items">{activeOrder.items.length === 0 ? <div className="empty">{closed ? "尚無訂購品項" : "還沒有人點餐，成為第一位吧！"}</div> : activeOrder.items.map((item) => <div className="item" key={item.id}><span className="avatar">{item.name.slice(0, 1)}</span><b>{item.name}</b><span>{item.product}</span><strong>NT$ {item.price}</strong></div>)}</div><footer className="summary"><span>共 {activeOrder.items.length} 份品項</span><strong>合計 <em>NT$ {total.toLocaleString("zh-TW")}</em></strong></footer></> : <div className="empty large">{message || "請先建立一張訂購單"}</div>}{message && activeOrder ? <p className="notice">{message}</p> : null}</section>
    </section><p className="footnote">揪訂單・讓每一次團購都更輕鬆</p>
    {creatorOpen ? <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><button className="close-modal" onClick={() => setCreatorOpen(false)} aria-label="關閉">×</button>{creatorStep === "password" ? <form onSubmit={verifyPassword}><p className="eyebrow">CREATE ORDER</p><h2 id="create-title">新增訂購</h2><p className="modal-help">請先輸入今天的年月日密碼。<br />例如 2026 年 7 月 12 日為 <b>20260712</b>。</p><label className="modal-label">今日密碼<input autoFocus inputMode="numeric" maxLength={8} value={password} onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))} placeholder="yyyyMMdd" /></label>{creatorError ? <p className="form-error">{creatorError}</p> : null}<button className="modal-submit" type="submit">下一步 →</button></form> : <form onSubmit={createOrder}><p className="eyebrow">CREATE ORDER</p><h2 id="create-title">填寫訂購資料</h2><label className="modal-label">訂購名稱<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：7/12 午餐" /></label><label className="modal-label">截止時間<input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required /></label>{creatorError ? <p className="form-error">{creatorError}</p> : null}<button disabled={saving} className="modal-submit" type="submit">{saving ? "建立中…" : "建立訂購單 →"}</button></form>}</section></div> : null}
  </main>;
}
