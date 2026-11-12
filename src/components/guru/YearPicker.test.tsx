import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  currentAcademicYear,
  normalizeAcademicYear,
} from "@/lib/academic-year";

import { YearPicker } from "./YearPicker";

afterEach(cleanup);

function Harness({
  initial = currentAcademicYear(),
  onChange,
}: {
  initial?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div>
      <YearPicker
        id="tahun"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
      <p data-testid="nilai">{value}</p>
    </div>
  );
}

describe("YearPicker", () => {
  it("menampilkan nilai awal dan hanya menawarkan tahun ajaran baku", () => {
    render(<Harness initial="2026/2027" />);

    expect(screen.getByRole("combobox")).toHaveTextContent("2026/2027");

    fireEvent.click(screen.getByRole("combobox"));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");

    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(
        normalizeAcademicYear(option.textContent?.slice(0, 9)),
      ).not.toBeNull();
    }
  });

  it("memilih tahun lain lewat daftar", () => {
    const onChange = vi.fn();
    render(<Harness initial="2026/2027" onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    const target = within(listbox)
      .getAllByRole("option")
      .find((option) => option.textContent?.startsWith("2027/2028"));
    expect(target).toBeDefined();
    if (target === undefined) return;

    fireEvent.click(target);

    expect(onChange).toHaveBeenCalledWith("2027/2028");
    expect(screen.getByTestId("nilai")).toHaveTextContent("2027/2028");
  });

  it("mempertahankan nilai lama yang tidak baku agar bisa diperbaiki", () => {
    render(<Harness initial="2026-2027" />);

    expect(screen.getByRole("combobox")).toHaveTextContent("2026-2027");

    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toHaveTextContent("tidak baku");
  });

  it("tidak pernah mengirim nilai yang tidak sah", () => {
    const onChange = vi.fn();
    render(<Harness initial="2026/2027" onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    for (const option of within(screen.getByRole("listbox")).getAllByRole(
      "option",
    )) {
      fireEvent.click(option);
      fireEvent.click(screen.getByRole("combobox"));
    }

    for (const call of onChange.mock.calls) {
      expect(normalizeAcademicYear(call[0])).toBe(call[0]);
    }
  });
});
