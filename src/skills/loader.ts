/**
 * Skills Loader
 * 
 * Discovers and loads SKILL.md files from ~/.ordo/skills/
 * Each skill is a directory containing a SKILL.md file with
 * YAML frontmatter + Markdown instructions.
 */

import fs from "fs";
import path from "path";
import type { Skill, OrdoDatabase } from "../types/index.js";
import { parseSkillMd } from "./format.js";

export function loadSkills(
  skillsDir: string,
  db: OrdoDatabase,
): Skill[] {
  const resolvedDir = resolveHome(skillsDir);

  if (!fs.existsSync(resolvedDir)) {
    return [];
  }

  const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
  const loaded: Skill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillMdPath = path.join(resolvedDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;

    try {
      const content = fs.readFileSync(skillMdPath, "utf-8");
      const skill = parseSkillMd(content, skillMdPath);
      if (!skill) continue;

      if (!checkRequirements(skill)) {
        continue;
      }

      loaded.push(skill);
    } catch {
      // Skip invalid skill files
    }
  }

  return loaded;
}

function checkRequirements(skill: Skill): boolean {
  if (!(skill as any).requires) return true;

  const requires = (skill as any).requires;

  if (requires.bins) {
    for (const bin of requires.bins) {
      try {
        const { execSync } = require("child_process");
        execSync(`which ${bin}`, { stdio: "ignore" });
      } catch {
        return false;
      }
    }
  }

  if (requires.env) {
    for (const envVar of requires.env) {
      if (!process.env[envVar]) {
        return false;
      }
    }
  }

  return true;
}

export function getActiveSkillInstructions(skills: Skill[]): string {
  const active = skills.filter((s) => s.enabled);
  if (active.length === 0) return "";

  const sections = active.map(
    (s) =>
      `--- SKILL: ${s.name} ---\n${s.description ? `${s.description}\n\n` : ""}${s.instructions}\n--- END SKILL: ${s.name} ---`,
  );

  return sections.join("\n\n");
}

function resolveHome(p: string): string {
  if (p.startsWith("~")) {
    return path.join(process.env.HOME || "/root", p.slice(1));
  }
  return p;
}
