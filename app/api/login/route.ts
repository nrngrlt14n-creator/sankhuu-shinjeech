export async function POST(request: Request) {
  try {
    if (!process.env.ADMIN_PASSWORD) {
      return Response.json({ error: "ADMIN_PASSWORD тохируулаагүй байна." }, { status: 500 });
    }

    const body = (await request.json()) as { password?: string };
    if (!body.password) {
      return Response.json({ error: "Нууц үг оруулна уу." }, { status: 400 });
    }

    if (body.password !== process.env.ADMIN_PASSWORD) {
      return Response.json({ error: "Нууц үг буруу байна." }, { status: 401 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Тодорхойгүй алдаа";
    return Response.json({ error: `Нэвтрэхэд алдаа гарлаа: ${message}` }, { status: 500 });
  }
}
