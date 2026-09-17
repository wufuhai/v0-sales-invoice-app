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

  const response = await fetch(`${API_BASE_URL}/api/companyprofile/BasicInfo`, {
    headers: { Authorization: authorization, Accept: "application/json" },
    cache: "no-store",
  });
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
  });
}
