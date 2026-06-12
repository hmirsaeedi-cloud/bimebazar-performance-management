(function () {
  const page = window.location.pathname.split("/").pop();
  const flows = {
    "temp-mpa.html": {
      title: "MPA approval journey",
      stages: [
        ["Manager", "Draft MPA", "draft"],
        ["Function Lead", "Optional review", "fl_review"],
        ["Manager", "Finalize and send", "finalized"],
        ["Employee", "Approve or request edit", "pending_approval"],
        ["System", "Approved and attached", "approved"],
      ],
      guardrails: ["Only one active MPA per employee and cycle", "Employee edit comments stay in the revision thread", "HRBP notified after 3 revision loops"],
    },
    "temp-end-cycle-evaluation.html": {
      title: "End-cycle approval chain",
      stages: [
        ["System", "Form generated", "generated"],
        ["Manager", "Complete and submit", "in_progress"],
        ["Next Level", "Approve or return", "manager_submitted"],
        ["Head / BU Lead", "Calibration review", "nl_approved"],
        ["HRBP", "Final compliance close", "head_approved"],
        ["Employee", "View locked result", "completed"],
      ],
      guardrails: ["Score hidden from manager before submit", "Required 0 must be intentionally selected", "Profile and form versions stay snapshotted"],
    },
    "temp-feedback.html": {
      title: "360° feedback request journey",
      stages: [
        ["Requester", "Configure request", "draft"],
        ["Recipients", "Collect responses", "open"],
        ["System", "Check minimum threshold", "partially_completed"],
        ["Requester", "View aggregated results", "completed"],
        ["System", "Attach when cycle-linked", "attached"],
      ],
      guardrails: ["Anonymous results require at least 3 responses", "Requester cannot be a recipient", "Deactivated recipients are excluded or voided"],
    },
    "temp-pip.html": {
      title: "Performance improvement plan journey",
      stages: [
        ["Manager", "Draft plan", "draft"],
        ["HRBP", "Review and revise", "submitted"],
        ["HRBP", "Activate visibility", "hrbp_approved"],
        ["Manager + Employee", "Check-in PD Chats", "active"],
        ["HRBP", "Close or extend", "completed"],
      ],
      guardrails: ["Hidden from employee until HRBP activation", "Only one active PIP per employee", "All state changes retained for compliance"],
    },
    "temp-promotion.html": {
      title: "Promotion recommendation journey",
      stages: [
        ["Manager", "Submit recommendation", "draft"],
        ["HRBP", "Approve, hold, or decline", "submitted"],
        ["HR Admin", "Confirm and update profile", "hrbp_approved"],
        ["System", "Notify employee and manager", "approved"],
      ],
      guardrails: ["Active PIP triggers a confirmation warning", "Decline requires a reason", "Employee is not notified when declined"],
    },
    "temp-process-engine.html": {
      title: "HR process creation and routing",
      stages: [
        ["HR Admin", "Configure process", "draft"],
        ["System", "Validate scope and form", "configured"],
        ["System", "Generate form instances", "active"],
        ["Participants", "Complete routed work", "in_progress"],
        ["HR Admin", "Monitor and override", "monitoring"],
        ["System", "Complete and archive", "completed"],
      ],
      guardrails: ["Cannot start with zero eligible employees", "In-flight forms retain their selected version", "Admin movement requires a reason and notifications"],
    },
    "temp-pd-chat.html": {
      title: "Performance dialogue journey",
      stages: [
        ["Manager or Employee", "Initiate dialogue", "draft"],
        ["Other party", "Add perspective", "submitted"],
        ["System", "Mark both documented", "both_documented"],
        ["System", "Attach to evaluation", "attached"],
      ],
      guardrails: ["Each party edits only their own notes", "Authorship includes role and timestamp", "One-sided chats attach as partially documented"],
    },
  };

  const flow = flows[page];
  const main = document.querySelector("main");
  const header = main?.querySelector(":scope > header");
  if (!flow || !main || !header) return;

  const guide = document.createElement("section");
  guide.className = "workflow-guide";
  guide.style.setProperty("--stage-count", flow.stages.length);
  guide.innerHTML = `
    <div class="workflow-guide__header">
      <div>
        <p class="workflow-guide__label">Document-aligned workflow</p>
        <h2>${flow.title}</h2>
      </div>
      <div class="workflow-guide__summary" aria-label="Current workflow state">
        <div class="workflow-guide__fact"><span>Status</span><strong data-workflow-status>Start</strong></div>
        <div class="workflow-guide__fact"><span>Owner</span><strong data-workflow-owner>${flow.stages[0][0]}</strong></div>
        <div class="workflow-guide__fact"><span>Next action</span><strong data-workflow-next>${flow.stages[0][1]}</strong></div>
      </div>
    </div>
    <ol class="workflow-guide__stages">
      ${flow.stages.map(([actor, label], index) => `
        <li class="workflow-guide__stage${index === 0 ? " is-current" : ""}" data-stage-index="${index}">
          <span class="workflow-guide__actor">${actor}</span>
          <strong>${label}</strong>
          <small>${index === flow.stages.length - 1 ? "Final state" : "Then continue"}</small>
        </li>`).join("")}
    </ol>
    <div class="workflow-guide__footer">
      <div class="workflow-guide__guardrails">
        ${flow.guardrails.map((item) => `<span class="workflow-guide__guardrail">${item}</span>`).join("")}
      </div>
      <span class="workflow-guide__source">Source: BimeBazar Flowcharts v1.0</span>
    </div>`;
  header.insertAdjacentElement("afterend", guide);

  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  const aliases = {
    returned: "draft",
    pending: "draft",
    submitted: "submitted",
    visibility_active: "active",
    manager_submitted: "manager_submitted",
    nl_review: "manager_submitted",
    head_review: "nl_approved",
    hrbp_review: "head_approved",
    closed: "completed",
    archived: "completed",
  };

  function updateFromRows() {
    const statusNode = document.querySelector("tbody .pill, tbody [data-status]");
    if (!statusNode) return;
    const raw = normalize(statusNode.dataset.status || statusNode.textContent);
    const status = aliases[raw] || raw;
    let index = flow.stages.findIndex((stage) => stage[2] === status);
    if (index < 0) index = 0;
    guide.querySelectorAll(".workflow-guide__stage").forEach((stage, stageIndex) => {
      stage.classList.toggle("is-current", stageIndex === index);
      stage.classList.toggle("is-complete", stageIndex < index);
    });
    guide.querySelector("[data-workflow-status]").textContent = raw.replaceAll("_", " ");
    guide.querySelector("[data-workflow-owner]").textContent = flow.stages[index][0];
    guide.querySelector("[data-workflow-next]").textContent = flow.stages[Math.min(index + 1, flow.stages.length - 1)][1];
  }

  updateFromRows();
  const rows = document.querySelector("tbody");
  if (rows) new MutationObserver(updateFromRows).observe(rows, { childList: true, subtree: true });
})();
