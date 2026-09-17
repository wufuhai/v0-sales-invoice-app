import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.QNE_OPENAPI_BASE_URL;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const authorization = request.headers.get("authorization");
  const skip = searchParams.get("$skip") || "0";
  const top = searchParams.get("$top") || "20";
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
      $skip: skip,
      $top: top,
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
      const errorText = await response.text();
      console.error("API Error:", response.status, errorText);
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

    // Handle the QNE envelope: data.value contains rows and data.count contains the total.
    // API returns: { data: { count: number, value: [...] } }
    let invoices = [];
    let totalCount = 0;

    if (Array.isArray(data)) {
      invoices = data;
      totalCount = data.length;
    } else if (data.data && typeof data.data === "object" && Array.isArray(data.data.value)) {
      // Handle nested structure: { data: { count, value } }
      invoices = data.data.value;
      totalCount = data.data.count || data.data.value.length;
    } else if (data.data && Array.isArray(data.data)) {
      invoices = data.data;
      totalCount = data.totalCount || data.data.length;
    } else if (data.value && Array.isArray(data.value)) {
      invoices = data.value;
      totalCount = data.count || data["@odata.count"] || data.value.length;
    } else if (data.items && Array.isArray(data.items)) {
      invoices = data.items;
      totalCount = data.totalCount || data.items.length;
    }

    return NextResponse.json({
      success: true,
      data: invoices,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
