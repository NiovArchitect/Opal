import type { SignalFamily } from "./types";

export function signalFamily(sourceType: string): SignalFamily {
  switch (sourceType) {
    case "possible_plan":
    case "discovery_option":
      return "possibility";
    case "needs_answer":
    case "plan_response":
    case "invitation":
    case "guardian_approval":
    case "due_reminder":
      return "needs_action";
    case "plan_changed":
    case "late_update":
    case "venue_change":
      return "change";
    case "completion_ack":
    case "reservation_handled":
      return "completion";
    case "open_loop":
    case "ambiguity":
      return "clarification";
    case "block":
    case "safety_report":
      return "safety";
    case "tradition":
    case "continuity":
      return "continuity";
    default:
      return "quiet_information";
  }
}

export function familyLabel(family: SignalFamily): string {
  switch (family) {
    case "possibility":
      return "Possible plan";
    case "needs_action":
      return "Needs you";
    case "change":
      return "Changed";
    case "completion":
      return "Done";
    case "clarification":
      // Human gap language — not internal stage inventory.
      return "Still taking shape";
    case "safety":
      return "Safety";
    case "continuity":
      return "Coming around again";
    default:
      return "Update";
  }
}

export const PROHIBITED_SHELL_COPY = [
  /streak/i,
  /relationship score/i,
  /social score/i,
  /you are behind/i,
  /losing this relationship/i,
  /people you may know/i,
  /3 notifications/i,
];

export function isProhibitedShellCopy(text: string): boolean {
  return PROHIBITED_SHELL_COPY.some((p) => p.test(text));
}
