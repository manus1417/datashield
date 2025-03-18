"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Alert, AlertDescription } from "~/components/ui/alert";

export default function FileUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState("");
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
      // Step 1: Get a secure upload URL from the backend
      const res = await fetch("/api/upload", { method: "POST" });
      const { url, token } = await res.json();

      if (!url || !token) {
        throw new Error("Failed to get upload URL.");
      }

      // Step 2: Upload the file directly to Vercel Blob
      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file.");
      }

      // Step 3: Notify the backend (store file URL in DB)
      const fileURL = uploadRes.url;
      const saveRes = await fetch("/api/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileURL, secretKey: key }),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save file details.");
      }

      setUploadStatus("✅ File uploaded successfully!");
      setFile(null);
      setKey("");
      (document.getElementById("fileInput") as HTMLInputElement).value = "";
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("❌ An error occurred during upload.");
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
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          aria-label="Select file to upload"
        />
      </div>
      <div>
        <label htmlFor="key">Password</label>
        <Input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          id="key"
          name="key"
          placeholder="Enter password"
          className="w-full"
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
