import { describe, it, expect } from "vitest";
import { formatRupees, formatTrialDate, formatTrialDateShort } from "./format";

describe("formatRupees", () => {
  it("rounds to whole rupees with en-IN grouping by default", () => {
    expect(formatRupees(150000)).toBe("₹1,500");
    expect(formatRupees(15000)).toBe("₹150");
    expect(formatRupees(12300)).toBe("₹123");
    expect(formatRupees(0)).toBe("₹0");
  });

  it("groups lakhs in the Indian system", () => {
    expect(formatRupees(10000000)).toBe("₹1,00,000");
  });

  it("keeps two decimals when withDecimals is set", () => {
    expect(formatRupees(150050, { withDecimals: true })).toBe("₹1,500.50");
    expect(formatRupees(15000, { withDecimals: true })).toBe("₹150.00");
  });

  it("renders negative amounts with a leading minus sign", () => {
    expect(formatRupees(-5000)).toBe("−₹50");
  });
});

describe("formatTrialDate / formatTrialDateShort", () => {
  // Local-time noon avoids any TZ date-rollover ambiguity.
  const iso = "2026-04-19T12:00:00";

  it("formats the long trial date", () => {
    expect(formatTrialDate(iso)).toBe("Sunday, 19 April 2026");
  });

  it("formats the short trial date", () => {
    expect(formatTrialDateShort(iso)).toBe("Sun, 19 Apr");
  });
});
