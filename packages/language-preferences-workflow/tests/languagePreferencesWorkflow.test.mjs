import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getLanguagePreferenceState,
  languagePreferenceActions,
  languagePreferenceStatuses,
  transitionLanguagePreferenceState,
} from "../src/languagePreferencesWorkflow.mjs";

describe("languagePreferencesWorkflow", () => {
  it("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(languagePreferenceStatuses)) {
      const state = getLanguagePreferenceState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok(Object.hasOwn(state, "nextAction"));
    }
  });

  it("allows user update from defaulted state", () => {
    assert.equal(
      transitionLanguagePreferenceState(languagePreferenceStatuses.DEFAULTED, languagePreferenceActions.USER_UPDATE)
        .status,
      languagePreferenceStatuses.USER_CONFIGURED,
    );
  });

  it("allows HR override approval", () => {
    const pending = transitionLanguagePreferenceState(
      languagePreferenceStatuses.USER_CONFIGURED,
      languagePreferenceActions.REQUEST_HR_OVERRIDE,
    );
    assert.equal(
      transitionLanguagePreferenceState(pending.status, languagePreferenceActions.APPROVE_HR_OVERRIDE).status,
      languagePreferenceStatuses.HR_OVERRIDDEN,
    );
  });

  it("rejects approving override without pending state", () => {
    assert.throws(
      () => transitionLanguagePreferenceState(languagePreferenceStatuses.DEFAULTED, languagePreferenceActions.APPROVE_HR_OVERRIDE),
      /Invalid language preference transition/,
    );
  });
});
