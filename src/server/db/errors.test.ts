// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  classifyDatabaseError,
  DatabaseConnectionError,
  DatabaseMigrationError,
  DatabaseQueryError,
} from "./errors";

const withCode = (code: string, message = "driver gagal") =>
  Object.assign(new Error(message), { code });

describe("classifyDatabaseError", () => {
  it("memetakan 401/403 dan Unauthorized ke AUTH", () => {
    expect(classifyDatabaseError({ status: 401 })).toBe("AUTH");
    expect(classifyDatabaseError({ status: 403 })).toBe("AUTH");
    expect(classifyDatabaseError(new Error("Unauthorized"))).toBe("AUTH");
    expect(classifyDatabaseError(withCode("SQLITE_AUTH"))).toBe("AUTH");
  });

  it("memetakan kegagalan koneksi ke NETWORK", () => {
    expect(classifyDatabaseError(withCode("ENOTFOUND"))).toBe("NETWORK");
    expect(classifyDatabaseError(withCode("ECONNREFUSED"))).toBe("NETWORK");
    expect(classifyDatabaseError(new Error("fetch failed"))).toBe("NETWORK");
  });

  it("memetakan konfigurasi tidak sah ke CONFIG", () => {
    expect(classifyDatabaseError(withCode("URL_INVALID"))).toBe("CONFIG");
    expect(classifyDatabaseError(new Error("Invalid URL"))).toBe("CONFIG");
  });

  it("memetakan error SQL ke QUERY", () => {
    expect(classifyDatabaseError(withCode("SQLITE_ERROR"))).toBe("QUERY");
    expect(classifyDatabaseError(withCode("TRANSACTION_CLOSED"))).toBe("QUERY");
  });

  it("memakai fallback untuk error yang tidak dikenali", () => {
    expect(classifyDatabaseError(withCode("SESUATU"))).toBe("UNKNOWN");
    expect(classifyDatabaseError(withCode("SESUATU"), "QUERY")).toBe("QUERY");
  });

  it("mempertahankan code dari DatabaseError yang sudah dibungkus", () => {
    const error = new DatabaseQueryError("pesan aman", "AUTH");
    expect(classifyDatabaseError(error)).toBe("AUTH");
  });
});

describe("DatabaseError", () => {
  it("memakai code terbatas sesuai jenis error", () => {
    expect(new DatabaseConnectionError().code).toBe("UNKNOWN");
    expect(new DatabaseQueryError().code).toBe("QUERY");
    expect(new DatabaseMigrationError("0001_probe").code).toBe("MIGRATION");
  });

  it("tidak membawa cause", () => {
    const errors = [
      new DatabaseConnectionError(),
      new DatabaseQueryError(),
      new DatabaseMigrationError("0001_probe"),
    ];

    for (const error of errors) {
      expect((error as { cause?: unknown }).cause).toBeUndefined();
    }
  });
});
