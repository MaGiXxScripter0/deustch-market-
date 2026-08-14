import { NextResponse } from "next/server";
import { suggest } from "@/lib/catalog";
import { getCatalogData } from "@/lib/catalog-repository";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const { products, categories } = await getCatalogData();
  return NextResponse.json(
    { items: suggest(query, products, categories) },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
