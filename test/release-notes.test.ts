import { describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { changelogPopup } from "../src/keybinding-discovery-popup.ts";
import { loadCurrentRelease, parseCurrentRelease } from "../src/release-notes.ts";

const repositoryReleaseUrl = "https://github.com/graelo/pi-vimmode/releases/tag/v0.9.0";

const changelog = (body: string) => `# Changelog\n\nPreamble.\n\n${body}`;

async function packageDirectory(source?: string) {
  const directory = await mkdtemp(join(tmpdir(), "pi-vimmode-release-notes-"));
  await writeFile(join(directory, "package.json"), JSON.stringify({ version: "0.9.0" }));
  if (source !== undefined) await writeFile(join(directory, "CHANGELOG.md"), source);
  return directory;
}

describe("current release parsing", () => {
  test("extracts every current-release section through next release in source order", () => {
    const content = parseCurrentRelease(
      changelog(
        "## [0.9.0] - 2026-07-23\n\n### Added\n\nFirst.\n\n### Fixed\n\n- Second\n\n## [0.8.0]\n\n### Older\n",
      ),
      "0.9.0",
    );

    expect(content).toBe("## Added\n\nFirst.\n\n## Fixed\n\n- Second");
  });

  test("skips unreleased and newer releases", () => {
    const content = parseCurrentRelease(
      changelog("## [Unreleased]\n\n### Added\n\nSoon.\n\n## [0.9.0]\n\n### Fixed\n\nNow.\n"),
      "0.9.0",
    );

    expect(content).toBe("## Fixed\n\nNow.");
  });

  test("rejects invalid release sources", () => {
    expect(() => parseCurrentRelease("", "0.9.0")).toThrow("is empty");
    expect(() =>
      parseCurrentRelease(changelog("## [0.8.0]\n\n### Added\n\nText"), "0.9.0"),
    ).toThrow("missing release heading");
    expect(() => parseCurrentRelease(changelog("## [0.9.0]\n\nText"), "0.9.0")).toThrow(
      "third-level section",
    );
    expect(() =>
      parseCurrentRelease(changelog("## [0.9.0]\n\n### Added\n\n```ts\ntext"), "0.9.0"),
    ).toThrow("unclosed fenced code block");
    expect(() =>
      parseCurrentRelease(changelog("## [0.9.0]\n\n### Added\n\n```\n```"), "0.9.0"),
    ).toThrow("non-empty content");
  });

  test("keeps fence-prefixed code and fenced headings inside current release", () => {
    expect(
      parseCurrentRelease(
        changelog("## [0.9.0]\n\n### Added\n\n```text\n```not-a-close\n## not a heading\n```"),
        "0.9.0",
      ),
    ).toBe("## Added\n\n```text\n```not-a-close\n## not a heading\n```");
  });

  test("repository changelog parses for the package version", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as { version: string };
    const source = await readFile("CHANGELOG.md", "utf8");

    expect(parseCurrentRelease(source, manifest.version)).not.toBe("");
  });
});

test("builds titled changelog popup without outer release heading", () => {
  const popup = changelogPopup({
    available: true,
    version: "0.9.0",
    content: "## Added\n\nText",
    releaseUrl: repositoryReleaseUrl,
  });

  expect(popup).toMatchObject({
    title: "pi-vimmode v0.9.0 changes",
    source: "changelog",
    markdown: "## Added\n\nText",
  });
  expect(popup.markdown).not.toContain("# v0.9.0");
});

describe("packaged current release", () => {
  test("loads package-relative changelog", async () => {
    const directory = await packageDirectory(changelog("## [0.9.0]\n\n### Added\n\nText\n"));
    try {
      expect(loadCurrentRelease(directory)).toEqual({
        available: true,
        content: "## Added\n\nText",
        releaseUrl: repositoryReleaseUrl,
        version: "0.9.0",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("returns unavailable content for missing, malformed, and stale changelogs", async () => {
    for (const source of [
      undefined,
      "not a changelog",
      changelog("## [0.8.0]\n\n### Old\n\nText\n"),
    ]) {
      const directory = await packageDirectory(source);
      try {
        expect(loadCurrentRelease(directory)).toEqual({
          available: false,
          content: `Changelog unavailable for v0.9.0\n${repositoryReleaseUrl}`,
          releaseUrl: repositoryReleaseUrl,
          version: "0.9.0",
        });
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  });
});
