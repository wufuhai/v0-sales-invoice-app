import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.QNE_OPENAPI_BASE_URL;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const authorization = request.headers.get("authorization");
  const requestedSkip = Number(searchParams.get("$skip") || "0");
  const requestedTop = Number(searchParams.get("$top") || "20");
  const skip = Number.isInteger(requestedSkip) ? Math.max(0, Math.min(requestedSkip, 100000)) : 0;
  const top = Number.isInteger(requestedTop) ? Math.max(1, Math.min(requestedTop, 100)) : 20;
  const filter = searchParams.get("$filter") || "";
  const orderby = searchParams.get("$orderby") || "docDate desc";

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, error: "Authorization is required" }, { status: 401 });
  }
  if (!API_BASE_URL) {
    return NextResponse.json({ success: false, error: "QNE Open API is not configured" }, { status: 503 });
  }

  try {
    const queryParams = new URLSearchParams({
      $skip: skip.toString(),
      $top: top.toString(),
      $orderby: orderby,
    });

    if (filter) {
      queryParams.set("$filter", filter);
    }

    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await fetch(`${API_BASE_URL}/api/SalesInvoices/List?${queryParams.toString()}`, {
          headers: { Authorization: authorization, Accept: "application/json" },
          cache: "no-store",
        });
      } catch {
        if (attempt === 2) throw new Error("QNE Open API network error");
      }
      if (response && ![429, 500, 502, 503, 504].includes(response.status)) break;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
    if (!response) throw new Error("QNE Open API unavailable");

    if (!response.ok) {
      await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `API Error: ${response.status} - ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    if (data.code && data.code !== "0000") {
      return NextResponse.json({ success: false, error: data.message || "QNE Open API request failed" }, { status: 502 });
    }

    if (data.code !== "0000" || !data.data || !Array.isArray(data.data.value)) {
      return NextResponse.json({ success: false, error: "Unexpected QNE response envelope" }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      data: data.data.value,
      totalCount: Number.isFinite(data.data.count) ? data.data.count : data.data.value.length,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "QNE Open API service unavailable",
      },
      { status: 500 }
    );
  }
}
