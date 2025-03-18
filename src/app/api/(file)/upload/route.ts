import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob"; // Correct import for Vercel Blob
import { hash } from "argon2";
import { db } from "~/utils/db";
import { encryptFragment, fragmentFile } from "~/utils/file";
import { auth } from "@clerk/nextjs/server";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    console.log("📩 Received a file upload request...");

    // Read the form data
    const formData = await req.formData();
    console.log("✅ FormData successfully parsed");

    const file: File | null = formData.get("file") as File;
    const secretKey = formData.get("secretKey") as string;
    const { userId } = await auth();
    
    console.log("🔍 Checking required values...");
    if (!file) {
      console.error("❌ No file received");
      return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
    }

    if (!secretKey) {
      console.error("❌ No secret key provided");
      return NextResponse.json({ success: false, message: "No secret key sent" }, { status: 400 });
    }

    console.log(`📂 File Name: ${file.name}, Size: ${file.size} bytes`);

    // **For Large Files (> 4.5 MB) - Use Direct Upload**
    if (file.size > 4.5 * 1024 * 1024) {
      console.log("🔄 Uploading large file using Vercel Blob...");
      const blob = await put(file.name, file, { access: "public" });

      console.log("✅ Large file uploaded successfully:", blob.url);
      return NextResponse.json({
        success: true,
        message: "Large file uploaded successfully!",
        url: blob.url,
      });
    }

    // **For Small Files (< 4.5 MB) - Encrypt & Fragment**
    console.log("🔄 Processing small file - encrypting & fragmenting...");
    const fragments = await fragmentFile(file, 1024 * 1024); // 1MB chunks

    const encryptedFragments = await Promise.all(
      fragments.map(async (fragment) => encryptFragment(fragment.blob, secretKey))
    );

    console.log(`🔹 Created ${encryptedFragments.length} encrypted fragments`);

    const uploadPromises = encryptedFragments.map(async (fragment, index) => {
      console.log(`🔼 Uploading fragment ${index + 1}/${encryptedFragments.length}...`);
      return await put(`${file.name}-part-${index}`, new Blob([fragment]), { access: "public" });
    });

    const results = await Promise.all(uploadPromises);
    console.log("✅ All fragments uploaded");

    const fragmentURLs = results.map((result) => result.url);
    console.log("📝 Fragment URLs:", fragmentURLs);

    // Save metadata to database
    console.log("💾 Saving to database...");
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

    console.log("✅ File successfully saved to database");

    return NextResponse.json({
      success: true,
      message: "File uploaded and fragmented successfully",
      fragmentURLs,
    });

  } catch (error: unknown) {
    console.error("❌ Upload error:", error instanceof Error ? error.message : error);

    return NextResponse.json(
      { success: false, message: `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
