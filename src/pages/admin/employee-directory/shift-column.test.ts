// Employee Directory — Shift column (replaced Join Date). The employee
// list API (GET /api/v1/employee) already resolves each employee's real,
// currently-effective shift server-side (resolve_effective_shifts, the
// same resolver attendance uses) and returns it as shift_source +
// assigned_shift/fallback_shift — these tests prove the table renders
// exactly that real data, with no role/department/designation-based
// fallback fabricated on the frontend.
import { describe, expect, it } from "vitest";
import { formatShiftTime, renderEmployeeShift } from "./index";

describe("formatShiftTime", () => {
	it("converts a 24h HH:MM string to 12h with AM/PM", () => {
		expect(formatShiftTime("09:00")).toBe("9:00 AM");
		expect(formatShiftTime("18:00")).toBe("6:00 PM");
		expect(formatShiftTime("00:00")).toBe("12:00 AM");
		expect(formatShiftTime("12:00")).toBe("12:00 PM");
		expect(formatShiftTime("23:45")).toBe("11:45 PM");
	});

	it("returns null for a missing value", () => {
		expect(formatShiftTime(null)).toBeNull();
		expect(formatShiftTime(undefined)).toBeNull();
	});
});

describe("renderEmployeeShift", () => {
	it("renders the real assigned_shift (a genuine per-employee assignment) with its name and time range", () => {
		const emp = {
			shift_source: "ASSIGNED",
			assigned_shift: { id: "s1", name: "Morning", start_time: "09:00", end_time: "18:00", work_days: "1,2,3,4,5", is_default: false },
		};
		expect(renderEmployeeShift(emp)).toBe("Morning · 9:00 AM–6:00 PM");
	});

	it("renders the real fallback_shift (org default) when no personal assignment exists — still real server data, not fabricated", () => {
		const emp = {
			shift_source: "FALLBACK_DEFAULT",
			fallback_shift: { id: "s2", name: "General", start_time: "09:00", end_time: "17:00", work_days: "1,2,3,4,5", is_default: true },
		};
		expect(renderEmployeeShift(emp)).toBe("General · 9:00 AM–5:00 PM");
	});

	it("shows the empty state '—' when the employee has no assigned shift and no org default is configured (shift_source NONE) — never a fabricated value", () => {
		const emp = { shift_source: "NONE", assigned_shift: null, fallback_shift: null };
		expect(renderEmployeeShift(emp)).toBe("—");
	});

	it("shows '—' when shift_source is missing entirely (defensive — an unexpected API shape must not crash or fabricate a value)", () => {
		expect(renderEmployeeShift({})).toBe("—");
	});

	it("never derives a shift from role, department, or designation — a rich employee object with no shift fields still shows the empty state", () => {
		const emp = {
			shift_source: "NONE",
			role: "SENIOR_DEVELOPER",
			designation: "Engineering Manager",
			department: { name: "Artificial Intelligence" },
		};
		expect(renderEmployeeShift(emp)).toBe("—");
	});

	it("renders the shift name alone when start/end times are missing (still real data, just incomplete)", () => {
		const emp = { shift_source: "ASSIGNED", assigned_shift: { id: "s3", name: "Night", start_time: null, end_time: null } };
		expect(renderEmployeeShift(emp)).toBe("Night");
	});
});
