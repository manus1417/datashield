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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("secretKey", key);

      console.log("📤 Sending Request to API...");
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          // ❌ DO NOT set Content-Type manually, let the browser handle it!
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus("✅ File uploaded successfully!");
        setFile(null); 
        setKey(""); 
        (document.getElementById("fileInput") as HTMLInputElement).value = ""; 
      } else {
        setUploadStatus(data.message || "❌ Failed to upload file.");
        setIsError(true);
      }
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
