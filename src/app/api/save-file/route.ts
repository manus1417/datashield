import { NextResponse } from "next/server";
import { db } from "~/utils/db";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { fileUrl, fileName } = await req.json();

    if (!fileUrl || !fileName) {
      return NextResponse.json(
        { success: false, message: "Invalid file data" },
        { status: 400 }
      );
    }

    // Save file info to the database
    const savedFile = await db.file.create({
      data: {
        name: fileName,
        url: fileUrl,
        user: userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "File metadata saved successfully",
      file: savedFile,
    });
  } catch (error) {
    console.error("Error saving file info:", error);
    return NextResponse.json(
      { success: false, message: "Error saving file info" },
      { status: 500 }
    );
  }
}
