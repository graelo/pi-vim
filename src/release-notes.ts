import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const CHANGELOG_FILE = "CHANGELOG.md";

const REPOSITORY_RELEASES_URL = "https://github.com/graelo/pi-vimmode/releases";

export type CurrentRelease = {
  available: boolean;
  content: string;
  releaseUrl: string;
  version: string;
};

function invalidChangelog(message: string): never {
  throw new Error(`Invalid CHANGELOG.md: ${message}`);
}

function fenceMarker(line: string): string | undefined {
  return line.match(/^\s*(`{3,}|~{3,})/)?.[1];
}

function closesFence(line: string, fence: string): boolean {
  return new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`).test(line);
}

/**
 * Calls `visit` for every line outside fenced code blocks, and `visitFenced` for lines inside
 * them (fence markers excluded); throws on an unclosed fence.
 */
function forEachProseLine(
  lines: readonly string[],
  startIndex: number,
  // Returning `true` stops the walk; any other return value continues it.
  visit: (line: string, index: number) => unknown,
  visitFenced?: (line: string) => void,
): void {
  let fence: string | undefined;
  for (let index = startIndex; index < lines.length; index++) {
    const line = lines[index]!;
    if (fence) {
      if (closesFence(line, fence)) fence = undefined;
      else visitFenced?.(line);
      continue;
    }
    const marker = fenceMarker(line);
    if (marker) {
      fence = marker;
      continue;
    }
    if (visit(line, index) === true) return;
  }
  if (fence) invalidChangelog("contains unclosed fenced code block");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches Keep a Changelog release headings such as `## [1.0.0] - 2026-10-08`. */
function releaseHeadingPattern(version: string): RegExp {
  return new RegExp(`^##\\s+\\[?v?${escapeRegExp(version)}\\]?(?:\\s|$)`);
}

function findRelease(lines: readonly string[], version: string): { start: number; end: number } {
  const heading = releaseHeadingPattern(version);
  let start: number | undefined;
  let end = lines.length;
  forEachProseLine(lines, 0, (line, index) => {
    if (start === undefined) {
      if (heading.test(line)) start = index;
      return;
    }
    if (/^##?(?!#)\s+/.test(line)) {
      end = index;
      return true;
    }
  });
  if (start === undefined) invalidChangelog(`missing release heading for ${version}`);
  return { start, end };
}

function validateReleaseContent(lines: readonly string[]): void {
  let hasSection = false;
  let hasContent = false;
  forEachProseLine(
    lines,
    0,
    (line) => {
      hasSection ||= /^###(?!#)\s+\S/.test(line);
      hasContent ||= Boolean(line.trim()) && !/^#{1,6}\s+/.test(line);
    },
    (line) => {
      hasContent ||= Boolean(line.trim());
    },
  );
  if (!hasSection) invalidChangelog("release must contain at least one third-level section");
  if (!hasContent) invalidChangelog("release must contain non-empty content");
}

/** Promotes release sub-headings by one level so `### Added` renders as a popup section. */
function promoteHeadings(lines: readonly string[]): string[] {
  const promoted = [...lines];
  forEachProseLine(lines, 0, (line, index) => {
    if (/^#{3,6}\s+/.test(line)) promoted[index] = line.slice(1);
  });
  return promoted;
}

export function parseCurrentRelease(changelogSource: string, version: string): string {
  if (!changelogSource.trim()) invalidChangelog("is empty");
  const lines = changelogSource.replace(/\r\n?/g, "\n").split("\n");
  const { start, end } = findRelease(lines, version);
  const releaseLines = lines.slice(start + 1, end);
  validateReleaseContent(releaseLines);
  return promoteHeadings(releaseLines).join("\n").trim();
}

function releaseUrl(version: string): string {
  return `${REPOSITORY_RELEASES_URL}/tag/v${version}`;
}

function unavailable(version?: string): CurrentRelease {
  const url = version ? releaseUrl(version) : REPOSITORY_RELEASES_URL;
  return {
    available: false,
    content: version
      ? `Changelog unavailable for v${version}\n${url}`
      : `Changelog unavailable\n${url}`,
    releaseUrl: url,
    version: version ?? "unknown",
  };
}

function packageVersion(packageDirectory: string): string | undefined {
  try {
    const manifest = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8")) as {
      version?: unknown;
    };
    return typeof manifest.version === "string" ? manifest.version : undefined;
  } catch {
    return undefined;
  }
}

function defaultPackageDirectory(): string {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  return packageVersion(moduleDirectory) ? moduleDirectory : dirname(moduleDirectory);
}

export function loadCurrentRelease(packageDirectory = defaultPackageDirectory()): CurrentRelease {
  const version = packageVersion(packageDirectory);
  if (!version) return unavailable();

  try {
    const source = readFileSync(join(packageDirectory, CHANGELOG_FILE), "utf8");
    const content = parseCurrentRelease(source, version);
    return { available: true, content, releaseUrl: releaseUrl(version), version };
  } catch {
    return unavailable(version);
  }
}
