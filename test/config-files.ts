import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Temp agent dir plus a git repo, laid out where pi-vim looks for config files. */
export type ConfigDirs = {
  root: string;
  agentDir: string;
  cwd: string;
  globalPath: string;
  projectPath: string;
  jsConfigPath: string;
  cleanup: () => void;
};

export function configDirs(prefix = "pi-vim-config-"): ConfigDirs {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const agentDir = join(root, "agent");
  const cwd = join(root, "repo");
  const globalPath = join(agentDir, "extensions", "pi-vim", "config.json");
  const projectPath = join(cwd, ".pi", "extensions", "pi-vim", "config.json");
  mkdirSync(join(cwd, ".git"), { recursive: true });
  mkdirSync(dirname(globalPath), { recursive: true });
  mkdirSync(dirname(projectPath), { recursive: true });
  return {
    root,
    agentDir,
    cwd,
    globalPath,
    projectPath,
    jsConfigPath: join(agentDir, "extensions", "pi-vim", "config.js"),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
