import { NextResponse } from "next/server";
import { suggest } from "@/lib/catalog";
import { getCatalogData } from "@/lib/catalog-repository";
import { createPublicClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length > 120) {
    return NextResponse.json({ items: [], error: "Suchanfrage ist zu lang." }, { status: 400 });
  }
  if (query.trim().length < 2) return NextResponse.json({ items: [] });
  const supabase = createPublicClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("search_suggestions", { search_query: query });
    if (error && process.env.NODE_ENV === "production") {
      return NextResponse.json({ items: [], error: "Suche ist vorübergehend nicht verfügbar." }, { status: 502 });
    }
    if (data?.length) {
      return NextResponse.json(
        {
          items: data.map(
            (item: { suggestion_type: string; label: string; meta: string; href: string }) => ({
              type: item.suggestion_type,
              label: item.label,
              meta: item.meta,
              href: item.href,
            }),
          ),
        },
        { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
      );
    }
  }
  const { products, categories } = await getCatalogData();
  return NextResponse.json(
    { items: suggest(query, products, categories) },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
