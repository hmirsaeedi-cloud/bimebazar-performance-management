(function () {
  const SUPABASE_HOST = "omjblauittoyxknabrqg.supabase.co";
  const now = new Date("2026-06-06T09:00:00+03:30");
  const iso = (days = 0) => new Date(now.getTime() + days * 86400000).toISOString();
  const id = (name) => `demo-${name}`;

  if (!localStorage.getItem("bb_access_token")) {
    localStorage.setItem("bb_access_token", "demo-presentation-token");
  }

  const demoAccounts = [
    { roleLabel: "HR Admin", roleSelect: "hr_admin", userId: id("hr-admin"), email: "h.mirsaeedi@bimebazar.com", password: "Demo@1405" },
    { roleLabel: "HRBP", roleSelect: "hrbp", userId: id("hrbp"), email: "sara.ahmadi@bimebazar.com", password: "Demo@1405" },
    { roleLabel: "Manager", roleSelect: "manager", userId: id("reza"), email: "reza.moradi@bimebazar.com", password: "Demo@1405" },
    { roleLabel: "Employee", roleSelect: "employee", userId: id("niloo"), email: "niloofar.karimi@bimebazar.com", password: "Demo@1405" },
  ];

  function currentDemoAccount() {
    const storedUserId = localStorage.getItem("bb_demo_user_id");
    return demoAccounts.find((account) => account.userId === storedUserId) || demoAccounts[0];
  }

  const profiles = [
    { id: id("hr-admin"), employee_id: "BB-001", email: "h.mirsaeedi@bimebazar.com", username: "h.mirsaeedi", display_name: "Hossein Mirsaeedi", full_name_english: "Hossein Mirsaeedi", full_name_persian: "حسین میرسعیدی", role_code: "HR_ADMIN", primary_role: "HR_ADMIN", account_status: "active", level: "L6", position_title: "People Product Lead", phone: "+98 21 9100 0001", business_unit_id: id("bu-people"), department_id: id("dept-people"), team_id: id("team-people-ops"), manager_id: null, hrbp_id: id("hrbp"), join_date: "2022-01-10", preferred_locale: "fa-IR", preferred_language: "fa", preferred_calendar: "jalali", text_direction: "rtl", language_preference_status: "approved", org_unit_id: id("team-people-ops") },
    { id: id("hrbp"), employee_id: "BB-014", email: "sara.ahmadi@bimebazar.com", username: "sara.ahmadi", display_name: "Sara Ahmadi", full_name_english: "Sara Ahmadi", full_name_persian: "سارا احمدی", role_code: "HRBP", primary_role: "HRBP", account_status: "active", level: "L5", position_title: "HR Business Partner", phone: "+98 21 9100 0014", business_unit_id: id("bu-people"), department_id: id("dept-people"), team_id: id("team-people-ops"), manager_id: id("hr-admin"), hrbp_id: id("hrbp"), join_date: "2021-05-22", preferred_locale: "fa-IR", preferred_language: "fa", preferred_calendar: "jalali", text_direction: "rtl", language_preference_status: "approved", org_unit_id: id("team-people-ops") },
    { id: id("nima"), employee_id: "BB-022", email: "nima.rad@bimebazar.com", username: "nima.rad", display_name: "Nima Rad", full_name_english: "Nima Rad", full_name_persian: "نیما راد", role_code: "NEXT_LEVEL_MANAGER", primary_role: "NEXT_LEVEL_MANAGER", account_status: "active", level: "L6", position_title: "Head of Commercial", phone: "+98 21 9100 0022", business_unit_id: id("bu-commercial"), department_id: id("dept-sales"), team_id: id("team-sales"), manager_id: id("hr-admin"), hrbp_id: id("hrbp"), join_date: "2020-03-11", preferred_locale: "en-US", preferred_language: "en", preferred_calendar: "jalali", text_direction: "ltr", language_preference_status: "approved", org_unit_id: id("team-sales") },
    { id: id("reza"), employee_id: "BB-034", email: "reza.moradi@bimebazar.com", username: "reza.moradi", display_name: "Reza Moradi", full_name_english: "Reza Moradi", full_name_persian: "رضا مرادی", role_code: "MANAGER", primary_role: "MANAGER", account_status: "active", level: "L5", position_title: "Sales Lead", phone: "+98 21 9100 0034", business_unit_id: id("bu-commercial"), department_id: id("dept-sales"), team_id: id("team-sales"), manager_id: id("nima"), hrbp_id: id("hrbp"), join_date: "2021-09-01", preferred_locale: "fa-IR", preferred_language: "fa", preferred_calendar: "jalali", text_direction: "rtl", language_preference_status: "approved", org_unit_id: id("team-sales") },
    { id: id("niloo"), employee_id: "BB-041", email: "niloofar.karimi@bimebazar.com", username: "niloofar.karimi", display_name: "Niloofar Karimi", full_name_english: "Niloofar Karimi", full_name_persian: "نیلوفر کریمی", role_code: "EMPLOYEE", primary_role: "EMPLOYEE", account_status: "active", level: "L3", position_title: "Customer Success Specialist", phone: "+98 21 9100 0041", business_unit_id: id("bu-commercial"), department_id: id("dept-cx"), team_id: id("team-cx"), manager_id: id("reza"), hrbp_id: id("hrbp"), join_date: "2023-02-18", preferred_locale: "fa-IR", preferred_language: "fa", preferred_calendar: "jalali", text_direction: "rtl", language_preference_status: "approved", org_unit_id: id("team-cx") },
    { id: id("ali"), employee_id: "BB-052", email: "ali.mansouri@bimebazar.com", username: "ali.mansouri", display_name: "Ali Mansouri", full_name_english: "Ali Mansouri", full_name_persian: "علی منصوری", role_code: "EMPLOYEE", primary_role: "EMPLOYEE", account_status: "active", level: "L4", position_title: "Backend Engineer", phone: "+98 21 9100 0052", business_unit_id: id("bu-product"), department_id: id("dept-engineering"), team_id: id("team-platform"), manager_id: id("leila"), hrbp_id: id("hrbp"), join_date: "2022-08-15", preferred_locale: "en-US", preferred_language: "en", preferred_calendar: "jalali", text_direction: "ltr", language_preference_status: "approved", org_unit_id: id("team-platform") },
    { id: id("leila"), employee_id: "BB-061", email: "leila.farzan@bimebazar.com", username: "leila.farzan", display_name: "Leila Farzan", full_name_english: "Leila Farzan", full_name_persian: "لیلا فرزان", role_code: "MANAGER", primary_role: "MANAGER", account_status: "active", level: "L5", position_title: "Engineering Manager", phone: "+98 21 9100 0061", business_unit_id: id("bu-product"), department_id: id("dept-engineering"), team_id: id("team-platform"), manager_id: id("nima"), hrbp_id: id("hrbp"), join_date: "2020-12-05", preferred_locale: "en-US", preferred_language: "en", preferred_calendar: "jalali", text_direction: "ltr", language_preference_status: "approved", org_unit_id: id("team-platform") },
    { id: id("maryam"), employee_id: "BB-073", email: "maryam.sadeghi@bimebazar.com", username: "maryam.sadeghi", display_name: "Maryam Sadeghi", full_name_english: "Maryam Sadeghi", full_name_persian: "مریم صادقی", role_code: "EMPLOYEE", primary_role: "EMPLOYEE", account_status: "active", level: "L3", position_title: "Product Designer", phone: "+98 21 9100 0073", business_unit_id: id("bu-product"), department_id: id("dept-product"), team_id: id("team-product"), manager_id: id("leila"), hrbp_id: id("hrbp"), join_date: "2023-10-07", preferred_locale: "fa-IR", preferred_language: "fa", preferred_calendar: "jalali", text_direction: "rtl", language_preference_status: "approved", org_unit_id: id("team-product") },
    { id: id("omid"), employee_id: "BB-084", email: "omid.tavakoli@bimebazar.com", username: "omid.tavakoli", display_name: "Omid Tavakoli", full_name_english: "Omid Tavakoli", full_name_persian: "امید توکلی", role_code: "EMPLOYEE", primary_role: "EMPLOYEE", account_status: "active", level: "L2", position_title: "Claims Analyst", phone: "+98 21 9100 0084", business_unit_id: id("bu-ops"), department_id: id("dept-claims"), team_id: id("team-claims"), manager_id: id("reza"), hrbp_id: id("hrbp"), join_date: "2024-04-20", preferred_locale: "fa-IR", preferred_language: "fa", preferred_calendar: "jalali", text_direction: "rtl", language_preference_status: "draft", org_unit_id: id("team-claims") },
    { id: id("deactivated"), employee_id: "BB-099", email: "old.user@bimebazar.com", username: "old.user", display_name: "Former Employee", full_name_english: "Former Employee", full_name_persian: "کارمند سابق", role_code: "EMPLOYEE", primary_role: "EMPLOYEE", account_status: "deactivated", level: "L2", position_title: "Former Specialist", business_unit_id: id("bu-ops"), department_id: id("dept-claims"), team_id: id("team-claims"), manager_id: id("reza"), hrbp_id: id("hrbp"), join_date: "2021-04-20", preferred_locale: "fa-IR", preferred_calendar: "jalali", org_unit_id: id("team-claims") },
  ];

  const endSchema = {
    title: "End-cycle evaluation v3",
    sections: [
      { id: "results", title: "Results", weight: 60, questions: [{ id: "results_rating", type: "scale", label: "Business results", min: 0, max: 5, weight: 60, required: true }] },
      { id: "behaviors", title: "Behaviors", weight: 40, questions: [{ id: "behavior_rating", type: "scale", label: "Leadership behaviors", min: 0, max: 5, weight: 40, required: true }] },
    ],
  };

  const db = {
    business_units: [
      { id: id("bu-commercial"), name: "Commercial" },
      { id: id("bu-product"), name: "Product and Technology" },
      { id: id("bu-ops"), name: "Operations" },
      { id: id("bu-people"), name: "People" },
    ],
    departments: [
      { id: id("dept-sales"), name: "Sales", business_unit_id: id("bu-commercial") },
      { id: id("dept-cx"), name: "Customer Experience", business_unit_id: id("bu-commercial") },
      { id: id("dept-engineering"), name: "Engineering", business_unit_id: id("bu-product") },
      { id: id("dept-product"), name: "Product", business_unit_id: id("bu-product") },
      { id: id("dept-claims"), name: "Claims", business_unit_id: id("bu-ops") },
      { id: id("dept-people"), name: "People Operations", business_unit_id: id("bu-people") },
    ],
    teams: [
      { id: id("team-sales"), name: "Insurance Sales", department_id: id("dept-sales") },
      { id: id("team-cx"), name: "Customer Success", department_id: id("dept-cx") },
      { id: id("team-platform"), name: "Platform", department_id: id("dept-engineering") },
      { id: id("team-product"), name: "Product Design", department_id: id("dept-product") },
      { id: id("team-claims"), name: "Claims Operations", department_id: id("dept-claims") },
      { id: id("team-people-ops"), name: "People Operations", department_id: id("dept-people") },
    ],
    profiles,
    profile_roles: [
      { user_id: id("reza"), role_code: "MANAGER", assignment_type: "computed", status: "active" },
      { user_id: id("leila"), role_code: "MANAGER", assignment_type: "computed", status: "active" },
      { user_id: id("nima"), role_code: "NEXT_LEVEL_MANAGER", assignment_type: "manual", status: "active" },
      { user_id: id("hrbp"), role_code: "HRBP", assignment_type: "manual", status: "active" },
      { user_id: id("hr-admin"), role_code: "HR_ADMIN", assignment_type: "manual", status: "active" },
    ],
    form_templates: [
      { id: id("tpl-end"), name: "End-cycle evaluation", status: "published", current_version_id: id("tpl-end-v3"), updated_at: iso(-8), form_template_versions: [] },
      { id: id("tpl-self"), name: "Self-assessment", status: "published", current_version_id: id("tpl-self-v2"), updated_at: iso(-10), form_template_versions: [] },
      { id: id("tpl-pulse"), name: "Pulse survey", status: "published", current_version_id: id("tpl-pulse-v1"), updated_at: iso(-12), form_template_versions: [] },
    ],
    form_template_versions: [
      { id: id("tpl-end-v3"), template_id: id("tpl-end"), version_number: 3, status: "published", schema: endSchema, created_at: iso(-20), updated_at: iso(-8) },
      { id: id("tpl-self-v2"), template_id: id("tpl-self"), version_number: 2, status: "published", schema: { title: "Self-assessment v2", sections: [{ id: "wins", title: "Wins", questions: [{ id: "wins_text", type: "textarea", label: "Top wins", required: true }] }] }, created_at: iso(-25), updated_at: iso(-10) },
      { id: id("tpl-pulse-v1"), template_id: id("tpl-pulse"), version_number: 1, status: "published", schema: { title: "Engagement pulse", sections: [{ id: "pulse", title: "Pulse", questions: [{ id: "engagement", type: "scale", label: "Engagement", min: 0, max: 5, required: true }] }] }, created_at: iso(-30), updated_at: iso(-12) },
    ],
    form_conditional_logic_rules: [
      { id: id("logic-1"), form_template_id: id("tpl-end"), form_template_version_id: id("tpl-end-v3"), status: "approved", owner_role: "HR_ADMIN", next_action: "publish", rules: [{ when: "results_rating <= 2", then: "show_pip_context" }], created_by: id("hr-admin"), updated_by: id("hr-admin"), updated_at: iso(-5) },
    ],
    performance_processes: [
      { id: id("process-end"), name: "End-cycle 1405", process_type: "end_cycle", status: "active", owner_role: "MANAGER", next_action: "submit_evaluations", form_template_id: id("tpl-end"), locked_form_template_version_id: id("tpl-end-v3"), locked_form_version_number: 3, locked_form_schema: endSchema, eligible_employee_count: 8, participant_count: 8, org_filters: { teams: ["all"] }, starts_at: iso(-14), ends_at: iso(21), created_by: id("hr-admin"), updated_by: id("hr-admin"), updated_at: iso(-1) },
      { id: id("process-self"), name: "Self-assessment 1405", process_type: "self_assessment", status: "active", owner_role: "EMPLOYEE", next_action: "submit", form_template_id: id("tpl-self"), locked_form_template_version_id: id("tpl-self-v2"), locked_form_version_number: 2, eligible_employee_count: 8, participant_count: 8, starts_at: iso(-20), ends_at: iso(7), created_by: id("hr-admin"), updated_by: id("hr-admin"), updated_at: iso(-2) },
      { id: id("process-down"), name: "Downward evaluation chain", process_type: "downward_evaluation", status: "active", owner_role: "NEXT_LEVEL_MANAGER", next_action: "approve", form_template_id: id("tpl-end"), locked_form_template_version_id: id("tpl-end-v3"), locked_form_version_number: 3, eligible_employee_count: 6, participant_count: 6, starts_at: iso(-12), ends_at: iso(14), created_by: id("hr-admin"), updated_by: id("hr-admin"), updated_at: iso(-3) },
      { id: id("process-zero"), name: "Zero eligible filter example", process_type: "survey", status: "blocked", owner_role: "HR_ADMIN", next_action: "fix_filters", eligible_employee_count: 0, participant_count: 0, org_filters: { team: "Archived Team" }, created_by: id("hr-admin"), updated_by: id("hr-admin"), updated_at: iso(-4) },
    ],
    process_participants: [
      { id: id("part-niloo"), process_id: id("process-end"), employee_id: id("niloo"), manager_id: id("reza"), status: "active", metadata: { formVersion: 3 }, created_at: iso(-14), updated_at: iso(-1) },
      { id: id("part-ali"), process_id: id("process-end"), employee_id: id("ali"), manager_id: id("leila"), status: "active", metadata: { formVersion: 3 }, created_at: iso(-14), updated_at: iso(-1) },
      { id: id("part-maryam"), process_id: id("process-end"), employee_id: id("maryam"), manager_id: id("leila"), status: "active", metadata: { formVersion: 3 }, created_at: iso(-14), updated_at: iso(-1) },
      { id: id("part-omid"), process_id: id("process-end"), employee_id: id("omid"), manager_id: id("reza"), status: "active", metadata: { formVersion: 3 }, created_at: iso(-14), updated_at: iso(-1) },
      { id: id("part-self-niloo"), process_id: id("process-self"), employee_id: id("niloo"), manager_id: id("reza"), status: "active", metadata: {}, created_at: iso(-20), updated_at: iso(-1) },
      { id: id("part-down-ali"), process_id: id("process-down"), employee_id: id("ali"), manager_id: id("leila"), status: "active", metadata: {}, created_at: iso(-12), updated_at: iso(-1) },
    ],
    process_form_instances: [
      { id: id("inst-niloo"), process_id: id("process-end"), employee_id: id("niloo"), manager_id: id("reza"), status: "submitted", owner_role: "NEXT_LEVEL_MANAGER", next_action: "approve", form_template_version_id: id("tpl-end-v3"), locked_form_version_number: 3, answers: { results_rating: { value: 4, selected: true }, behavior_rating: { value: 5, selected: true } }, updated_at: iso(-1) },
      { id: id("inst-ali"), process_id: id("process-end"), employee_id: id("ali"), manager_id: id("leila"), status: "draft", owner_role: "MANAGER", next_action: "submit", form_template_version_id: id("tpl-end-v3"), locked_form_version_number: 3, answers: {}, updated_at: iso(-2) },
    ],
    process_self_assessments: [
      { id: id("self-niloo"), process_id: id("process-self"), employee_id: id("niloo"), status: "submitted", owner_role: "MANAGER", next_action: "review", answers: { wins_text: "Reduced customer response time by 18%." }, submitted_at: iso(-2), updated_at: iso(-2) },
      { id: id("self-ali"), process_id: id("process-self"), employee_id: id("ali"), status: "draft", owner_role: "EMPLOYEE", next_action: "submit", answers: { wins_text: "Platform reliability work in progress." }, updated_at: iso(-1) },
    ],
    process_downward_evaluations: [
      { id: id("down-ali"), process_id: id("process-down"), employee_id: id("ali"), manager_id: id("leila"), next_level_manager_id: id("nima"), hrbp_id: id("hrbp"), status: "next_level_review", owner_role: "NEXT_LEVEL_MANAGER", next_action: "approve", score: 84, weighted_score: 84, answers: { results_rating: { value: 4, selected: true }, behavior_rating: { value: 4, selected: true } }, review_chain: { currentStep: "NEXT_LEVEL_MANAGER" }, updated_at: iso(-1) },
      { id: id("down-omid"), process_id: id("process-down"), employee_id: id("omid"), manager_id: id("reza"), next_level_manager_id: id("nima"), hrbp_id: id("hrbp"), status: "returned", owner_role: "MANAGER", next_action: "revise", score: 48, weighted_score: 48, answers: { results_rating: { value: 2, selected: true }, behavior_rating: { value: 3, selected: true } }, review_chain: { currentStep: "MANAGER" }, updated_at: iso(-2) },
    ],
    end_cycle_evaluations: [
      { id: id("eval-niloo"), process_id: id("process-end"), employee_id: id("niloo"), manager_id: id("reza"), next_level_manager_id: id("nima"), head_reviewer_id: id("nima"), hrbp_id: id("hrbp"), status: "submitted", owner_role: "NEXT_LEVEL_MANAGER", next_action: "approve", score: { visible: true, totalScore: 92, sections: [{ sectionId: "results", sectionTitle: "Results", contribution: 60 }, { sectionId: "behaviors", sectionTitle: "Behaviors", contribution: 32 }] }, weighted_score: 92, answers: { results_rating: { value: 5, selected: true }, behavior_rating: { value: 4, selected: true } }, score_engine_version: "weighted-v1", score_snapshot: { sections: [{ title: "Results", contribution: 60 }, { title: "Behaviors", contribution: 32 }] }, review_chain: { currentStep: "NEXT_LEVEL_MANAGER" }, created_at: iso(-12), updated_at: iso(-1) },
      { id: id("eval-ali"), process_id: id("process-end"), employee_id: id("ali"), manager_id: id("leila"), next_level_manager_id: id("nima"), head_reviewer_id: id("nima"), hrbp_id: id("hrbp"), status: "manager_draft", owner_role: "MANAGER", next_action: "submit", score: { visible: false, totalScore: null, sections: [] }, weighted_score: null, answers: { results_rating: { value: 0, selected: true }, behavior_rating: { value: 4, selected: true } }, score_engine_version: "weighted-v1", created_at: iso(-12), updated_at: iso(-1) },
      { id: id("eval-omid"), process_id: id("process-end"), employee_id: id("omid"), manager_id: id("reza"), next_level_manager_id: id("nima"), head_reviewer_id: id("nima"), hrbp_id: id("hrbp"), status: "hrbp_review", owner_role: "HRBP", next_action: "approve_or_trigger_pip", score: { visible: true, totalScore: 46, sections: [{ sectionId: "results", sectionTitle: "Results", contribution: 24 }, { sectionId: "behaviors", sectionTitle: "Behaviors", contribution: 22 }] }, weighted_score: 46, answers: { results_rating: { value: 2, selected: true }, behavior_rating: { value: 2, selected: true } }, score_engine_version: "weighted-v1", created_at: iso(-12), updated_at: iso(-1) },
    ],
    mid_cycle_evaluations: [
      { id: id("mid-niloo"), process_id: id("process-end"), employee_id: id("niloo"), manager_id: id("reza"), hrbp_id: id("hrbp"), status: "approved", owner_role: "SYSTEM", next_action: null, score: 86, weighted_score: 86, answers: { progress: 4, support: 5 }, created_at: iso(-45), updated_at: iso(-30) },
      { id: id("mid-ali"), process_id: id("process-end"), employee_id: id("ali"), manager_id: id("leila"), hrbp_id: id("hrbp"), status: "submitted", owner_role: "HRBP", next_action: "approve", score: 78, weighted_score: 78, answers: { progress: 4, support: 4 }, created_at: iso(-45), updated_at: iso(-3) },
    ],
    evaluation_score_snapshots: [
      { id: id("score-niloo"), evaluation_id: id("eval-niloo"), status: "submitted", score: 92, section_contributions: [{ section: "Results", contribution: 60 }, { section: "Behaviors", contribution: 32 }], created_at: iso(-1) },
    ],
    mid_cycle_score_snapshots: [
      { id: id("mid-score-ali"), evaluation_id: id("mid-ali"), status: "submitted", score: 78, section_contributions: [{ section: "Progress", contribution: 44 }, { section: "Support", contribution: 34 }], created_at: iso(-3) },
    ],
    evaluation_comparisons: [
      { id: id("compare-niloo"), employee_id: id("niloo"), self_assessment_id: id("self-niloo"), manager_evaluation_id: id("eval-niloo"), status: "ready", owner_role: "HRBP", next_action: "review_gap", comparison: { self: "Strong delivery", manager: "Strong delivery plus mentoring", gap: "Low" }, updated_at: iso(-1) },
    ],
    mpa_cycles: [{ id: id("mpa-cycle-1405"), name: "MPA 1405", starts_on: "2026-03-21", ends_on: "2027-03-20", status: "active" }],
    mpas: [
      { id: id("mpa-niloo"), title: "Customer Success MPA", employee_id: id("niloo"), cycle_id: id("mpa-cycle-1405"), status: "approved", owner_role: "SYSTEM", next_action: null, content_format: "rich_text", content_plain_text: "Improve renewal quality and customer response time.", content: { html: "<p>Improve renewal quality and customer response time.</p>" }, approval_visibility: "visible", last_return_reason: null, updated_at: iso(-7) },
      { id: id("mpa-omid"), title: "Claims Quality MPA", employee_id: id("omid"), cycle_id: id("mpa-cycle-1405"), status: "returned", owner_role: "MANAGER", next_action: "revise", content_format: "rich_text", content_plain_text: "Reduce claim rework and improve documentation quality.", content: { html: "<p>Reduce claim rework and improve documentation quality.</p>" }, approval_visibility: "manager_only", last_return_reason: "Add measurable quality target.", updated_at: iso(-2) },
    ],
    mpa_content_revisions: [{ id: id("mpa-rev-1"), mpa_id: id("mpa-omid"), revision_number: 2, content_plain_text: "Added quality target.", created_at: iso(-2), created_by: id("reza") }],
    mpa_history_versions: [
      { id: id("mpa-hist-1"), mpa_id: id("mpa-niloo"), employee_id: id("niloo"), cycle_id: id("mpa-cycle-1405"), version_number: 3, status: "reviewed", owner_role: "SYSTEM", next_action: null, source_mpa_status: "approved", title: "Customer Success MPA", content_format: "rich_text", content_plain_text: "Improve renewal quality and customer response time.", approval_visibility: { employeeCanViewHistoryVersion: true }, snapshot: { contentPlainText: "Improve renewal quality and customer response time." }, comparison_summary: { summary: "Final HRBP approval" }, created_at: iso(-7), updated_at: iso(-7) },
      { id: id("mpa-hist-2"), mpa_id: id("mpa-omid"), employee_id: id("omid"), cycle_id: id("mpa-cycle-1405"), version_number: 2, status: "captured", owner_role: "HRBP", next_action: "review", source_mpa_status: "returned", title: "Claims Quality MPA", content_format: "rich_text", content_plain_text: "Reduce claim rework and improve documentation quality.", approval_visibility: { employeeCanViewHistoryVersion: false }, snapshot: { contentPlainText: "Reduce claim rework and improve documentation quality." }, comparison_summary: { summary: "Manager returned for measurable quality target." }, created_at: iso(-2), updated_at: iso(-2) },
    ],
    mpa_evaluation_attachments: [{ id: id("mpa-attach-1"), mpa_id: id("mpa-niloo"), evaluation_type: "end_cycle", evaluation_id: id("eval-niloo"), attached_at: iso(-1) }],
    performance_band_flags: [
      { id: id("flag-promo-niloo"), employee_id: id("niloo"), evaluation_id: id("eval-niloo"), flag_type: "promotion", band_label: "Promotion ready", rationale: "Weighted score 92 is above the promotion threshold.", status: "generated", owner_role: "HRBP", next_action: "review", weighted_score: 92, score_engine_version: "weighted-v1", section_contributions: [{ sectionTitle: "Results", contribution: 60 }, { sectionTitle: "Behaviors", contribution: 32 }], visibility: { employeeCanView: false, managerCanView: true, hrbpCanView: true, hrAdminCanView: true }, created_at: iso(-1), updated_at: iso(-1) },
      { id: id("flag-pip-omid"), employee_id: id("omid"), evaluation_id: id("eval-omid"), flag_type: "pip", band_label: "PIP watch", rationale: "Weighted score 46 is below the PIP threshold.", status: "generated", owner_role: "HRBP", next_action: "review", weighted_score: 46, score_engine_version: "weighted-v1", section_contributions: [{ sectionTitle: "Results", contribution: 24 }, { sectionTitle: "Behaviors", contribution: 22 }], visibility: { employeeCanView: false, managerCanView: true, hrbpCanView: true, hrAdminCanView: true }, created_at: iso(-1), updated_at: iso(-1) },
    ],
    promotion_cases: [{ id: id("promo-niloo"), employee_id: id("niloo"), status: "manager_submitted", owner_role: "HRBP", next_action: "approve", proposed_level: "L4", business_case: "Sustained high performance and mentoring impact.", evidence: { score: 92, band: "top" }, created_by: id("reza"), updated_by: id("reza"), updated_at: iso(-1) }],
    pip_cases: [{ id: id("pip-omid"), employee_id: id("omid"), status: "draft", owner_role: "HRBP", next_action: "activate_visibility", visibility_status: "hidden_from_employee", employee_visible: false, plan_summary: "30-day quality improvement plan.", success_criteria: ["Documentation accuracy above 95%", "Weekly manager check-in"], created_by: id("hrbp"), updated_by: id("hrbp"), updated_at: iso(-1) }],
    pd_chat_logs: [
      { id: id("chat-niloo"), employee_id: id("niloo"), manager_id: id("reza"), process_id: id("process-end"), status: "completed", owner_role: "SYSTEM", next_action: null, conversation_date: iso(-5), notes: "Career growth discussion focused on enterprise accounts.", employee_summary: "Wants more complex accounts.", manager_summary: "Ready for stretch ownership.", visibility: "employee_manager", updated_at: iso(-5) },
      { id: id("chat-ali"), employee_id: id("ali"), manager_id: id("leila"), process_id: id("process-end"), status: "scheduled", owner_role: "MANAGER", next_action: "complete", conversation_date: iso(2), notes: "Quarterly development chat.", visibility: "employee_manager", updated_at: iso(-1) },
    ],
    pd_chat_schedules: [{ id: id("chat-schedule-1"), employee_id: id("ali"), manager_id: id("leila"), status: "active", owner_role: "MANAGER", next_action: "run_next", cadence: "monthly", next_run_at: iso(7), topic_template: "Development, blockers, next growth step", updated_at: iso(-1) }],
    pd_chat_evaluation_attachments: [{ id: id("chat-attach-1"), pd_chat_log_id: id("chat-niloo"), evaluation_type: "end_cycle", evaluation_id: id("eval-niloo"), status: "attached", updated_at: iso(-1) }],
    feedback_requests: [
      { id: id("feedback-1"), title: "Cross-functional collaboration feedback", status: "collecting", owner_role: "EMPLOYEE", next_action: "respond", requester_user_id: id("reza"), target_user_id: id("niloo"), is_anonymous: true, min_responses: 3, response_count: 3, due_at: iso(5), updated_at: iso(-1) },
      { id: id("feedback-zero"), title: "Anonymous zero-response edge case", status: "no_responses", owner_role: "HRBP", next_action: "extend_or_close", requester_user_id: id("hrbp"), target_user_id: id("ali"), is_anonymous: true, min_responses: 3, response_count: 0, due_at: iso(-1), updated_at: iso(-1) },
    ],
    feedback_request_recipients: [
      { id: id("fr-rec-1"), feedback_request_id: id("feedback-1"), recipient_user_id: id("ali"), status: "submitted" },
      { id: id("fr-rec-2"), feedback_request_id: id("feedback-1"), recipient_user_id: id("maryam"), status: "submitted" },
    ],
    feedback_responses: [
      { id: id("fr-res-1"), feedback_request_id: id("feedback-1"), respondent_user_id: id("ali"), answers: { comment: "Very responsive and thoughtful partner." }, submitted_at: iso(-2) },
    ],
    notifications: [
      { id: id("notif-1"), recipient_user_id: id("hr-admin"), title: "End-cycle approvals waiting", body: "8 evaluations need review before the cycle closes.", status: "unread", priority: "high", owner_role: "HR_ADMIN", next_action: "review", created_at: iso(-1), updated_at: iso(-1) },
      { id: id("notif-2"), recipient_user_id: id("hr-admin"), title: "PIP visibility still hidden", body: "Omid Tavakoli cannot see PIP content until HRBP activation.", status: "unread", priority: "sensitive", owner_role: "HRBP", next_action: "activate_visibility", created_at: iso(-1), updated_at: iso(-1) },
    ],
    email_notifications: [{ id: id("email-1"), recipient_user_id: id("reza"), to_email: "reza.moradi@bimebazar.com", subject: "Evaluation reminder", body: "Please submit remaining evaluations.", status: "queued", owner_role: "SYSTEM", next_action: "send", recipient_visible: true, created_at: iso(-1), updated_at: iso(-1) }],
    notification_preferences: [{ id: id("pref-1"), user_id: id("hr-admin"), channel: "email", event_type: "evaluation.approval_due", status: "active", owner_role: "EMPLOYEE", next_action: "update", enabled: true, quiet_hours: { start: "18:00", end: "08:00" }, updated_at: iso(-3) }],
    dashboard_preferences: [{ id: id("dash-pref-1"), user_id: id("hr-admin"), role_view: "hr_admin", status: "active", owner_role: "HR_ADMIN", next_action: "customize", layout: { widgets: ["cycle", "approvals", "risk"] }, filters: {}, updated_at: iso(-1) }],
    goals: [
      { id: id("goal-company"), title: "Improve customer renewal quality", owner_user_id: id("nima"), parent_goal_id: null, status: "active", owner_role: "NEXT_LEVEL_MANAGER", next_action: "cascade", progress: 72, metric: "Renewal quality", target_value: 90, current_value: 72, updated_at: iso(-1) },
      { id: id("goal-niloo"), title: "Reduce enterprise response time", owner_user_id: id("niloo"), parent_goal_id: id("goal-company"), status: "review", owner_role: "MANAGER", next_action: "approve", progress: 81, metric: "Response time SLA", target_value: 95, current_value: 81, updated_at: iso(-1) },
    ],
    individual_survey_processes: [{ id: id("survey-individual-1"), title: "Support team onboarding survey", description: "Targeted survey for support onboarding.", status: "active", owner_role: "EMPLOYEE", next_action: "submit", form_template_id: id("tpl-pulse"), form_template_version_id: id("tpl-pulse-v1"), locked_form_template_version_id: id("tpl-pulse-v1"), target_employee_ids: [id("niloo"), id("omid")], eligible_employee_count: 2, updated_at: iso(-1), individual_survey_responses: [] }],
    individual_survey_responses: [{ id: id("survey-res-1"), survey_process_id: id("survey-individual-1"), employee_id: id("niloo"), status: "submitted", owner_role: "HRBP", next_action: "approve", answers: { engagement: 4, clarity: 5 }, submitted_at: iso(-1), updated_at: iso(-1) }],
    pulse_survey_processes: [{ id: id("pulse-1"), title: "Monthly team health pulse", status: "collecting", owner_role: "EMPLOYEE", next_action: "respond", eligible_employee_count: 8, min_responses: 5, response_count: 6, anonymity_guard: "passed", form_template_version_id: id("tpl-pulse-v1"), updated_at: iso(-1), pulse_survey_responses: [] }],
    pulse_survey_responses: [{ id: id("pulse-res-1"), pulse_survey_process_id: id("pulse-1"), status: "submitted", answers: { engagement: 4, workload: 3 }, submitted_at: iso(-1) }],
    kudos_feed_items: [{ id: id("kudos-1"), author_user_id: id("leila"), recipient_user_ids: [id("ali")], title: "Platform reliability win", message: "Ali led a clean incident follow-up and improved monitoring.", status: "published", owner_role: "SYSTEM", next_action: null, tags: ["teamwork", "quality"], visibility: "company", updated_at: iso(-1), created_at: iso(-1) }],
    hrbp_report_snapshots: [{ id: id("hrbp-report-1"), title: "HRBP cycle snapshot", status: "ready", owner_role: "HRBP", next_action: "present", period_label: "Khordad 1405", metrics: { completion: 74, high_performers: 3, pip_risk: 4, feedback_coverage: 53 }, cohorts: [{ name: "Commercial", score: 82 }, { name: "Product", score: 78 }, { name: "Operations", score: 61 }], updated_at: iso(-1) }],
    advanced_analytics_snapshots: [{ id: id("analytics-1"), title: "Trends and cohorts", status: "ready", owner_role: "HRBP", next_action: "review", trend_window: "last_4_cycles", cohort_dimension: "business_unit", metrics: { score_trend: [71, 74, 79, 82], pip_rate: [8, 7, 6, 5], promotion_rate: [3, 4, 5, 6] }, updated_at: iso(-1) }],
    team_health_scores: [{ id: id("health-1"), team_id: id("team-sales"), status: "ready", owner_role: "HRBP", next_action: "review", score: 78, drivers: { workload: 68, manager_support: 82, feedback: 74, goal_clarity: 88 }, risk_level: "medium", updated_at: iso(-1) }],
    employee_import_runs: [{ id: id("import-1"), status: "validated", owner_role: "HR_ADMIN", next_action: "approve", file_name: "bimebazar-employees-khordad.xlsx", total_rows: 24, valid_rows: 22, invalid_rows: 2, created_by: id("hr-admin"), updated_at: iso(-2) }],
    employee_import_rows: [
      { id: id("import-row-1"), import_run_id: id("import-1"), row_number: 2, status: "valid", email: "new.hire@bimebazar.com", display_name: "New Hire", errors: [], profile_id: null },
      { id: id("import-row-2"), import_run_id: id("import-1"), row_number: 7, status: "invalid", email: "", display_name: "Missing Email", errors: ["Email is required"], profile_id: null },
    ],
    employee_export_reports: [{ id: id("export-1"), status: "generated", owner_role: "HR_ADMIN", next_action: "download", row_count: 9, filters: { account_status: "active" }, created_by: id("hr-admin"), updated_at: iso(-1) }],
    hris_integrations: [{ id: id("hris-1"), name: "BimeBazar HRIS", provider: "custom_api", status: "connected", owner_role: "HR_ADMIN", next_action: "sync", base_url: "https://hris.bimebazar.local", last_sync_at: iso(-1), updated_at: iso(-1) }],
    hris_sync_runs: [{ id: id("hris-run-1"), integration_id: id("hris-1"), status: "preview_ready", owner_role: "HR_ADMIN", next_action: "approve_import", total_records: 142, valid_records: 139, invalid_records: 3, sample: [{ externalEmployeeId: "BB-001", email: "h.mirsaeedi@bimebazar.com", fullNameEnglish: "Hossein Mirsaeedi" }], updated_at: iso(-1) }],
    profile_org_charts: [{ id: id("org-chart-1"), root_profile_id: id("nima"), status: "published", owner_role: "HRBP", next_action: "review", snapshot: { nodes: profiles.filter((p) => p.account_status !== "deactivated").map((p) => ({ id: p.id, name: p.display_name, manager_id: p.manager_id, title: p.position_title })) }, updated_at: iso(-1) }],
    audit_export_requests: [{ id: id("audit-export-1"), status: "generated", owner_role: "HR_ADMIN", next_action: "verify", row_count: 12, payload_hash: "demo9f2c1e8b4a0d", export_format: "csv", created_at: iso(-1), updated_at: iso(-1) }],
  };

  db.form_templates.forEach((template) => {
    template.form_template_versions = db.form_template_versions.filter((version) => version.template_id === template.id);
  });

  db.audit_events = [
    ["auth.login.succeeded", "auth_session", id("hr-admin"), null, "authenticated", { owner: "SYSTEM", nextAction: null }],
    ["profiles.created", "profile", id("niloo"), null, "active", { owner: "HR_ADMIN", nextAction: "assign_manager" }],
    ["rbac.manager_role_assigned", "profile_role", id("reza"), "candidate", "active", { assignmentType: "computed" }],
    ["process.created", "performance_process", id("process-end"), null, "draft", { eligibleEmployeeCount: 8 }],
    ["process.started", "performance_process", id("process-end"), "draft", "active", { lockedFormVersion: 3 }],
    ["mpa.approved", "mpa", id("mpa-niloo"), "hrbp_review", "approved", { visibleToEmployee: true }],
    ["evaluation.submitted", "end_cycle_evaluation", id("eval-niloo"), "manager_draft", "submitted", { scoreVisible: true, weightedScore: 92 }],
    ["evaluation.returned", "end_cycle_evaluation", id("eval-omid"), "next_level_review", "returned", { reason: "Evidence needed" }],
    ["pip.visibility_changed", "pip_case", id("pip-omid"), "hidden_from_employee", "hidden_from_employee", { employeeVisible: false }],
    ["promotion.submitted", "promotion_case", id("promo-niloo"), "draft", "manager_submitted", { proposedLevel: "L4" }],
    ["notification.created", "notification", id("notif-1"), null, "unread", { priority: "high" }],
    ["reports.analytics_generated", "advanced_analytics_snapshot", id("analytics-1"), null, "ready", { cohortDimension: "business_unit" }],
  ].map(([action, entity_type, entity_id, from_status, to_status, metadata], index) => ({
    id: id(`audit-${index + 1}`),
    immutable_sequence: index + 1,
    actor_user_id: id("hr-admin"),
    target_user_id: metadata?.employee_id || null,
    action,
    entity_type,
    entity_id,
    from_status,
    to_status,
    reason: metadata?.reason || null,
    metadata,
    prev_event_hash: index ? `demo-prev-${index}` : null,
    event_hash: `demo-hash-${String(index + 1).padStart(3, "0")}`,
    integrity_version: 1,
    created_at: iso(-12 + index),
  }));

  function matchFilter(row, key, rawValue) {
    if (key === "select" || key === "order" || key === "limit" || key === "on_conflict") return true;
    const value = rawValue || "";
    if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
    if (value.startsWith("neq.")) return String(row[key]) !== value.slice(4);
    if (value.startsWith("in.")) {
      const list = value.slice(3).replace(/^\(|\)$/g, "").split(",");
      return list.includes(String(row[key]));
    }
    if (value.startsWith("ilike.")) return String(row[key] || "").toLowerCase().includes(value.slice(6).replaceAll("%", "").toLowerCase());
    return true;
  }

  function queryRows(table, searchParams) {
    let rows = [...(db[table] || [])];
    searchParams.forEach((value, key) => {
      rows = rows.filter((row) => matchFilter(row, key, value));
    });
    const order = searchParams.get("order");
    if (order) {
      const [field, direction] = order.split(".");
      rows.sort((a, b) => String(a[field] || "").localeCompare(String(b[field] || "")));
      if (direction === "desc") rows.reverse();
    }
    const limit = Number(searchParams.get("limit"));
    if (Number.isFinite(limit) && limit > 0) rows = rows.slice(0, limit);
    return rows;
  }

  function jsonResponse(data, status = 200) {
    return Promise.resolve(new Response(data == null ? "" : JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }));
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function demoFetch(input, options = {}) {
    const url = new URL(typeof input === "string" ? input : input.url, window.location.origin);
    if (!url.hostname.includes(SUPABASE_HOST)) return nativeFetch(input, options);

    if (url.pathname === "/auth/v1/user") {
      const account = currentDemoAccount();
      const profile = profiles.find((item) => item.id === account.userId) || profiles[0];
      return jsonResponse({
        id: profile.id,
        email: profile.email,
        user_metadata: { display_name: profile.display_name, role_code: profile.role_code },
      });
    }
    if (url.pathname.startsWith("/auth/v1/token")) {
      let credentials = {};
      try { credentials = options.body ? JSON.parse(options.body) : {}; } catch { credentials = {}; }
      const account = demoAccounts.find((item) => item.email.toLowerCase() === String(credentials.email || "").toLowerCase());
      if (!account || credentials.password !== account.password) {
        return jsonResponse({ message: "Demo login failed. Use one of the visible demo passwords." }, 401);
      }
      localStorage.setItem("bb_demo_user_id", account.userId);
      localStorage.setItem("bb_demo_role", account.roleSelect);
      const profile = profiles.find((item) => item.id === account.userId) || profiles[0];
      const user = {
        id: profile.id,
        email: profile.email,
        user_metadata: { display_name: profile.display_name, role_code: profile.role_code },
      };
      return jsonResponse({ access_token: `demo-token-${account.roleSelect}`, token_type: "bearer", expires_in: 3600, user });
    }

    const tableMatch = url.pathname.match(/\/rest\/v1\/([^/?]+)/);
    if (!tableMatch) return jsonResponse({});
    const table = tableMatch[1];
    if (!db[table]) db[table] = [];

    const method = (options.method || "GET").toUpperCase();
    if (method === "GET") {
      if (table === "profiles" && url.searchParams.get("limit") === "1" && !url.searchParams.has("id") && !url.searchParams.has("email") && !url.searchParams.has("account_status")) {
        const account = currentDemoAccount();
        return jsonResponse(profiles.filter((profile) => profile.id === account.userId));
      }
      return jsonResponse(queryRows(table, url.searchParams));
    }

    let body = null;
    try { body = options.body ? JSON.parse(options.body) : null; } catch { body = null; }

    if (method === "POST") {
      const items = Array.isArray(body) ? body : [body || {}];
      const created = items.map((item) => ({
        id: item.id || (crypto.randomUUID ? crypto.randomUUID() : id(`new-${Date.now()}`)),
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
        ...item,
      }));
      db[table].push(...created);
      const prefer = options.headers?.Prefer || options.headers?.prefer || "";
      return jsonResponse(prefer.includes("return=representation") ? created : null, 201);
    }

    if (method === "PATCH") {
      const current = queryRows(table, url.searchParams);
      current.forEach((row) => Object.assign(row, body || {}, { updated_at: body?.updated_at || new Date().toISOString() }));
      return jsonResponse(null);
    }

    return jsonResponse(null);
  };

  window.BimeBazarDemoData = db;
  window.BimeBazarDemoAccounts = demoAccounts.map((account) => {
    const profile = profiles.find((item) => item.id === account.userId);
    return { ...account, name: profile?.display_name || account.email, title: profile?.position_title || "" };
  });
})();
