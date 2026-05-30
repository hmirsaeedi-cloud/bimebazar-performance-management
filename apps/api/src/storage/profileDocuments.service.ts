import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "../supabase/client.js";
import type { AuthUser } from "../auth/auth.types.js";

const bucket = "profile-documents";

export async function createProfileDocumentUploadUrl(input: {
  actor: AuthUser;
  targetUserId: string;
  fileName: string;
}) {
  if (!input.actor.permissions.includes("storage.profile_documents.write")) {
    throw new Error("Permission denied");
  }

  const admin = createSupabaseAdminClient();
  const objectPath = `${input.targetUserId}/${randomUUID()}-${input.fileName}`;
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(objectPath);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create upload URL");
  }

  return {
    bucket,
    objectPath,
    signedUrl: data.signedUrl,
    token: data.token,
  };
}

export async function createProfileDocumentReadUrl(input: {
  actor: AuthUser;
  objectPath: string;
  expiresInSeconds?: number;
}) {
  if (!input.actor.permissions.includes("storage.profile_documents.read")) {
    throw new Error("Permission denied");
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(input.objectPath, input.expiresInSeconds ?? 300);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create read URL");
  }

  return data;
}
