"use client";

import { useEffect, useRef, useState } from "react";

type ChecklistKey = "sales" | "payroll" | "supplier" | "loan" | "assets" | "bank" | "tax";
type TabKey = "checklist" | "report" | "trend" | "inflation" | "loan" | "sales";
type Trend = "↑" | "↓" | "→";
type Level = "🔴" | "🟡" | "🟢";
type AlertTag = "ЯАРАЛТАЙ" | "АНХААРАХ" | "ХЭВИЙН";

type Category = {
  name: string;
  emoji: string;
  amount: number;
  pct: number;
  trend: Trend;
  type: "in" | "out";
};

type AlertItem = { lvl: Level; tag: AlertTag; msg: string };
type Monthly = { m: string; inc: number; exp: number };
type Loan = { principal: number; rate: number; months: number; paid: number };
type Sale = { cat: string; units: number; rev: number; cost: number };
type Inflation = { cpi2023: number; cpi2024: number; realGrowthNominal: number; period: string };
type Conclusion = { status: string; risks: string[]; actions: string[] };
type ReportSummary = { totalIncome: number; totalExpense: number; profit: number; profitPct: number };

type ReportData = {
  summary: ReportSummary;
  categories: Category[];
  alerts: AlertItem[];
  monthly: Monthly[];
  loan: Loan;
  sales: Sale[];
  inflation: Inflation;
  conclusion: Conclusion;
  missingFiles?: string[];
};

type UploadState = {
  name: string;
  size: number;
  type: string;
  raw: File;
};

type UploadMap = Partial<Record<ChecklistKey, UploadState>>;

type FileReadResult = {
  name: string;
  type: string;
  content: string;
};

type AnthropicContentBlock = {
  type: "text" | "image" | "document";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
};

const fmt = (n: number) => "₮" + Math.round(n).toLocaleString("mn-MN");
const fmtPct = (n: number) => (Math.round(n * 10) / 10).toFixed(1) + "%";
const fmtSize = (b: number) => (b < 1048576 ? (b / 1024).toFixed(1) + "KB" : (b / 1048576).toFixed(1) + "MB");

const CHECKLIST_ITEMS: { file: string; key: ChecklistKey }[] = [
  { file: "Борлуулалтын бүртгэл", key: "sales" },
  { file: "Цалингийн жагсаалт", key: "payroll" },
  { file: "Нийлүүлэгчийн нэхэмжлэл", key: "supplier" },
  { file: "Зээлийн гэрээ / хуваарь", key: "loan" },
  { file: "Үндсэн хөрөнгийн жагсаалт", key: "assets" },
  { file: "Банкны хуулга", key: "bank" },
  { file: "Татварын бүртгэл", key: "tax" },
];

const DEMO: ReportData = {
  summary: { totalIncome: 48500000, totalExpense: 39200000, profit: 9300000, profitPct: 19.2 },
  categories: [
    { name: "Орлого", emoji: "💰", amount: 48500000, pct: 100, trend: "↑", type: "in" },
    { name: "Цалин", emoji: "👷", amount: 12400000, pct: 31.6, trend: "↑", type: "out" },
    { name: "Зээл төлбөр", emoji: "🏦", amount: 7200000, pct: 18.4, trend: "↑", type: "out" },
    { name: "Нийлүүлэгч", emoji: "📦", amount: 6100000, pct: 15.6, trend: "→", type: "out" },
    { name: "Тээвэр", emoji: "🚛", amount: 5800000, pct: 14.8, trend: "↓", type: "out" },
    { name: "Цемент/Барилга", emoji: "🧱", amount: 4900000, pct: 12.5, trend: "↑", type: "out" },
    { name: "Мөнгөн гүйлгээ", emoji: "💳", amount: 2100000, pct: 5.4, trend: "↓", type: "out" },
    { name: "Тодорхойгүй", emoji: "❓", amount: 700000, pct: 1.8, trend: "→", type: "out" },
  ],
  alerts: [
    { lvl: "🔴", tag: "ЯАРАЛТАЙ", msg: "Банкны хуулга байхгүй — мөнгөн урсгалын бүртгэл хийгдэхгүй байна" },
    { lvl: "🟡", tag: "АНХААРАХ", msg: "Цалин нийт зарлагын 31.6% — хяналт шаардлагатай" },
    { lvl: "🟢", tag: "ХЭВИЙН", msg: "Нийт зарлага орлогын 80.8% — хяналтын хэмжээнд байна" },
  ],
  monthly: [
    { m: "1-р сар", inc: 14200000, exp: 11800000 },
    { m: "2-р сар", inc: 16100000, exp: 13200000 },
    { m: "3-р сар", inc: 18200000, exp: 14200000 },
  ],
  loan: { principal: 24000000, rate: 1.5, months: 24, paid: 6 },
  sales: [
    { cat: "Барилгын материал", units: 340, rev: 18200000, cost: 13100000 },
    { cat: "Цемент", units: 520, rev: 15600000, cost: 11200000 },
    { cat: "Тээврийн үйлчилгээ", units: 80, rev: 8400000, cost: 5800000 },
    { cat: "Бусад", units: 210, rev: 6300000, cost: 4400000 },
  ],
  inflation: { cpi2023: 8.3, cpi2024: 6.1, realGrowthNominal: 18, period: "2024 Q1" },
  conclusion: {
    status: "Орлого өсөх хандлагатай, ашгийн хувь 19.2% — зах зээлийн дунджаас дээгүүр.",
    risks: ["Банкны хуулга байхгүй — мөнгөн урсгал хянах боломжгүй", "Зээлийн хугацаа тодорхойгүй"],
    actions: ["Банкны 3 сарын хуулгыг яаралтай авах", "Зээлийн гэрээг шалгаж хуваарь гаргах"],
  },
};

function readFile(file: File): Promise<FileReadResult> {
  return new Promise((res, rej) => {
    const isText = file.type.includes("text") || file.name.endsWith(".csv");
    const r = new FileReader();
    r.onload = () => res({ name: file.name, type: file.type, content: String(r.result ?? "") });
    r.onerror = () => rej(new Error("Уншихад алдаа"));
    isText ? r.readAsText(file) : r.readAsDataURL(file);
  });
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1rem 1.25rem",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontWeight: 500,
          fontSize: 14,
          color: "var(--color-text-primary)",
          marginBottom: 12,
          borderLeft: "3px solid #378ADD",
          paddingLeft: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "8px 12px",
        textAlign: "left",
        color: "var(--color-text-secondary)",
        fontWeight: 500,
        fontSize: 12,
        background: "var(--color-background-secondary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td
      style={{
        padding: "8px 12px",
        fontSize: 13,
        color: "var(--color-text-primary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

function LoanView({ loan }: { loan: Loan }) {
  const { principal, rate, months, paid } = loan;
  const monthlyRate = rate / 100;
  const monthlyPayment = principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
  const totalPay = monthlyPayment * months;
  const totalInterest = totalPay - principal;
  const remaining = months - paid;
  const balanceLeft = principal * Math.pow(1 + monthlyRate, paid) - monthlyPayment * ((Math.pow(1 + monthlyRate, paid) - 1) / monthlyRate);

  const rows: { i: number; int: number; pr: number; bal: number; isPaid: boolean }[] = [];
  let bal = principal;
  for (let i = 1; i <= months; i += 1) {
    const int = bal * monthlyRate;
    const pr = monthlyPayment - int;
    bal -= pr;
    rows.push({ i, int: Math.round(int), pr: Math.round(pr), bal: Math.max(0, Math.round(bal)), isPaid: i <= paid });
  }
  const maxBar = Math.max(...rows.map((r) => r.int + r.pr), 1);

  return (
    <Card title="4. ЗЭЭЛИЙН АШИГТ БАЙДЛЫН ҮНЭЛГЭЭ">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Зээлийн дүн", v: fmt(principal), c: "#378ADD" },
          { l: "Сарын төлбөр", v: fmt(Math.round(monthlyPayment)), c: "#185FA5" },
          { l: "Нийт хүү", v: fmt(Math.round(totalInterest)), c: "#E24B4A" },
          { l: "Үлдэгдэл", v: fmt(Math.round(balanceLeft)), c: "#639922" },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
          <span>
            Төлсөн хугацаа: <b style={{ color: "var(--color-text-primary)" }}>{paid} сар</b>
          </span>
          <span>
            Үлдсэн: <b style={{ color: "var(--color-text-primary)" }}>{remaining} сар</b>
          </span>
        </div>
        <div style={{ height: 10, background: "var(--color-background-secondary)", borderRadius: 5 }}>
          <div style={{ height: 10, width: fmtPct((paid / months) * 100), background: "#378ADD", borderRadius: 5, transition: "width .4s" }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>{fmtPct((paid / months) * 100)} төлөгдсөн</div>
      </div>

      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>Хүү vs Үндсэн — сараар</div>
      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 80, marginBottom: 4 }}>
        {rows.map((r) => (
          <div key={r.i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <div
              title={`Хүү: ${fmt(r.int)}`}
              style={{
                width: "100%",
                height: Math.round((r.int / maxBar) * 70) + "px",
                background: r.isPaid ? "#639922" : "#E24B4A",
                opacity: r.isPaid ? 0.7 : 1,
              }}
            />
            <div
              title={`Үндсэн: ${fmt(r.pr)}`}
              style={{
                width: "100%",
                height: Math.round((r.pr / maxBar) * 70) + "px",
                background: r.isPaid ? "#1D9E75" : "#378ADD",
                opacity: r.isPaid ? 0.7 : 1,
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--color-text-secondary)" }}>
        {[
          ["#E24B4A", "Хүү (төлөгдөөгүй)"],
          ["#639922", "Хүү (төлсөн)"],
          ["#378ADD", "Үндсэн (төлөгдөөгүй)"],
          ["#1D9E75", "Үндсэн (төлсөн)"],
        ].map(([c, l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block" }} />
            {l}
          </span>
        ))}
      </div>
    </Card>
  );
}

function SalesView({ sales }: { sales: Sale[] }) {
  const totalRev = sales.reduce((s, r) => s + r.rev, 0);
  const totalCost = sales.reduce((s, r) => s + r.cost, 0);
  const totalGP = totalRev - totalCost;

  return (
    <Card title="5. БОРЛУУЛАЛТЫН АНАЛИЗ">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Нийт орлого", v: fmt(totalRev), c: "#378ADD", sub: null },
          { l: "Нийт өртөг", v: fmt(totalCost), c: "#E24B4A", sub: null },
          { l: "Брутто ашиг", v: fmt(totalGP), c: "#639922", sub: fmtPct((totalGP / Math.max(totalRev, 1)) * 100) + " маржин" },
        ].map(({ l, v, sub, c }) => (
          <div key={l} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: c }}>{v}</div>
            {sub && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{sub}</div>}
          </div>
        ))}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr>{["Бүтээгдэхүүн", "Тоо ширхэг", "Борлуулалт", "Өртөг", "Брутто ашиг", "%"].map((h) => <Th key={h}>{h}</Th>)}</tr>
        </thead>
        <tbody>
          {sales.map((r, i) => {
            const gp = r.rev - r.cost;
            const gpPct = (gp / Math.max(r.rev, 1)) * 100;
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? "" : "var(--color-background-secondary)" }}>
                <Td>{r.cat}</Td>
                <Td>{r.units.toLocaleString()}</Td>
                <Td style={{ fontWeight: 500 }}>{fmt(r.rev)}</Td>
                <Td style={{ color: "var(--color-text-danger)" }}>{fmt(r.cost)}</Td>
                <Td style={{ fontWeight: 500, color: "#639922" }}>{fmt(gp)}</Td>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        height: 6,
                        width: Math.round(gpPct * 1.2) + "px",
                        background: gpPct >= 30 ? "#639922" : gpPct >= 20 ? "#BA7517" : "#E24B4A",
                        borderRadius: 3,
                      }}
                    />
                    <span style={{ fontSize: 12 }}>{fmtPct(gpPct)}</span>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>Борлуулалтын хувь</div>
      {sales.map((r, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 3 }}>
            <span>{r.cat}</span>
            <span>{fmtPct((r.rev / Math.max(totalRev, 1)) * 100)}</span>
          </div>
          <div style={{ height: 10, background: "var(--color-background-secondary)", borderRadius: 5 }}>
            <div
              style={{
                height: 10,
                width: fmtPct((r.rev / Math.max(totalRev, 1)) * 100),
                background: ["#378ADD", "#639922", "#E24B4A", "#EF9F27"][i % 4],
                borderRadius: 5,
              }}
            />
          </div>
        </div>
      ))}
    </Card>
  );
}

function InflationView({ inflation, monthly }: { inflation: Inflation; monthly: Monthly[] }) {
  const { cpi2023, cpi2024, realGrowthNominal, period } = inflation;
  const nominalGrowth = realGrowthNominal;
  const realGrowth = ((1 + nominalGrowth / 100) / (1 + cpi2024 / 100) - 1) * 100;
  const purchPower = 100 / (1 + cpi2024 / 100);
  const adjMonthly = monthly.map((m) => ({
    ...m,
    realInc: Math.round(m.inc / (1 + cpi2024 / 100)),
    realExp: Math.round(m.exp / (1 + cpi2024 / 100)),
  }));

  return (
    <Card title="3. ИНФЛЯЦИЙН ТООЦОО & САНХҮҮГИЙН ШИНЖИЛГЭЭ">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          ["CPI 2023", fmtPct(cpi2023), "#E24B4A"],
          ["CPI 2024", fmtPct(cpi2024), "#BA7517"],
          ["Нэрлэсэн өсөлт", fmtPct(nominalGrowth), "#378ADD"],
          ["Бодит өсөлт", fmtPct(realGrowth), realGrowth > 0 ? "#639922" : "#E24B4A"],
        ].map(([l, v, c]) => (
          <div key={String(l)} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: String(c) }}>{v}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-md)",
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
          color: "var(--color-text-secondary)",
        }}
      >
        ₮100 мөнгөний бодит үнэ цэнэ инфляцийн дараа: <b style={{ color: "var(--color-text-primary)" }}>₮{(Math.round(purchPower * 10) / 10).toFixed(1)}</b> —{" "}
        {fmtPct(100 - purchPower)} гэмтэл
      </div>

      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>Нэрлэсэн vs Бодит орлого (инфляц тохируулсан)</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
        <thead>
          <tr>{["Сар", "Нэрлэсэн орлого", "Бодит орлого", "Нэрлэсэн зарлага", "Бодит зарлага"].map((h) => <Th key={h}>{h}</Th>)}</tr>
        </thead>
        <tbody>
          {adjMonthly.map((m, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "" : "var(--color-background-secondary)" }}>
              <Td>{m.m}</Td>
              <Td>{fmt(m.inc)}</Td>
              <Td style={{ color: "#639922", fontWeight: 500 }}>{fmt(m.realInc)}</Td>
              <Td>{fmt(m.exp)}</Td>
              <Td style={{ color: "#BA7517", fontWeight: 500 }}>{fmt(m.realExp)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>* Бодит дүнг {fmtPct(cpi2024)} инфляцид тохируулсан · {period}</div>
    </Card>
  );
}

function TrendView({ data }: { data: ReportData }) {
  const { monthly, categories } = data;
  const maxVal = Math.max(...monthly.flatMap((m) => [m.inc, m.exp]), 1);
  const expCats = categories.filter((c) => c.type === "out");

  return (
    <>
      <Card title="📈 САРЫН ОРЛОГО VS ЗАРЛАГА">
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <thead>
            <tr>{["Сар", "Орлого", "Зарлага", "Ашиг", "Ашгийн %"].map((h) => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody>
            {monthly.map((m, i) => {
              const p = m.inc - m.exp;
              const pp = m.inc > 0 ? (p / m.inc) * 100 : 0;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "" : "var(--color-background-secondary)" }}>
                  <Td style={{ fontWeight: 500 }}>{m.m}</Td>
                  <Td style={{ color: "#639922", fontWeight: 500 }}>{fmt(m.inc)}</Td>
                  <Td style={{ color: "#E24B4A", fontWeight: 500 }}>{fmt(m.exp)}</Td>
                  <Td style={{ fontWeight: 500, color: p >= 0 ? "#639922" : "#E24B4A" }}>{fmt(Math.abs(p))}</Td>
                  <Td>
                    <span style={{ background: "#E6F1FB", color: "#0C447C", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 500 }}>{fmtPct(pp)}</span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {monthly.map((m, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 5 }}>{m.m}</div>
            {[
              { v: m.inc, c: "#3B6D11", label: "Орлого" },
              { v: m.exp, c: "#A32D2D", label: "Зарлага" },
            ].map(({ v, c, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 58, fontSize: 11, color: c, fontWeight: 500 }}>{label}</div>
                <div style={{ height: 14, width: Math.round((v / maxVal) * 280) + "px", background: c, borderRadius: 3, minWidth: 4 }} />
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{fmt(v)}</span>
              </div>
            ))}
          </div>
        ))}
      </Card>

      <Card title="📊 ЗАРЛАГЫН БҮТЭЦ">
        {expCats.map((c, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: "var(--color-text-primary)" }}>
                {c.emoji} {c.name}
              </span>
              <span style={{ display: "flex", gap: 12, color: "var(--color-text-secondary)" }}>
                <b style={{ color: "var(--color-text-primary)" }}>{fmt(c.amount)}</b>
                <span>{fmtPct(c.pct)}</span>
                <span style={{ fontSize: 16, color: c.trend === "↑" ? "#E24B4A" : c.trend === "↓" ? "#639922" : "#888780" }}>{c.trend}</span>
              </span>
            </div>
            <div style={{ height: 8, background: "var(--color-background-secondary)", borderRadius: 4 }}>
              <div
                style={{
                  height: 8,
                  width: fmtPct(Math.min(c.pct, 100)),
                  background: ["#378ADD", "#639922", "#E24B4A", "#EF9F27", "#D4537E", "#1D9E75", "#7F77DD", "#888780"][i % 8],
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}

function ReportView({ data }: { data: ReportData }) {
  const { summary, categories, alerts, conclusion, missingFiles } = data;
  const profit = summary.profit;

  return (
    <>
      {missingFiles && missingFiles.length > 0 && (
        <div
          style={{
            background: "var(--color-background-warning)",
            border: "0.5px solid var(--color-border-warning)",
            borderRadius: "var(--border-radius-md)",
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: 13,
            color: "var(--color-text-warning)",
          }}
        >
          ⚠️ Дутуу файл: {missingFiles.join(", ")}
        </div>
      )}

      <Card title="① ХУРААНГУЙ ХҮСНЭГТ">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[
            ["Нийт орлого", fmt(summary.totalIncome), "#639922"],
            ["Нийт зарлага", fmt(summary.totalExpense), "#E24B4A"],
            [profit >= 0 ? "Ашиг" : "Алдагдал", fmt(Math.abs(profit)), profit >= 0 ? "#3B6D11" : "#A32D2D"],
            ["Ашгийн хувь", fmtPct(summary.profitPct), "#185FA5"],
          ].map(([l, v, c]) => (
            <div key={String(l)} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: String(c) }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="② КАТЕГОРИ ЗАДАРГАА">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Категори", "Дүн", "Хувь", "Trend", "Төрөл"].map((h) => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "" : "var(--color-background-secondary)" }}>
                <Td>
                  {c.emoji} {c.name}
                </Td>
                <Td style={{ fontWeight: 500 }}>{fmt(c.amount)}</Td>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ height: 6, width: Math.max(c.pct * 1.6, 4) + "px", background: c.type === "in" ? "#639922" : "#378ADD", borderRadius: 3 }} />
                    <span style={{ fontSize: 12 }}>{fmtPct(c.pct)}</span>
                  </div>
                </Td>
                <Td style={{ fontSize: 17, color: c.trend === "↑" ? "#E24B4A" : c.trend === "↓" ? "#639922" : "#888780" }}>{c.trend}</Td>
                <Td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 500,
                      background: c.type === "in" ? "#EAF3DE" : "#E6F1FB",
                      color: c.type === "in" ? "#27500A" : "#0C447C",
                    }}
                  >
                    {c.type === "in" ? "Орлого" : "Зарлага"}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="③ АНХААРУУЛАХ ДОХИО">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((a, i) => {
            const bg = a.lvl === "🔴" ? "var(--color-background-danger)" : a.lvl === "🟡" ? "var(--color-background-warning)" : "var(--color-background-success)";
            const bc = a.lvl === "🔴" ? "var(--color-border-danger)" : a.lvl === "🟡" ? "var(--color-border-warning)" : "var(--color-border-success)";
            const tc = a.lvl === "🔴" ? "var(--color-text-danger)" : a.lvl === "🟡" ? "var(--color-text-warning)" : "var(--color-text-success)";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: bg, border: `0.5px solid ${bc}`, borderRadius: "var(--border-radius-md)", padding: "10px 14px" }}>
                <span style={{ fontSize: 20 }}>{a.lvl}</span>
                <span style={{ fontWeight: 500, fontSize: 12, minWidth: 90, color: tc }}>{a.tag}</span>
                <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{a.msg}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {conclusion && (
        <Card title="④ УДИРДЛАГЫН ДҮГНЭЛТ">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { ico: "📌", title: "Ерөнхий байдал", body: conclusion.status },
              { ico: "⚠️", title: "Хамгийн эрсдэлтэй 2 асуудал", body: conclusion.risks?.map((x, i) => `${i + 1}. ${x}`).join("\n") },
              { ico: "🚀", title: "Шуурхай авах 2 арга хэмжээ", body: conclusion.actions?.map((x, i) => `${i + 1}. ${x}`).join("\n") },
            ].map((c, i) => (
              <div key={i} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8 }}>
                  {c.ico} {c.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{c.body}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

type DropRowProps = {
  file: string;
  uploaded?: UploadState;
  isDragging: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (files: FileList | null) => void;
  onPick: (files: FileList | null) => void;
  onRemove: () => void;
};

function DropRow({ file, uploaded, isDragging, onDragEnter, onDragLeave, onDrop, onPick, onRemove }: DropRowProps) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragEnter();
      }}
      onDragEnter={onDragEnter}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragLeave();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(e.dataTransfer.files);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: `1.5px dashed ${isDragging ? "#378ADD" : uploaded ? "#639922" : "var(--color-border-secondary)"}`,
        borderRadius: "var(--border-radius-md)",
        padding: "10px 14px",
        background: isDragging ? "#E6F1FB" : uploaded ? "#EAF3DE" : "var(--color-background-secondary)",
        transition: "all .18s",
      }}
    >
      <span style={{ fontSize: 20 }}>{uploaded ? "✅" : "📂"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 13, color: "var(--color-text-primary)" }}>{file}</div>
        {uploaded ? (
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {uploaded.name} · {fmtSize(uploaded.size)}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>Файл чирж оруулах эсвэл сонгох</div>
        )}
      </div>
      {uploaded ? (
        <button
          onClick={onRemove}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            background: "var(--color-background-danger)",
            color: "var(--color-text-danger)",
            border: "0.5px solid var(--color-border-danger)",
          }}
        >
          Устгах
        </button>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            background: "var(--color-background-info)",
            color: "var(--color-text-info)",
            border: "0.5px solid var(--color-border-info)",
            whiteSpace: "nowrap",
          }}
        >
          Сонгох
        </button>
      )}
      <input
        ref={ref}
        type="file"
        style={{ display: "none" }}
        accept=".pdf,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.doc,.docx,.txt,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadMap>({});
  const [tab, setTab] = useState<TabKey>("checklist");
  const [drag, setDrag] = useState<ChecklistKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadMsg, setLoadMsg] = useState("");

  const uploadedCount = Object.keys(uploads).length;
  const data = report || DEMO;

  useEffect(() => {
    const ok = localStorage.getItem("admin-auth") === "true";
    setIsAuthenticated(ok);
    setAuthChecked(true);
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Нэвтрэх боломжгүй байна.");
      }

      localStorage.setItem("admin-auth", "true");
      setIsAuthenticated(true);
      setPassword("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Нэвтрэхэд алдаа гарлаа.");
    } finally {
      setLoginLoading(false);
    }
  }

  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-background-tertiary)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Түр хүлээнэ үү...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-background-tertiary)",
          fontFamily: "var(--font-sans)",
          padding: 16,
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            width: "100%",
            maxWidth: 380,
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "20px 18px",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Нэвтрэх</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>Dashboard харахын тулд нууц үгээ оруулна уу.</div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ADMIN_PASSWORD"
            autoFocus
            style={{
              width: "100%",
              height: 40,
              borderRadius: 8,
              border: "0.5px solid var(--color-border-secondary)",
              padding: "0 10px",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)",
              marginBottom: 10,
            }}
          />

          {loginError && (
            <div
              style={{
                background: "var(--color-background-danger)",
                border: "0.5px solid var(--color-border-danger)",
                borderRadius: "var(--border-radius-md)",
                padding: "8px 10px",
                marginBottom: 10,
                fontSize: 12,
                color: "var(--color-text-danger)",
              }}
            >
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading || !password}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 8,
              border: "0.5px solid #185FA5",
              background: "#E6F1FB",
              color: "#0C447C",
              cursor: loginLoading || !password ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 13,
              opacity: loginLoading || !password ? 0.6 : 1,
            }}
          >
            {loginLoading ? "Шалгаж байна..." : "Нэвтрэх"}
          </button>
        </form>
      </div>
    );
  }

  function assign(key: ChecklistKey, files: FileList | null) {
    if (!files?.length) return;
    const f = files[0];
    setUploads((u) => ({ ...u, [key]: { name: f.name, size: f.size, type: f.type, raw: f } }));
  }

  function removeFile(key: ChecklistKey) {
    setUploads((u) => {
      const n = { ...u };
      delete n[key];
      return n;
    });
  }

  async function analyze() {
    if (!uploadedCount) return;

    setLoading(true);
    setError(null);
    const msgs = ["📂 Файл уншиж байна...", "🔍 Өгөгдөл задлаж байна...", "🤖 AI шинжилж байна...", "📊 Тайлан бэлтгэж байна..."];
    let mi = 0;
    setLoadMsg(msgs[0]);
    const iv = setInterval(() => {
      mi = (mi + 1) % msgs.length;
      setLoadMsg(msgs[mi]);
    }, 1800);

    try {
      const fileData = await Promise.all(Object.values(uploads).map((u) => readFile((u as UploadState).raw)));
      const content: AnthropicContentBlock[] = [];

      for (const fd of fileData) {
        if (fd.content.startsWith("data:")) {
          const [meta, b64] = fd.content.split(",");
          const mime = meta.replace("data:", "").replace(";base64", "");
          if (mime.startsWith("image/")) content.push({ type: "image", source: { type: "base64", media_type: mime, data: b64 } });
          else if (mime === "application/pdf") content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } });
          else content.push({ type: "text", text: `[Файл: ${fd.name}] Бинар файл` });
        } else {
          content.push({ type: "text", text: `[Файл: ${fd.name}]\n${fd.content.slice(0, 8000)}` });
        }
      }

      const missing = CHECKLIST_ITEMS.filter((i) => !uploads[i.key]).map((i) => i.file);
      content.push({ type: "text", text: `Дутуу файл: ${missing.length ? missing.join(", ") : "байхгүй"}. Шинжилж тайлан гарга.` });

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Шинжилгээний API алдаа");
      }

      const d = await res.json();
      setReport(d.report);
      setTab("report");
    } catch (e) {
      setError("AI шинжилгээ амжилтгүй: " + (e instanceof Error ? e.message : "Тодорхойгүй алдаа"));
    } finally {
      clearInterval(iv);
      setLoading(false);
    }
  }

  const TABS: [TabKey, string][] = [
    ["checklist", "📋 Checklist"],
    ["report", "📊 Тайлан"],
    ["trend", "📈 Trend"],
    ["inflation", "3. Инфляц"],
    ["loan", "4. Зээл"],
    ["sales", "5. Борлуулалт"],
  ];

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--color-background-tertiary)", minHeight: "100vh", padding: 20 }}>
      <div style={{ background: "#042C53", color: "#fff", borderRadius: "var(--border-radius-lg)", padding: "18px 22px", marginBottom: 18 }}>
        <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: 2, textTransform: "uppercase" }}>AI Санхүүгийн Шинжилгээ</div>
        <div style={{ fontSize: 20, fontWeight: 500, marginTop: 6 }}>Эрдэнэ Билгүүдэй ХХК</div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,.2)", borderRadius: 3 }}>
            <div style={{ height: 5, width: fmtPct((uploadedCount / CHECKLIST_ITEMS.length) * 100), background: "#97C459", borderRadius: 3, transition: "width .4s" }} />
          </div>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            {uploadedCount}/{CHECKLIST_ITEMS.length} файл
          </span>
          {report && <span style={{ fontSize: 11, background: "#3B6D11", padding: "2px 8px", borderRadius: 12, fontWeight: 500 }}>AI тайлан бэлэн</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "0.5px solid var(--color-border-secondary)",
              cursor: "pointer",
              fontWeight: tab === k ? 500 : 400,
              fontSize: 13,
              background: tab === k ? "var(--color-background-primary)" : "var(--color-background-secondary)",
              color: tab === k ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            }}
          >
            {l}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {loading && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{loadMsg}</span>}
          {!loading && uploadedCount > 0 && (
            <button
              onClick={analyze}
              style={{
                padding: "7px 18px",
                borderRadius: 8,
                border: "0.5px solid #185FA5",
                background: "#E6F1FB",
                color: "#0C447C",
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              AI шинжилгээ ↗
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "var(--color-background-danger)",
            border: "0.5px solid var(--color-border-danger)",
            borderRadius: "var(--border-radius-md)",
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: 13,
            color: "var(--color-text-danger)",
          }}
        >
          {error}
        </div>
      )}

      {tab === "checklist" && (
        <Card title="📋 ФАЙЛ БҮРДЭЛТИЙН CHECKLIST">
          <div
            style={{
              background: "var(--color-background-warning)",
              borderRadius: "var(--border-radius-md)",
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--color-text-warning)",
              marginBottom: 14,
            }}
          >
            Файл нэмээд <b>AI шинжилгээ</b> товч дарна уу. Ямар ч төрлийн файл оруулж болно.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CHECKLIST_ITEMS.map(({ file, key }) => (
              <DropRow
                key={key}
                file={file}
                uploaded={uploads[key]}
                isDragging={drag === key}
                onDragEnter={() => setDrag(key)}
                onDragLeave={() => setDrag(null)}
                onDrop={(f) => {
                  setDrag(null);
                  assign(key, f);
                }}
                onPick={(f) => assign(key, f)}
                onRemove={() => removeFile(key)}
              />
            ))}
          </div>
        </Card>
      )}

      {tab === "report" && <ReportView data={data} />}
      {tab === "trend" && <TrendView data={data} />}
      {tab === "inflation" && <InflationView inflation={data.inflation} monthly={data.monthly} />}
      {tab === "loan" && <LoanView loan={data.loan} />}
      {tab === "sales" && <SalesView sales={data.sales} />}
    </div>
  );
}
