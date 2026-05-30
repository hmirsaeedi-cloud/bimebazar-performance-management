import { randomUUID } from "node:crypto";
import {
  accountStatuses,
  authActions,
  getAuthState,
  transitionAuthState,
} from "@bimebazar/auth-workflow";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditEvent } from "../audit/audit.service.js";
import { createProfile, getAuthUserById, recordSuccessfulLogin, updateUserStatus } from "../db/repository.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import { notifyUserCreated } from "../notifications/notification.service.js";
import type { AuthUser } from "./auth.types.js";

export async function login(supabase: SupabaseClient, input: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword(input);

  if (error || !data.user) {
    await writeAuditEvent({
      actorUserId: null,
      targetUserId: null,
      action: authActions.FAILED_LOGIN,
      entityType: "auth.users",
      reason: error?.message ?? "Invalid email or password",
      metadata: { email: input.email },
    });
    throw new Error("Invalid email or password");
  }

  const user = await getAuthUserById(supabase, data.user.id);
  if (!user || user.status !== accountStatuses.ACTIVE) {
    await supabase.auth.signOut();
    throw new Error("Account is not active");
  }

  const nextState = transitionAuthState(user.status, authActions.LOGIN);
  await recordSuccessfulLogin(supabase, user.id);
  await writeAuditEvent({
    actorUserId: user.id,
    targetUserId: user.id,
    action: authActions.LOGIN,
    entityType: "auth.session",
    fromStatus: user.status,
    toStatus: nextState.status,
    metadata: { owner: nextState.owner, nextAction: nextState.nextAction },
  });

  return { user };
}

export async function logout(supabase: SupabaseClient, input: { actor: AuthUser }) {
  await supabase.auth.signOut();

  const state = getAuthState(input.actor.status);
  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: input.actor.id,
    action: authActions.LOGOUT,
    entityType: "auth.session",
    fromStatus: input.actor.status,
    toStatus: input.actor.status,
    metadata: { owner: state.owner, nextAction: state.nextAction },
  });
}

export async function createUser(input: {
  actor: AuthUser;
  email: string;
  displayName: string;
  employeeId?: string;
  role: AuthUser["role"];
}) {
  const admin = createSupabaseAdminClient();
  const state = getAuthState(accountStatuses.INVITED);
  const temporaryPassword = randomUUID();

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      display_name: input.displayName,
    },
    app_metadata: {
      role: input.role,
      account_status: state.status,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Supabase Auth user creation failed");
  }

  const user = await createProfile(admin, {
    id: data.user.id,
    email: input.email,
    displayName: input.displayName,
    employeeId: input.employeeId ?? null,
    role: input.role,
    status: state.status,
  });

  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: user.id,
    action: authActions.CREATE_ACCOUNT,
    entityType: "auth.users",
    entityId: user.id,
    fromStatus: null,
    toStatus: state.status,
    metadata: { owner: state.owner, nextAction: state.nextAction, role: input.role },
  });
  await notifyUserCreated({ userId: user.id, temporaryPassword });

  return user;
}

export async function deactivateUser(input: { actor: AuthUser; targetUserId: string; reason: string }) {
  const admin = createSupabaseAdminClient();
  const target = await getAuthUserById(admin, input.targetUserId);
  if (!target) {
    throw new Error("User not found");
  }

  const previousStatus = target.status;
  const nextState = transitionAuthState(previousStatus, authActions.DEACTIVATE_ACCOUNT);
  const updatedUser = await updateUserStatus(admin, target.id, nextState.status);
  if (!updatedUser) {
    throw new Error("User not found");
  }

  await admin.auth.admin.updateUserById(target.id, {
    app_metadata: {
      role: target.role,
      account_status: nextState.status,
    },
  });

  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: target.id,
    action: authActions.DEACTIVATE_ACCOUNT,
    entityType: "auth.users",
    entityId: target.id,
    fromStatus: previousStatus,
    toStatus: nextState.status,
    reason: input.reason,
    metadata: {
      owner: nextState.owner,
      nextAction: nextState.nextAction,
      note: "Existing JWTs remain valid until expiry; keep JWT TTL short for strict deactivation.",
    },
  });

  return updatedUser;
}
