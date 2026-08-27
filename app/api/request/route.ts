import { NextRequest, NextResponse } from "next/server";
import { zibalRequest } from "@/lib/zibal";

export async function POST(req: NextRequest) {
  try {
    const { amount, description } = await req.json(); // amount به تومان از فرانت میاد
    const amountRial = amount * 10;

    const { paymentUrl, trackId } = await zibalRequest(
      amountRial,
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/verify`,
      description
    );

    return NextResponse.json({ paymentUrl, trackId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
