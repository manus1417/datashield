import { NextResponse } from "next/server";
import { hash } from "argon2";
import { db } from "~/utils/db";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { fileURL, secretKey } = await req.json();
    const { userId } = await auth();

    if (!fileURL || !secretKey || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing data" },
        { status: 400 }
      );
    }

    const key = await hash(secretKey);

    await db.file.create({
      data: {
        name: fileURL.split("/").pop() || "Unknown",
        key,
        user: userId,
        fragments: [fileURL], 
        retrieveFragments: [fileURL], 
      },
    });

    return NextResponse.json({ success: true, message: "File stored" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Error storing file info" },
      { status: 500 }
    );
  }
}
