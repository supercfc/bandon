"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Item = { id: string; name: string; product: string; price: number; order_id: string };
type Order = { id: string; title: string; note: string; created_at: string; items: Item[] };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function db<T>(path: string, options: RequestInit = {}) {
  if (!url || !key) throw new Error("尚未完成資料庫設定");
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: key, "Content-Type": "application/json", ...(options.headers ?? {}) } });
  if (!response.ok) throw new Error("資料同步失敗，請稍後再試");
  return response.json() as Promise<T>;
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeId, setActiveId] = useState("");
  const [person, setPerson] = useState("");
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [newOrder, setNewOrder] = useState("");
  const [message, setMessage] = useState("正在載入訂購單…");
  const [saving, setSaving] = useState(false);

  async function loadOrders() {
    try {
      const [savedOrders, items] = await Promise.all([db<Omit<Order, "items">[]>("orders?select=*&order=created_at.desc"), db<Item[]>("order_items?select=*&order=created_at.asc")]);
      const hydrated = savedOrders.map((order) => ({ ...order, items: items.filter((item) => item.order_id === order.id) }));
      setOrders(hydrated);
      setActiveId((current) => hydrated.some((order) => order.id === current) ? current : (hydrated[0]?.id ?? ""));
      setMessage(hydrated.length ? "" : "還沒有訂購單，建立第一張吧！");
    } catch (error) { setMessage(error instanceof Error ? error.message : "無法讀取訂購資料"); }
  }
  useEffect(() => { void loadOrders(); }, []);
  const activeOrder = orders.find((order) => order.id === activeId);
  const total = useMemo(() => activeOrder?.items.reduce((sum, item) => sum + item.price, 0) ?? 0, [activeOrder]);

  async function addItem(event: FormEvent) {
    event.preventDefault(); const amount = Number(price);
    if (!activeOrder || !person.trim() || !product.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    try { await db<Item[]>("order_items", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ order_id: activeOrder.id, name: person.trim(), product: product.trim(), price: amount }) }); setPerson(""); setProduct(""); setPrice(""); await loadOrders(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "無法加入品項"); } finally { setSaving(false); }
  }
  async function createOrder(event: FormEvent) {
    event.preventDefault(); if (!newOrder.trim()) return; setSaving(true);
    try { const [order] = await db<Omit<Order, "items">[]>("orders", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ title: newOrder.trim(), note: "開放訂購中" }) }); setNewOrder(""); setActiveId(order.id); await loadOrders(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "無法建立訂購單"); } finally { setSaving(false); }
  }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="揪訂單首頁"><span>揪</span>訂單</a><div className="status"><i />開放訂購中</div></header>
    <section className="hero" id="top"><div><p className="eyebrow">TEAM ORDERING, MADE SIMPLE</p><h1>一起訂，<br />一目瞭然。</h1><p className="intro">建立一張訂購單，分享連結給同事；每個人填完品項與價格，總額立即算好。</p></div><div className="hero-card"><span className="card-emoji">🥡</span><p>今天想吃什麼？</p><strong>揪團，不再手忙腳亂</strong><div className="dots"><b /><b /><b /></div></div></section>
    <section className="workspace"><aside className="orders-panel"><div className="panel-title"><div><p className="eyebrow">ORDERS</p><h2>訂購清單</h2></div><span>{orders.length}</span></div><div className="order-list">{orders.map((order) => <button type="button" className={`order-tab ${order.id === activeId ? "selected" : ""}`} onClick={() => setActiveId(order.id)} key={order.id}><span className="order-icon">{order.id === activeId ? "●" : "○"}</span><span><b>{order.title}</b><small>{order.note}</small></span></button>)}</div><form className="new-order" onSubmit={createOrder}><input aria-label="新訂購單名稱" value={newOrder} onChange={(e) => setNewOrder(e.target.value)} placeholder="例如：週五早餐" /><button disabled={saving} type="submit">＋ 新增訂購</button></form></aside>
      <section className="order-area">{activeOrder ? <><div className="order-heading"><div><p className="eyebrow">CURRENT ORDER</p><h2>{activeOrder.title}</h2><p>{activeOrder.note}</p></div><div className="total"><small>目前總額</small><strong>NT$ {total.toLocaleString("zh-TW")}</strong><span>{activeOrder.items.length} 份品項</span></div></div><form className="entry-form" onSubmit={addItem}><label>你的名字<input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="例如：小安" /></label><label>想訂什麼<input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="例如：無糖綠茶" /></label><label className="price-field">價格<input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /></label><button disabled={saving} type="submit" className="add-button">{saving ? "儲存中…" : <>加入訂單 <span>→</span></>}</button></form><div className="items-header"><span>訂購人</span><span>品項</span><span>價格</span></div><div className="items">{activeOrder.items.length === 0 ? <div className="empty">還沒有人點餐，成為第一位吧！</div> : activeOrder.items.map((item) => <div className="item" key={item.id}><span className="avatar">{item.name.slice(0, 1)}</span><b>{item.name}</b><span>{item.product}</span><strong>NT$ {item.price}</strong></div>)}</div><footer className="summary"><span>共 {activeOrder.items.length} 份品項</span><strong>合計 <em>NT$ {total.toLocaleString("zh-TW")}</em></strong></footer></> : <div className="empty large">{message || "請先建立一張訂購單"}</div>}{message && activeOrder ? <p className="notice">{message}</p> : null}</section>
    </section><p className="footnote">揪訂單・讓每一次團購都更輕鬆</p>
  </main>;
}
