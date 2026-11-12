import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SelectMenu, type SelectOption } from "./SelectMenu";

afterEach(cleanup);

const OPSI: SelectOption[] = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
  { value: "jv", label: "Basa Jawa", disabled: true },
];

/** Pembungkus kecil supaya nilai terlihat berubah seperti pemakaian nyata. */
function Harness({
  options = OPSI,
  initial = "id",
  onChange,
}: {
  options?: SelectOption[];
  initial?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div>
      <SelectMenu
        id="bahasa"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        options={options}
        placeholder="Pilih bahasa"
      />
      <p data-testid="nilai">{value}</p>
    </div>
  );
}

describe("SelectMenu", () => {
  it("tertutup awalnya dan menampilkan pilihan aktif", () => {
    render(<Harness />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("Bahasa Indonesia");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("membuka daftar dan memilih opsi dengan klik", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.click(within(listbox).getByRole("option", { name: "English" }));

    expect(onChange).toHaveBeenCalledWith("en");
    expect(screen.getByTestId("nilai")).toHaveTextContent("en");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("menandai opsi terpilih dengan aria-selected", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("combobox"));

    expect(
      screen.getByRole("option", { name: "Bahasa Indonesia" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "English" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("tidak memilih opsi yang disabled", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    const disabled = screen.getByRole("option", { name: "Basa Jawa" });
    expect(disabled).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(disabled);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("bisa dipakai dengan keyboard tanpa mouse", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const trigger = screen.getByRole("combobox");
    trigger.focus();

    // Enter membuka; ArrowDown pindah sorotan; Enter memilih.
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("en");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("Home/End melompati opsi disabled", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "End" });
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("Escape menutup tanpa mengubah nilai", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByTestId("nilai")).toHaveTextContent("id");
  });

  it("Escape tidak merambat ke pendengar dialog induk", () => {
    const onParentEscape = vi.fn();
    const onChange = vi.fn();

    function DialogHarness() {
      const [value, setValue] = useState("id");

      return (
        <div
          role="dialog"
          onKeyDown={(event) => {
            if (event.key === "Escape") onParentEscape();
          }}
        >
          <SelectMenu
            id="bahasa-dialog"
            value={value}
            onChange={(next) => {
              setValue(next);
              onChange(next);
            }}
            options={OPSI}
          />
        </div>
      );
    }

    render(<DialogHarness />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    // Daftar tertutup, tetapi dialog induk (modal) tetap terbuka.
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onParentEscape).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("menutup saat klik di luar", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("menampilkan placeholder bila nilai tidak cocok", () => {
    render(<Harness initial="" />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Pilih bahasa");
  });

  it("hanya mengirim nilai dari daftar opsi", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "End" });
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Enter" });

    for (const call of onChange.mock.calls) {
      expect(OPSI.map((option) => option.value)).toContain(call[0]);
    }
  });
});
