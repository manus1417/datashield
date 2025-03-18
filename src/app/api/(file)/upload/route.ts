import { NextResponse } from "next/server";
import { generateUploadUrl } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "User not authenticated" },
      { status: 401 }
    );
  }

  // Generate a secure upload URL
  const { url, token } = await generateUploadUrl();
  
  return NextResponse.json({ url, token }, { status: 200 });
}
