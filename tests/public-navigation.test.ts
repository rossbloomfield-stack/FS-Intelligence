import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public navigation", () => {
  const shell = readFileSync(join(process.cwd(), "src/components/intelligence/shell.tsx"), "utf8");
  it("does not advertise Admin in the primary navigation", () => {
    const primary = shell.slice(shell.indexOf("const nav"), shell.indexOf("export function"));
    expect(primary).not.toContain("Admin");
  });
  it("provides a responsive executive menu", () => expect(shell).toContain("Explore intelligence"));
});
