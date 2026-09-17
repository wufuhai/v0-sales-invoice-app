"use client";

import useSWR from "swr";
import type { SalesInvoice, ApiResponse } from "@/lib/types";

interface UseSalesInvoicesParams {
  token: string | null;
  skip?: number;
  top?: number;
  filter?: string;
  orderby?: string;
  /** When false, SWR will not fetch (e.g. lazy-load another tab). */
  enabled?: boolean;
}

const fetcher = async (url: string): Promise<ApiResponse<SalesInvoice[]>> => {
  const token = localStorage.getItem("qne_access_token");
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export function useSalesInvoices({
  token,
  skip = 0,
  top = 20,
  filter = "",
  orderby = "docDate desc",
  enabled = true,
}: UseSalesInvoicesParams) {
  const params = new URLSearchParams({
    $skip: skip.toString(),
    $top: top.toString(),
    $orderby: orderby,
  });

  if (filter) {
    params.set("$filter", filter);
  }

  const shouldFetch = Boolean(token) && enabled;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<SalesInvoice[]>>(
    shouldFetch ? `/api/sales-invoices?${params.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const rawInvoices = data?.data;
  const invoices = Array.isArray(rawInvoices) ? rawInvoices : [];
  
  return {
    invoices,
    totalCount: data?.totalCount || 0,
    isLoading,
    isError: error || (data && !data.success),
    errorMessage: error?.message || data?.error,
    refresh: mutate,
  };
}
