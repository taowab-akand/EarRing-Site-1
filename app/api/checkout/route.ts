import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validation";
import { configured, service } from "@/lib/db";
export async function POST(req: Request) {
  if (!configured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json(
      { error: "Checkout is not configured yet." },
      { status: 503 },
    );
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    if (Number(req.headers.get("content-length") || 0) > 16000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const parsed = checkoutSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    const { data, error } = await service().rpc("place_order", {
      payload: parsed.data,
    });
    if (error)
      return NextResponse.json(
        {
          error:
            "Order could not be placed. Please refresh your bag and check availability.",
        },
        { status: 409 },
      );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please try again." },
      { status: 400 },
    );
  }
}
