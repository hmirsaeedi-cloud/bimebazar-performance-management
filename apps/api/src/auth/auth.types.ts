export type RoleCode = "EMPLOYEE" | "MANAGER" | "NEXT_LEVEL_MANAGER" | "HRBP" | "HR_ADMIN";

export type AccountStatus = "invited" | "active" | "locked" | "deactivated";

export type PermissionCode =
  | "auth.login"
  | "auth.logout"
  | "auth.me"
  | "auth.create_user"
  | "auth.deactivate_user"
  | "profiles.read"
  | "profiles.create"
  | "profiles.update"
  | "profiles.deactivate"
  | "profiles.export"
  | "profiles.bulk_import"
  | "profiles.import_read"
  | "org_units.read"
  | "org_units.write"
  | "rbac.read"
  | "rbac.assign_role"
  | "rbac.revoke_role"
  | "rbac.configure_permissions"
  | "rbac.sync_manager_roles"
  | "forms.read"
  | "forms.create"
  | "forms.update"
  | "forms.publish"
  | "forms.return"
  | "forms.archive"
  | "mpa.read"
  | "mpa.create"
  | "mpa.update"
  | "mpa.submit"
  | "mpa.approve_employee"
  | "mpa.approve_manager"
  | "mpa.activate"
  | "mpa.return"
  | "mpa.archive"
  | "process.read"
  | "process.create"
  | "process.update"
  | "process.configure"
  | "process.start"
  | "process.pause"
  | "process.complete"
  | "process.cancel"
  | "core.calendar.read"
  | "core.calendar.update"
  | "core.calendar.override"
  | "core.language.read"
  | "core.language.update"
  | "core.language.override"
  | "storage.profile_documents.read"
  | "storage.profile_documents.write";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  employeeId: string | null;
  role: RoleCode;
  roles: RoleCode[];
  permissions: PermissionCode[];
  status: AccountStatus;
  failedLoginCount: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}
