import { NextRequest, NextResponse } from "next/server";
import { safeCompare } from "@/lib/auth";
import { queryReadings, writeWeather } from "@/lib/influx";
import { parseRange, weatherPayloadSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.WEATHER_API_KEY ?? "";
  const provided = req.headers.get("x-api-key") ?? "";
  if (!expected) return false;
  return safeCompare(provided, expected);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Invalid or missing X-API-KEY" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = weatherPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const payload = {
    ...parsed.data,
    ts: parsed.data.ts ?? Date.now(),
  };

  try {
    await writeWeather(payload);
  } catch (error) {
    console.error("Failed to write to InfluxDB", error);
    return NextResponse.json(
      { error: "Failed to store reading" },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      written: {
        device: payload.device,
        site: payload.site,
        ts: payload.ts,
      },
    },
    { status: 201 },
  );
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const range = parseRange(params.get("range"));
  const limit = Number(params.get("limit") ?? 200);

  try {
    const readings = await queryReadings({
      device: params.get("device"),
      site: params.get("site"),
      range,
      limit: Number.isFinite(limit) ? limit : 200,
    });
    return NextResponse.json({ range, count: readings.length, readings });
  } catch (error) {
    console.error("Failed to query InfluxDB", error);
    return NextResponse.json({ error: "Failed to query readings" }, { status: 502 });
  }
}
