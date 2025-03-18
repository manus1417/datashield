"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Alert, AlertDescription } from "~/components/ui/alert";

export default function FileUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setUploadStatus("❌ Please select a file to upload.");
      setIsError(true);
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    setIsError(false);

    try {
      console.log("📤 Requesting Upload URL...");
      const uploadUrlRes = await fetch("/api/upload", { method: "POST" });
      const { uploadUrl } = await uploadUrlRes.json();

      if (!uploadUrl) throw new Error("Upload URL generation failed");

      console.log("📤 Uploading File to Vercel Blob...");
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const fileUrl = uploadRes.url;

      console.log("📥 Saving file metadata...");
      const saveRes = await fetch("/api/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl, fileName: file.name }),
      });

      if (!saveRes.ok) throw new Error("Failed to save file metadata");

      setUploadStatus("✅ File uploaded and saved successfully!");
      setFile(null);
      (document.getElementById("fileInput") as HTMLInputElement).value = "";
    } catch (error) {
      console.error("❌ Upload error:", error);
      setUploadStatus("❌ An error occurred during upload. Please try again.");
      setIsError(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          id="fileInput"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          aria-label="Select file to upload"
        />
      </div>
      <Button type="submit" disabled={uploading} className="w-full">
        {uploading ? "Uploading..." : "Upload File"}
      </Button>

      {uploadStatus && (
        isError ? (
          <Alert variant="destructive">
            <AlertDescription>{uploadStatus}</AlertDescription>
          </Alert>
        ) : (
          <p className="text-green-500 text-sm">{uploadStatus}</p>
        )
      )}
    </form>
  );
}
