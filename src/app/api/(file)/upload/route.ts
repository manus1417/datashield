import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/utils/db";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Read form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    console.log("📤 Uploading file to Vercel Blob...");

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: "public", // Or "private" if you want restricted access
    });

    console.log("✅ File uploaded successfully!", blob);

    // Save file metadata in the database
    const savedFile = await db.file.create({
      data: {
        name: file.name,
        url: blob.url,
        user: userId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "File uploaded successfully",
        fileUrl: blob.url,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred during upload" },
      { status: 500 }
    );
  }
}
