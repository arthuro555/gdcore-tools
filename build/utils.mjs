import { execSync } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

export const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} cmd
 * @param {{cwd:string}} cwd
 */
export const cmd = (cmd, { cwd }) => execSync(cmd, { cwd, stdio: "inherit" });

/**
 * @param {string} cwd
 */
export const npm_i = (cwd) =>
  cmd(`npm ${process.env.GITHUB_ACTIONS ? "ci" : "install"}`, { cwd });
