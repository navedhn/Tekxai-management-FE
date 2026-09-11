// Quick Add / Quick Edit User — Shift field. Same canonical shift source
// (GET /attendance/shifts) and assignment action (POST
// /attendance/shifts/assign) the Attendance page's Assign Shift panel
// already uses — no second shift model. Tests target the two pure,
// exported decision functions directly rather than mounting the full
// modal (which pulls in ~6 React Query hooks: designations, roles,
// departments, business units, shifts, my-permissions, plus
// department-scoped teams) — this proves the exact required behavior
// (preselection, what mutation fires, clear handling) without an
// elaborate multi-hook test harness.
import { describe, expect, it } from "vitest";
import { resolveShiftUpdateAction, toFormState, type QuickEditUser } from "./QuickCreateUserModal";

const BASE_USER: QuickEditUser = {
	id: "u1",
	first_name: "Jane",
	last_name: "Doe",
	email: "jane@example.com",
};

describe("toFormState — Quick Edit preselects the employee's real current shift", () => {
	it("preselects assigned_shift.id when shift_source is ASSIGNED (a real per-employee assignment)", () => {
		const u: QuickEditUser = { ...BASE_USER, shift_source: "ASSIGNED", assigned_shift: { id: "shift-1", name: "Morning" } };
		expect(toFormState(u).shift_id).toBe("shift-1");
	});

	it("does NOT preselect the org fallback default — an employee with no personal assignment starts with an empty Shift field", () => {
		const u: QuickEditUser = { ...BASE_USER, shift_source: "FALLBACK_DEFAULT", assigned_shift: null };
		expect(toFormState(u).shift_id).toBe("");
	});

	it("leaves the field empty when shift_source is NONE", () => {
		const u: QuickEditUser = { ...BASE_USER, shift_source: "NONE" };
		expect(toFormState(u).shift_id).toBe("");
	});

	it("leaves the field empty when shift_source is missing entirely (defensive)", () => {
		expect(toFormState(BASE_USER).shift_id).toBe("");
	});
});

describe("resolveShiftUpdateAction — what Quick Edit's save should do about the shift", () => {
	it("returns NONE when the caller lacks erp.attendance.edit — the field wasn't even shown, nothing to save", () => {
		const u: QuickEditUser = { ...BASE_USER, shift_source: "NONE" };
		expect(resolveShiftUpdateAction(u, "shift-2", false)).toBe("NONE");
	});

	it("returns ASSIGN when a new, different shift is selected", () => {
		const u: QuickEditUser = { ...BASE_USER, shift_source: "ASSIGNED", assigned_shift: { id: "shift-1", name: "Morning" } };
		expect(resolveShiftUpdateAction(u, "shift-2", true)).toBe("ASSIGN");
	});

	it("returns ASSIGN when the employee had no real assignment and one is now selected", () => {
		const u: QuickEditUser = { ...BASE_USER, shift_source: "FALLBACK_DEFAULT", assigned_shift: null };
		expect(resolveShiftUpdateAction(u, "shift-2", true)).toBe("ASSIGN");
	});

	it("returns NONE when the selected shift is unchanged from the real current assignment", () => {
		const u: QuickEditUser = { ...BASE_USER, shift_source: "ASSIGNED", assigned_shift: { id: "shift-1", name: "Morning" } };
		expect(resolveShiftUpdateAction(u, "shift-1", true)).toBe("NONE");
	});

	it("returns CLEAR_UNSUPPORTED when a real assignment is cleared — the backend has no unassign action, so this must be surfaced, not silently dropped", () => {
		const u: QuickEditUser = { ...BASE_USER, shift_source: "ASSIGNED", assigned_shift: { id: "shift-1", name: "Morning" } };
		expect(resolveShiftUpdateAction(u, "", true)).toBe("CLEAR_UNSUPPORTED");
	});

	it("returns NONE when the field is left empty and there was never a real assignment (fallback-default employee, field untouched)", () => {
		const u: QuickEditUser = { ...BASE_USER, shift_source: "FALLBACK_DEFAULT", assigned_shift: null };
		expect(resolveShiftUpdateAction(u, "", true)).toBe("NONE");
	});

	it("returns NONE for a brand-new employee (no editUser) — Quick Add's 'no shift selected' case", () => {
		expect(resolveShiftUpdateAction(null, "", true)).toBe("NONE");
	});
});
