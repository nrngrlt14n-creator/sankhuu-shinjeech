type AnalyzeRequestBlock = {
  type: "text" | "image" | "document";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
};

const SYSTEM_PROMPT = `Та Эрдэнэ Билгүүдэй ХХК-ийн санхүүгийн шинжээч. Файлуудыг шинжилж зөвхөн JSON буцаа.
{
  "summary":{"totalIncome":number,"totalExpense":number,"profit":number,"profitPct":number},
  "categories":[{"name":string,"emoji":string,"amount":number,"pct":number,"trend":"↑"|"↓"|"→","type":"in"|"out"}],
  "alerts":[{"lvl":"🔴"|"🟡"|"🟢","tag":"ЯАРАЛТАЙ"|"АНХААРАХ"|"ХЭВИЙН","msg":string}],
  "monthly":[{"m":string,"inc":number,"exp":number}],
  "loan":{"principal":number,"rate":number,"months":number,"paid":number},
  "sales":[{"cat":string,"units":number,"rev":number,"cost":number}],
  "inflation":{"cpi2023":number,"cpi2024":number,"realGrowthNominal":number,"period":string},
  "conclusion":{"status":string,"risks":[string,string],"actions":[string,string]},
  "missingFiles":[string]
}
Бүх текст монголоор. JSON-оос өмнө эсвэл хойно текст бичихгүй.`;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY тохируулаагүй байна." }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { content?: AnalyzeRequestBlock[] };
    const content = body.content;

    if (!Array.isArray(content) || content.length === 0) {
      return Response.json({ error: "Хоосон эсвэл буруу content ирсэн байна." }, { status: 400 });
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return Response.json({ error: errText || "Anthropic API алдаа" }, { status: upstream.status });
    }

    const data = (await upstream.json()) as { content?: Array<{ text?: string }> };
    const raw = (data.content ?? [])
      .map((b) => b.text || "")
      .join("")
      .trim();
    const clean = raw.replace(/```json|```/g, "").trim();
    const report = JSON.parse(clean);

    return Response.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Тодорхойгүй алдаа";
    return Response.json({ error: `AI шинжилгээ амжилтгүй: ${message}` }, { status: 500 });
  }
}
