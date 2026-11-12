import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import PortalTemplate from "./template";

afterEach(cleanup);

/**
 * Template halaman portal.
 *
 * `template.tsx` dipilih supaya animasi masuk diputar ulang di setiap navigasi
 * (template mendapat `key` baru, sedangkan layout tidak). Test ini menjaga dua
 * hal yang mudah rusak tanpa sengaja: pembungkusnya tetap ada, dan kelas
 * animasinya tidak hilang saat isi halaman diubah.
 */
describe("PortalTemplate", () => {
  it("membungkus isi halaman dengan animasi masuk", () => {
    render(
      <PortalTemplate>
        <p>Isi halaman</p>
      </PortalTemplate>,
    );

    const isi = screen.getByText("Isi halaman");
    expect(isi.parentElement).toHaveClass("guru-page-enter");
  });
});
