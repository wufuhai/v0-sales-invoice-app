"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface UserInfo {
  name: string;
  displayName: string;
  email: string;
  tenantCode: string;
  roles: string;
  companyName: string;
}

interface AuthContextType {
  token: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithToken: (token: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "qne_access_token";

function parseJwtPayload(token: string): UserInfo | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    
    const payload = JSON.parse(jsonPayload);
    
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    
    return {
      name: payload.name || "",
      displayName: payload.dname || payload.name || "",
      email: Array.isArray(payload.email) ? payload.email[0] : payload.email || "",
      tenantCode: payload.tenantCode || "",
      roles: payload.roles || "",
      companyName: "",
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from the My Apps token or localStorage.
  useEffect(() => {
    // Use window.location to get URL params (avoids useSearchParams Suspense requirement)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    
    if (urlToken) {
      // URL token takes priority
      const userInfo = parseJwtPayload(urlToken);
      if (userInfo) {
        setToken(urlToken);
        setUser(userInfo);
        localStorage.setItem(SESSION_KEY, urlToken);
        // Remove token from URL for security
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("token");
        window.history.replaceState({}, "", newUrl.toString());
      }
    } else {
      const storedToken = localStorage.getItem(SESSION_KEY);
      if (storedToken) {
        const userInfo = parseJwtPayload(storedToken);
        if (userInfo) {
          setToken(storedToken);
          setUser(userInfo);
        } else {
          // Token is invalid or expired
          localStorage.removeItem(SESSION_KEY);
        }
      }
    }
    
    const refreshSession = async (activeToken: string) => {
      try {
        const response = await fetch("/api/companyprofile/basic-info", {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (!response.ok) return;
        const result = await response.json();
        if (result.code !== "0000" || !result.data) return;
        setUser((current) => current ? {
          ...current,
          companyName: result.data.companyName || result.data.name || "",
          tenantCode: result.data.tenantCode || current.tenantCode,
        } : current);
      } catch {
        // The JWT remains usable when the optional session refresh is unavailable.
      }
    };

    const activeToken = localStorage.getItem(SESSION_KEY);
    if (activeToken) void refreshSession(activeToken);
    setIsLoading(false);
  }, []);

  const loginWithToken = useCallback((newToken: string): boolean => {
    const userInfo = parseJwtPayload(newToken);
    if (userInfo) {
      setToken(newToken);
      setUser(userInfo);
      localStorage.setItem(SESSION_KEY, newToken);
      return true;
    }
    return false;
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!data.success || !data.token) {
        return { success: false, error: data.error || "Authentication failed" };
      }

      const success = loginWithToken(data.token);
      if (!success) {
        return { success: false, error: "Invalid token received from server" };
      }

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }, [loginWithToken]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        loginWithToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
