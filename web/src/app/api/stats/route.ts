import { NextRequest, NextResponse } from "next/server";
import { queryStats } from "@/lib/influx";
import { parseRange } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const range = parseRange(params.get("range"));

  try {
    const stats = await queryStats({
      device: params.get("device"),
      site: params.get("site"),
      range,
    });
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to query stats", error);
    return NextResponse.json({ error: "Failed to query stats" }, { status: 502 });
  }
}
