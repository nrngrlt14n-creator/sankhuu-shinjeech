"use client";

import { useState } from "react";

type Category = {
  name: string;
  emoji: string;
  amount: number;
  pct: number;
  trend: "↑" | "→" | "↓";
  type: "in" | "out";
};

type Alert = {
  lvl: "🟢" | "🟡" | "🔴";
  tag: string;
  msg: string;
};

type Monthly = {
  m: string;
  inc: number;
  exp: number;
};

type Checklist = {
  file: string;
  st: "✅" | "⚠️" | "❌";
  note: string;
};

type Tab = "report" | "checklist" | "trend";

const D: {
  income: number;
  expense: number;
  categories: Category[];
  alerts: Alert[];
  monthly: Monthly[];
  checklist: Checklist[];
} = {
  income: 48500000,
  expense: 39200000,
  categories: [
    { name: "Орлого", emoji: "💰", amount: 48500000, pct: 100.0, trend: "↑", type: "in" },
    { name: "Цалин", emoji: "👷", amount: 12400000, pct: 31.6, trend: "↑", type: "out" },
    { name: "Зээл төлбөр", emoji: "🏦", amount: 7200000, pct: 18.4, trend: "↑", type: "out" },
    { name: "Нийлүүлэгч", emoji: "📦", amount: 6100000, pct: 15.6, trend: "→", type: "out" },
    { name: "Тээвэр", emoji: "🚛", amount: 5800000, pct: 14.8, trend: "↓", type: "out" },
    { name: "Цемент/Барилга", emoji: "🧱", amount: 4900000, pct: 12.5, trend: "↑", type: "out" },
    { name: "Мөнгөн гүйлгээ", emoji: "💳", amount: 2100000, pct: 5.4, trend: "↓", type: "out" },
    { name: "Тодорхойгүй", emoji: "❓", amount: 700000, pct: 1.8, trend: "→", type: "out" },
  ],
  alerts: [
    { lvl: "🟢", tag: "ХЭВИЙН", msg: "Нийт зарлага орлогын 80.8% — хяналтын хэмжээнд байна" },
    { lvl: "🟡", tag: "АНХААРАХ", msg: "Цалин нийт зарлагын 31.6% — 30%-ийн босгод ойрхон байна" },
    { lvl: "🟡", tag: "АНХААРАХ", msg: "Зээл төлбөр өсөх хандлагатай — гэрээний хуваарь тодорхойгүй" },
    { lvl: "🔴", tag: "ЯАРАЛТАЙ", msg: "Банкны хуулга байхгүй — мөнгөн урсгалын бүртгэл хийгдэхгүй байна" },
  ],
  monthly: [
    { m: "1-р сар", inc: 14200000, exp: 11800000 },
    { m: "2-р сар", inc: 16100000, exp: 13200000 },
    { m: "3-р сар", inc: 18200000, exp: 14200000 },
  ],
  checklist: [
    { file: "Борлуулалтын бүртгэл", st: "✅", note: "Бүрэн" },
    { file: "Цалингийн жагсаалт", st: "✅", note: "Бүрэн" },
    { file: "Нийлүүлэгчийн нэхэмжлэл", st: "✅", note: "Бүрэн" },
    { file: "Зээлийн гэрээ / хуваарь", st: "⚠️", note: "Хугацаа тодорхойгүй" },
    { file: "Үндсэн хөрөнгийн жагсаалт", st: "⚠️", note: "Хэсэгчлэн бүрдсэн" },
    { file: "Банкны хуулга", st: "❌", note: "Байхгүй — яаралтай шаардлагатай" },
    { file: "Татварын бүртгэл", st: "❌", note: "Байхгүй — шаардлагатай" },
  ],
};

const profit = D.income - D.expense;
const profitPct = ((profit / D.income) * 100).toFixed(1);
const T = (n: number) => "₮" + n.toLocaleString("mn-MN");
const P = (n: number) => n.toFixed(1) + "%";

const S = {
  page: { fontFamily: "'Segoe UI',sans-serif", background: "#f1f5f9", minHeight: "100vh", padding: 20 },
  card: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 16 },
  hdr: {
    fontWeight: 700,
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 14,
    borderLeft: "4px solid #1d4ed8",
    paddingLeft: 10,
  },
  th: { padding: "9px 14px", textAlign: "left" as const, color: "#475569", fontWeight: 700, fontSize: 12, background: "#f8fafc" },
  td: { padding: "9px 14px", fontSize: 13, borderBottom: "1px solid #f1f5f9" },
};

const tabBtn = (active: boolean) => ({
  padding: "8px 18px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
  background: active ? "#1d4ed8" : "#e2e8f0",
  color: active ? "#fff" : "#475569",
});

export default function Home() {
  const [tab, setTab] = useState<Tab>("report");

  return (
    <div style={S.page}>
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a5f,#1d4ed8)",
          color: "#fff",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: 2, textTransform: "uppercase" }}>
          Санхүүгийн тайлан · 2024 Q1 · DEMO
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>🏢 Эрдэнэ Билгүүдэй ХХК</div>
        <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>Шинэ удирдлагын хяналтын самбар</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["report", "📊 Тайлан"],
          ["checklist", "📋 Checklist"],
          ["trend", "📈 Trend"],
        ].map(([k, l]) => (
          <button key={k} style={tabBtn(tab === k)} onClick={() => setTab(k as Tab)}>
            {l}
          </button>
        ))}
      </div>

      {tab === "report" && (
        <>
          <div style={S.card}>
            <div style={S.hdr}>① ХУРААНГУЙ ХҮСНЭГТ</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={S.th}>Үзүүлэлт</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Дүн</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Тэмдэглэл</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["💰 Нийт орлого", T(D.income), "↑ өсөх хандлагатай", "#15803d"],
                  ["💸 Нийт зарлага", T(D.expense), "↑ хяналт шаардлагатай", "#dc2626"],
                  [profit >= 0 ? "✅ Ашиг" : "❌ Алдагдал", T(profit), "Цэвэр ашиг", profit >= 0 ? "#15803d" : "#dc2626"],
                  ["📊 Ашгийн хувь", P(+profitPct), "Орлогоос", "#1d4ed8"],
                ].map(([k, v, note, c], i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={S.td}>
                      <b>{k}</b>
                    </td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: c, fontSize: 15 }}>{v}</td>
                    <td style={{ ...S.td, textAlign: "right", color: "#64748b", fontSize: 12 }}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={S.card}>
            <div style={S.hdr}>② КАТЕГОРИ ЗАДАРГАА</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Категори", "Дүн (₮)", "Эзлэх хувь", "Trend", "Төрөл"].map((h) => (
                    <th key={h} style={S.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {D.categories.map((c, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={S.td}>
                      {c.emoji} {c.name}
                    </td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{T(c.amount)}</td>
                    <td style={S.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            height: 7,
                            width: Math.max(c.pct * 1.8, 6) + "px",
                            background: c.type === "in" ? "#16a34a" : "#3b82f6",
                            borderRadius: 4,
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{P(c.pct)}</span>
                      </div>
                    </td>
                    <td
                      style={{
                        ...S.td,
                        fontSize: 18,
                        textAlign: "center",
                        color: c.trend === "↑" ? "#dc2626" : c.trend === "↓" ? "#16a34a" : "#64748b",
                      }}
                    >
                      {c.trend}
                    </td>
                    <td style={S.td}>
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background: c.type === "in" ? "#dcfce7" : "#dbeafe",
                          color: c.type === "in" ? "#15803d" : "#1d4ed8",
                        }}
                      >
                        {c.type === "in" ? "Орлого" : "Зарлага"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={S.card}>
            <div style={S.hdr}>③ АНХААРУУЛАХ ДОХИО</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {D.alerts.map((a, i) => {
                const bg = a.lvl === "🔴" ? "#fff1f2" : a.lvl === "🟡" ? "#fffbeb" : "#f0fdf4";
                const bc = a.lvl === "🔴" ? "#fecaca" : a.lvl === "🟡" ? "#fde68a" : "#bbf7d0";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: bg,
                      border: `1px solid ${bc}`,
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{a.lvl}</span>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 12,
                        minWidth: 90,
                        color: a.lvl === "🔴" ? "#dc2626" : a.lvl === "🟡" ? "#d97706" : "#16a34a",
                      }}
                    >
                      {a.tag}
                    </span>
                    <span style={{ color: "#1e293b", fontSize: 13 }}>{a.msg}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={S.card}>
            <div style={S.hdr}>④ УДИРДЛАГЫН ДҮГНЭЛТ</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {[
                {
                  ico: "📌",
                  title: "Санхүүгийн ерөнхий байдал",
                  color: "#1d4ed8",
                  body: "Байгууллагын санхүү орлого өсөх хандлагатай бөгөөд ашгийн хувь 19.2% зах зээлийн дунджаас дээгүүр байна.",
                },
                {
                  ico: "⚠️",
                  title: "Хамгийн эрсдэлтэй 2 асуудал",
                  color: "#dc2626",
                  body: "① Банкны хуулга байхгүй тул мөнгөн урсгал хянах боломжгүй байна.\n② Зээлийн хугацаа тодорхойгүй — өр төлбөрийн эрсдэл үүсч байна.",
                },
                {
                  ico: "🚀",
                  title: "Шуурхай авах 2 арга хэмжээ",
                  color: "#16a34a",
                  body: "① Банкны 3 сарын хуулгыг яаралтай авч нягтлан бодогчид шилжүүлэх.\n② Зээлийн гэрээг шалгаж эргэн төлөлтийн хуваарь гаргах.",
                },
              ].map((c, i) => (
                <div key={i} style={{ border: `1.5px solid ${c.color}33`, borderRadius: 11, padding: "14px 16px", background: `${c.color}08` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: c.color, marginBottom: 8 }}>
                    {c.ico} {c.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.75, whiteSpace: "pre-line" }}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "checklist" && (
        <div style={S.card}>
          <div style={S.hdr}>📋 ФАЙЛ БҮРДЭЛТИЙН CHECKLIST</div>
          <div
            style={{
              background: "#fef3c7",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#92400e",
              marginBottom: 14,
            }}
          >
            ⚠️ Бүрэн санхүүгийн тайлан гаргахад доорх бүх файл шаардлагатай.
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Файл / Бүртгэл", "Төлөв", "Тайлбар"].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {D.checklist.map((c, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.file}</td>
                  <td style={{ ...S.td, fontSize: 20, textAlign: "center" }}>{c.st}</td>
                  <td style={{ ...S.td, color: c.st === "❌" ? "#dc2626" : c.st === "⚠️" ? "#d97706" : "#16a34a", fontWeight: 600 }}>
                    {c.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#64748b", marginTop: 14 }}>
            {[
              ["✅", "Бүрэн"],
              ["⚠️", "Хэсэгчлэн"],
              ["❌", "Байхгүй"],
            ].map(([s, l]) => (
              <span key={s}>
                {s} {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === "trend" && (
        <div style={S.card}>
          <div style={S.hdr}>📈 САРЫН TREND (2024 Q1)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
            <thead>
              <tr>
                {["Сар", "Орлого", "Зарлага", "Ашиг", "Ашгийн %"].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {D.monthly.map((m, i) => {
                const p = m.inc - m.exp;
                const pp = ((p / m.inc) * 100).toFixed(1);
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{m.m}</td>
                    <td style={{ ...S.td, color: "#15803d", fontWeight: 700 }}>{T(m.inc)}</td>
                    <td style={{ ...S.td, color: "#dc2626", fontWeight: 700 }}>{T(m.exp)}</td>
                    <td style={{ ...S.td, fontWeight: 800, color: p >= 0 ? "#15803d" : "#dc2626" }}>{T(p)}</td>
                    <td style={S.td}>
                      <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: 12 }}>
                        {pp}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 14 }}>Орлого vs Зарлага</div>
          {D.monthly.map((m, i) => {
            const max = 20000000;
            return (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 5 }}>{m.m}</div>
                {[
                  { v: m.inc, c: "#16a34a", l: "Орлого" },
                  { v: m.exp, c: "#ef4444", l: "Зарлага" },
                ].map(({ v, c, l }) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 11, width: 55, color: c, fontWeight: 600 }}>{l}</div>
                    <div style={{ height: 16, width: `${(v / max) * 240}px`, background: c, borderRadius: 4, transition: "width .3s" }} />
                    <span style={{ fontSize: 11, color: "#475569" }}>{T(v)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
