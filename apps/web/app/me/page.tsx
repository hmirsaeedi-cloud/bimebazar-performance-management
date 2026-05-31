import { redirect } from "next/navigation";
import { mapCurrentUser, type ProfileRow } from "../../components/auth/api";
import { createClient } from "../../lib/supabase/server";

export default async function MePage() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const claimsPayload = claims as
    | { claims?: { sub?: string }; user?: { sub?: string; id?: string } }
    | null;
  const subject = claimsPayload?.claims?.sub ?? claimsPayload?.user?.sub ?? claimsPayload?.user?.id;

  if (!subject) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,display_name,employee_id,role_code,account_status,failed_login_count,preferred_calendar,preferred_locale,date_display_timezone,calendar_preference_status,preferred_language,text_direction,language_preference_status")
    .eq("id", subject)
    .single<ProfileRow>();

  if (!profile) {
    redirect("/login");
  }

  const { data: rolePermissions } = await supabase
    .from("role_permissions")
    .select("permission_code")
    .eq("role_code", profile.role_code)
    .returns<Array<{ permission_code: string }>>();
  const user = mapCurrentUser(profile, rolePermissions?.map((item) => item.permission_code) ?? []);

  return (
    <main className="profile-shell">
      <section className="profile-card" aria-labelledby="profile-title">
        <h1 id="profile-title">{user.displayName}</h1>
        <p>{user.email}</p>
        <div className="meta-grid">
          <div>
            <span>Role</span>
            <strong>{user.role}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{user.status}</strong>
          </div>
          <div>
            <span>Employee ID</span>
            <strong>{user.employeeId ?? "Not assigned"}</strong>
          </div>
          <div>
            <span>Permissions</span>
            <strong>{user.permissions.length}</strong>
          </div>
          <div>
            <span>Calendar</span>
            <strong>{user.preferredCalendar}</strong>
          </div>
          <div>
            <span>Locale</span>
            <strong>{user.preferredLocale}</strong>
          </div>
          <div>
            <span>Timezone</span>
            <strong>{user.dateDisplayTimezone}</strong>
          </div>
          <div>
            <span>Calendar status</span>
            <strong>{user.calendarPreferenceStatus}</strong>
          </div>
          <div>
            <span>Language</span>
            <strong>{user.preferredLanguage}</strong>
          </div>
          <div>
            <span>Direction</span>
            <strong>{user.textDirection}</strong>
          </div>
          <div>
            <span>Language status</span>
            <strong>{user.languagePreferenceStatus}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
