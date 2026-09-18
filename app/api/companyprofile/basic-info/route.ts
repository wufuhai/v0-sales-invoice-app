import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.QNE_OPENAPI_BASE_URL;

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, error: "Authorization is required" }, { status: 401 });
  }
  if (!API_BASE_URL) {
    return NextResponse.json({ success: false, error: "QNE Open API is not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/companyprofile/BasicInfo`, {
      headers: { Authorization: authorization, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "QNE company profile request failed" },
        { status: response.status }
      );
    }

    if (payload.code !== "0000" || !payload.data || typeof payload.data !== "object") {
      return NextResponse.json(
        { success: false, error: "Unexpected QNE company profile response" },
        { status: 502 }
      );
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { success: false, error: "QNE company profile service unavailable" },
      { status: 502 }
    );
  }
}
