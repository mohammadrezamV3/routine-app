import { NextRequest, NextResponse } from "next/server";
import { searchFoodSeed } from "@/lib/foodSeed";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  return NextResponse.json({ results: searchFoodSeed(q) });
}
