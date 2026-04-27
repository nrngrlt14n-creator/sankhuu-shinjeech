type AnalyzeRequestBlock = {
  type: "text" | "image" | "document";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
};

function maskKeepTail(value: string, keep = 4) {
  const chars = value.split("");
  let digitSeen = 0;
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    if (/\d/.test(chars[i])) {
      digitSeen += 1;
      if (digitSeen > keep) chars[i] = "*";
    }
  }
  return chars.join("");
}

function applyMask(
  input: string,
  pattern: RegExp,
  replacer: (...args: any[]) => string
) {
  let count = 0;
  const output = input.replace(pattern, (...args) => {
    const original = args[0] as string;
    const masked = replacer(...args);
    if (masked !== original) count += 1;
    return masked;
  });
  return { output, count };
}

function sanitizeText(text: string) {
  let cleaned = text;
  let maskedCount = 0;

  // Монгол регистрийн дугаарын хэв маяг (ж: УБ99112233)
  {
    const result = applyMask(cleaned, /\b([А-ЯӨҮЁ]{2}\d{8}|[A-Z]{2}\d{8})\b/giu, (match) => `${match.slice(0, 2)}******${match.slice(-2)}`);
    cleaned = result.output;
    maskedCount += result.count;
  }

  // Утасны дугаар (+976, 976 болон 8 оронтой)
  {
    const result = applyMask(cleaned, /\b(?:\+976|976)?[\s-]?\d{8}\b/g, (match) => maskKeepTail(match, 4));
    cleaned = result.output;
    maskedCount += result.count;
  }

  // Данс/акаунтын дугаар (түлхүүр үгийн дараах урт тоон утга)
  {
    const result = applyMask(
      cleaned,
      /\b(данс(?:ны)?|account|acct|iban)\b([^\n\r]{0,40}?)(\d[\d\s-]{7,30}\d)\b/giu,
      (_full, label: string, middle: string, digits: string) => `${label}${middle}${maskKeepTail(digits, 4)}`
    );
    cleaned = result.output;
    maskedCount += result.count;
  }

  // Ерөнхий урт дугаарууд (12+ цифр) - ихэвчлэн банк/баримтын дугаар
  {
    const result = applyMask(cleaned, /\b\d[\d\s-]{10,}\d\b/g, (match) => {
      const digitCount = (match.match(/\d/g) || []).length;
      if (digitCount < 12) return match;
      return maskKeepTail(match, 4);
    });
    cleaned = result.output;
    maskedCount += result.count;
  }

  return { cleaned, maskedCount };
}

function sanitizeContent(content: AnalyzeRequestBlock[]) {
  let totalMasked = 0;
  const sanitized = content.map((block) => {
    if (block.type !== "text" || !block.text) return block;
    const result = sanitizeText(block.text);
    totalMasked += result.maskedCount;
    return { ...block, text: result.cleaned };
  });
  return { sanitized, totalMasked };
}

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

    const { sanitized: sanitizedContent, totalMasked } = sanitizeContent(content);

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
        messages: [{ role: "user", content: sanitizedContent }],
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

    return Response.json({ report, maskingSummary: { maskedCount: totalMasked } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Тодорхойгүй алдаа";
    return Response.json({ error: `AI шинжилгээ амжилтгүй: ${message}` }, { status: 500 });
  }
}
