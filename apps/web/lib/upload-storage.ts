import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { logInfo } from "./logger";

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

function assertImage(file: File) {
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPG, PNG, WebP, GIF, and AVIF are allowed.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File too large. Maximum size is 5MB.");
  }
}

async function storeLocally(file: File) {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `match-thumb-${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(path.join(uploadsDir, filename), buffer);

  return {
    url: `/uploads/${filename}`,
    storageMode: "local",
  };
}

async function storeViaExternalUploader(file: File) {
  const endpoint = process.env.UPLOAD_EXTERNAL_ENDPOINT;
  const publicBaseUrl = process.env.UPLOAD_EXTERNAL_PUBLIC_BASE_URL;

  if (!endpoint || !publicBaseUrl) {
    throw new Error("External upload storage is not configured.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    headers: process.env.UPLOAD_EXTERNAL_API_KEY
      ? {
          Authorization: `Bearer ${process.env.UPLOAD_EXTERNAL_API_KEY}`,
        }
      : undefined,
  });

  if (!response.ok) {
    throw new Error("External upload storage failed.");
  }

  const data = (await response.json()) as { url?: string; path?: string };
  const url = data.url || (data.path ? `${publicBaseUrl.replace(/\/$/, "")}/${data.path.replace(/^\//, "")}` : "");

  if (!url) {
    throw new Error("External upload storage returned an invalid response.");
  }

  return {
    url,
    storageMode: "external",
  };
}

export async function storeUploadedImage(file: File) {
  assertImage(file);

  const mode = process.env.UPLOAD_STORAGE_MODE === "external" ? "external" : "local";
  const stored = mode === "external" ? await storeViaExternalUploader(file) : await storeLocally(file);

  logInfo("upload.completed", {
    storageMode: stored.storageMode,
    fileType: file.type,
    fileSize: file.size,
  });

  return stored;
}
