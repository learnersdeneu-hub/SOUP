import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
if (!args.length) { console.error("Pass Prisma arguments, e.g. migrate status"); process.exit(2); }
const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", ...args], { stdio: "inherit", env: process.env, shell: false });
process.exit(result.status ?? 1);
