import { existsSync, mkdirSync, readdirSync, cpSync } from "node:fs";
import { resolve } from "node:path";

const SKILLS_DIR = resolve(import.meta.dir, "../.claude/skills");

function parseArgs() {
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf("--target");
  const includeIndex = args.indexOf("--include");
  const listIndex = args.indexOf("--list");

  if (listIndex !== -1) {
    return { mode: "list" as const };
  }

  if (targetIndex === -1 || targetIndex + 1 >= args.length) {
    console.error("Usage: bun run deploy-skills --target <path> [--include skill1,skill2]");
    console.error("       bun run deploy-skills --list");
    process.exit(1);
  }

  const target = resolve(args[targetIndex + 1]);
  const include = includeIndex !== -1 ? args[includeIndex + 1].split(",").map((s) => s.trim()) : null;

  return { mode: "deploy" as const, target, include };
}

function listAvailableSkills() {
  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function deploySkills(target: string, include: string[] | null) {
  const available = listAvailableSkills();
  const toDeploy = include ?? available;

  if (!existsSync(target)) {
    console.error(`Target directory does not exist: ${target}`);
    process.exit(1);
  }

  const targetSkillsDir = resolve(target, ".claude/skills");
  mkdirSync(targetSkillsDir, { recursive: true });

  let copied = 0;
  let skipped = 0;

  for (const skill of toDeploy) {
    if (!available.includes(skill)) {
      console.warn(`  ⚠  Skill "${skill}" not found, skipping`);
      continue;
    }

    const source = resolve(SKILLS_DIR, skill);
    const dest = resolve(targetSkillsDir, skill);

    if (existsSync(dest)) {
      console.log(`  ~  ${skill} (already exists, skipping)`);
      skipped++;
      continue;
    }

    cpSync(source, dest, { recursive: true });
    console.log(`  ✓  ${skill}`);
    copied++;
  }

  console.log(`\nDeployed ${copied} skill(s) to ${targetSkillsDir} (${skipped} skipped)`);
}

function main() {
  const args = parseArgs();

  if (args.mode === "list") {
    console.log("Available Fabriqueta skills:");
    for (const skill of listAvailableSkills()) {
      console.log(`  - ${skill}`);
    }
    return;
  }

  console.log(`Deploying Fabriqueta skills to ${args.target}:\n`);
  deploySkills(args.target, args.include);
}

main();
