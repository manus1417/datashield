import { NextResponse } from "next/server";
import { createUploadUrl } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Generate a signed upload URL (valid for 10 minutes)
    const { url } = await createUploadUrl({
      access: "public", // You can change to "private" if needed
    });

    return NextResponse.json({ success: true, uploadUrl: url });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
