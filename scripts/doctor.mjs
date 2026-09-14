import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = ["package.json", "prisma/schema.prisma", "src/app", "src/lib"];
const missing = required.filter((p) => !fs.existsSync(path.join(root, p)));
if (missing.length) { console.error(`SOUP doctor FAILED: wrong/incomplete project folder. Missing: ${missing.join(", ")}`); process.exit(1); }
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.name !== "soup-app") { console.error("SOUP doctor FAILED: package.json is not the SOUP app."); process.exit(1); }
if (!fs.existsSync(path.join(root, "node_modules"))) { console.error("SOUP doctor FAILED: dependencies are not installed. Run npm.cmd install first."); process.exit(1); }
console.log("SOUP doctor PASSED: correct project root and dependencies are present.");
