import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { password } = await request.json().catch(() => ({ password: "" }));
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const deletePassword = process.env.ORDER_DELETE_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !deletePassword || !supabaseUrl) return NextResponse.json({ error: "刪除功能尚未完成設定" }, { status: 500 });
  if (password !== deletePassword) return NextResponse.json({ error: "密碼不正確" }, { status: 403 });

  const response = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Prefer: "return=minimal" },
  });
  if (!response.ok) return NextResponse.json({ error: "無法刪除訂購單" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
