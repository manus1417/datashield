import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob"; // Correct import for Vercel Blob
import { hash } from "argon2";
import { db } from "~/utils/db";
import { encryptFragment, fragmentFile } from "~/utils/file";
import { auth } from "@clerk/nextjs/server";

export const config = {
  api: {
    bodyParser: false, // Ensures file streaming instead of JSON parsing
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file: File = formData.get("file") as File;
    const secretKey = formData.get("secretKey") as string;
    const { userId } = await auth();

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!secretKey) {
      return NextResponse.json(
        { success: false, message: "No secret key sent" },
        { status: 400 }
      );
    }

    // Use direct client upload for files larger than 4.5MB
    if (file.size > 4.5 * 1024 * 1024) {
      console.log("Uploading large file using client upload...");

      // Upload to Vercel Blob Storage
      const blob = await put(file.name, file, { access: "public" });

      return NextResponse.json({
        success: true,
        message: "Large file uploaded successfully!",
        url: blob.url,
      });
    }

    // **For smaller files, fragment and encrypt**
    console.log("Processing small file with encryption & fragmentation...");

    const fragments = await fragmentFile(file, 1024 * 1024); // 1MB chunks

    const encryptedFragments = await Promise.all(
      fragments.map(async (fragment) => encryptFragment(fragment.blob, secretKey))
    );

    const uploadPromises = encryptedFragments.map(async (fragment, index) => {
      return await put(`${file.name}-part-${index}`, new Blob([fragment]), { access: "public" });
    });

    const results = await Promise.all(uploadPromises);

    const fragmentURLs = results.map((result) => result.url);

    const key = await hash(secretKey);

    await db.file.create({
      data: {
        name: file.name,
        key,
        user: userId as string,
        fragments: fragmentURLs,
        retrieveFragments: fragmentURLs, // Public URLs for retrieval
      },
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded and fragmented successfully",
      fragmentURLs,
    });

  } catch (error: unknown) {
    console.error("Upload error:", error instanceof Error ? error.message : "Unknown error");

    return NextResponse.json(
      { success: false, message: "An error occurred" },
      { status: 500 }
    );
  }
}
