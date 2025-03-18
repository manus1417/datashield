import { NextResponse, type NextRequest } from "next/server";
import { uploadFragment } from "~/utils/cloud";
import { hash } from "argon2";
import { db } from "~/utils/db";
import { encryptFragment, fragmentFile } from "~/utils/file";
import { auth } from "@clerk/nextjs/server";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60, // Increase execution time for large files
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Invalid content type. Use multipart/form-data." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
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
        { success: false, message: "No secret key provided" },
        { status: 400 }
      );
    }

    // Stream file processing to prevent memory overload
    const fileStream = file.stream();
    const fragments = await fragmentFile(fileStream, 1024 * 1024); // 1MB chunks

    const encryptedFragments = await Promise.all(
      fragments.map(async (fragment) => encryptFragment(fragment.blob, secretKey))
    );

    const uploadPromises = encryptedFragments.map(async (fragment, index) => {
      return uploadFragment(new Blob([fragment]), file.name, index);
    });

    const results = await Promise.all(uploadPromises);
    const fragmentURLs = results.map((result) => result?.url).filter((url) => url);
    const errors = results.filter((result) => result && !result.success);

    if (errors.length > 0 || fragmentURLs.length === 0) {
      return NextResponse.json(
        { success: false, message: "Error uploading fragments", errors },
        { status: 500 }
      );
    }

    const key = await hash(secretKey);

    await db.file.create({
      data: {
        name: file.name,
        key,
        user: userId as string,
        fragments: fragmentURLs,
        retrieveFragments: fragmentURLs,
      },
    });

    return NextResponse.json(
      { message: "File uploaded and fragmented successfully", fragmentURLs },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred during upload." },
      { status: 500 }
    );
  }
}
