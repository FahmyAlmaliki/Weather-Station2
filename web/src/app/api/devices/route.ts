import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, unauthorized } from "@/lib/auth";
import { deleteRegistry, queryDevices, writeRegistry } from "@/lib/influx";
import { registrySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const devices = await queryDevices();
    return NextResponse.json({ devices });
  } catch (error) {
    console.error("Failed to query devices", error);
    return NextResponse.json({ error: "Failed to query devices" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();

  const parsed = registrySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    await writeRegistry(parsed.data);
    return NextResponse.json({ ok: true, device: parsed.data.device }, { status: 201 });
  } catch (error) {
    console.error("Failed to write registry", error);
    return NextResponse.json({ error: "Failed to save device" }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();

  const parsed = registrySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    await writeRegistry(parsed.data);
    return NextResponse.json({ ok: true, device: parsed.data.device });
  } catch (error) {
    console.error("Failed to update registry", error);
    return NextResponse.json({ error: "Failed to update device" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();

  const device = req.nextUrl.searchParams.get("device");
  if (!device) {
    return NextResponse.json({ error: "Missing device param" }, { status: 400 });
  }

  try {
    await deleteRegistry(device);
    return NextResponse.json({ ok: true, device });
  } catch (error) {
    console.error("Failed to delete registry", error);
    return NextResponse.json({ error: "Failed to delete device" }, { status: 502 });
  }
}
