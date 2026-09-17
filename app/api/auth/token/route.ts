import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.QNE_OPENAPI_BASE_URL;

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Username/password login is disabled in production" }, { status: 404 });
  }
  if (!API_BASE_URL) {
    return NextResponse.json({ success: false, error: "QNE Open API is not configured" }, { status: 503 });
  }
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Call the QNE auth API
    const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || data.error || "Authentication failed",
        },
        { status: response.status }
      );
    }

    // Extract token from response - handle different response structures
    const token = data.token || data.access_token || data.accessToken || data.data?.token;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No token received from server" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication service unavailable" },
      { status: 500 }
    );
  }
}
