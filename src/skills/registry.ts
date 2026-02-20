/**
 * Skills Registry
 * 
 * Install skills from remote sources:
 * - Git repos: git clone <url> ~/.ordo/skills/<name>
 * - URLs: fetch a SKILL.md from any URL
 * - Self-created: agents write their own SKILL.md files
 */

import fs from "fs";
import path from "path";
import type {
  Skill,
  SkillSource,
  OrdoDatabase,
  ExecutionClient,
} from "../types/index.js";
import { parseSkillMd } from "./format.js";

export async function installSkillFromGit(
  repoUrl: string,
  name: string,
  skillsDir: string,
  db: OrdoDatabase,
  client: ExecutionClient,
): Promise<Skill | null> {
  const resolvedDir = resolveHome(skillsDir);
  const targetDir = path.join(resolvedDir, name);

  if (fs.existsSync(targetDir)) {
    throw new Error(`Skill directory already exists: ${targetDir}`);
  }

  const result = await client.exec(`git clone ${repoUrl} ${targetDir}`, 60000);

  if (result.exitCode !== 0) {
    throw new Error(`Git clone failed: ${result.stderr}`);
  }

  const skillMdPath = path.join(targetDir, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    throw new Error("No SKILL.md found in repository");
  }

  const content = fs.readFileSync(skillMdPath, "utf-8");
  const skill = parseSkillMd(content, skillMdPath);

  if (!skill) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    throw new Error("Invalid SKILL.md format");
  }

  return skill;
}

export async function installSkillFromUrl(
  url: string,
  name: string,
  skillsDir: string,
  db: OrdoDatabase,
): Promise<Skill | null> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch skill: ${response.statusText}`);
  }

  const content = await response.text();
  const skill = parseSkillMd(content, url);

  if (!skill) {
    throw new Error("Invalid SKILL.md format");
  }

  const resolvedDir = resolveHome(skillsDir);
  const targetDir = path.join(resolvedDir, name);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(path.join(targetDir, "SKILL.md"), content, "utf-8");

  return skill;
}

export function createSkill(
  name: string,
  description: string,
  instructions: string,
  keywords: string[],
  skillsDir: string,
): Skill {
  const resolvedDir = resolveHome(skillsDir);
  const targetDir = path.join(resolvedDir, name);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const frontmatter = [
    "---",
    `name: ${name}`,
    `description: ${description}`,
    `keywords: ${keywords.join(", ")}`,
    "---",
    "",
  ].join("\n");

  const content = frontmatter + instructions;

  fs.writeFileSync(path.join(targetDir, "SKILL.md"), content, "utf-8");

  return {
    id: name,
    name,
    description,
    instructions,
    keywords,
    source: {
      type: "self-created",
      location: targetDir,
    },
    installedAt: new Date(),
    enabled: true,
  };
}

function resolveHome(p: string): string {
  if (p.startsWith("~")) {
    return path.join(process.env.HOME || "/root", p.slice(1));
  }
  return p;
}
