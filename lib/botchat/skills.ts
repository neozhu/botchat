import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

export type ChatSkill = {
  name: string;
  content: string;
};

export const CHAT_SKILLS_DIR = "skills";
const RESOURCE_DIR_NAMES = ["references", "templates"] as const;

function normalizeSkillName(name: string) {
  return name
    .trim()
    .replace(/\.md$/i, "")
    .replace(/[`'"]/g, "")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

export function parseRequestedChatSkillNames(prompt: string) {
  const names: string[] = [];
  const seen = new Set<string>();
  const skillLinePattern = /^(?:skills|技能)\s*[:：]\s*(.+)$/gim;

  for (const match of prompt.matchAll(skillLinePattern)) {
    const rawNames = match[1] ?? "";
    for (const rawName of rawNames.split(/[,，;；]/)) {
      const name = normalizeSkillName(rawName);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }

  return names;
}

async function readSkillFile(path: string) {
  try {
    return (await readFile(path, "utf8")).trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function readDirectoryEntries(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function findDirectMarkdownSkill(
  requestedName: string,
  skillsDir: string,
  entries: Dirent<string>[]
) {
  const fileName = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .find(
      (entryName) =>
        extname(entryName).toLowerCase() === ".md" &&
        normalizeSkillName(entryName) === requestedName &&
        normalizeSkillName(entryName) !== "readme"
    );

  if (!fileName) return null;

  return {
    name: basename(fileName, extname(fileName)),
    path: join(skillsDir, fileName),
  };
}

async function listSkillResources(skillDir: string) {
  const resourcePaths: string[] = [];

  for (const dirName of RESOURCE_DIR_NAMES) {
    const entries = await readDirectoryEntries(join(skillDir, dirName));
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      resourcePaths.push(`${dirName}/${entry.name}`);
    }
  }

  resourcePaths.sort((a, b) => a.localeCompare(b));
  return resourcePaths;
}

function appendSkillResourceIndex(content: string, resourcePaths: string[]) {
  if (resourcePaths.length === 0) return content;

  return `${content}

## Available skill resources

The following supporting files exist in this skill folder. Use them as a topic index only; their full contents are not automatically included in this chat context.

${resourcePaths.map((path) => `- ${path}`).join("\n")}`;
}

async function findDirectorySkill(requestedName: string, skillsDir: string) {
  const skillDir = join(skillsDir, requestedName);
  const content = await readSkillFile(join(skillDir, "SKILL.md"));

  if (!content) {
    return null;
  }

  return {
    name: requestedName,
    content: appendSkillResourceIndex(
      content,
      await listSkillResources(skillDir)
    ),
  };
}

export async function loadChatSkillsForPrompt(
  prompt: string,
  skillsDir = CHAT_SKILLS_DIR
): Promise<ChatSkill[]> {
  const requestedNames = parseRequestedChatSkillNames(prompt);
  if (requestedNames.length === 0) return [];

  let entries: Dirent<string>[];
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const skills: ChatSkill[] = [];

  for (const requestedName of requestedNames) {
    const directSkill = await findDirectMarkdownSkill(
      requestedName,
      skillsDir,
      entries
    );

    if (directSkill) {
      const content = await readSkillFile(directSkill.path);
      if (content) {
        skills.push({
          name: directSkill.name,
          content,
        });
      }
      continue;
    }

    const directorySkill = await findDirectorySkill(requestedName, skillsDir);
    if (!directorySkill) continue;

    skills.push(directorySkill);
  }

  return skills;
}

export function appendChatSkillInstructions(
  instructions: string,
  skills: ChatSkill[]
) {
  if (skills.length === 0) return instructions;

  const skillBlocks = skills
    .map(
      (skill) => `<skill name="${skill.name}">
${skill.content}
</skill>`
    )
    .join("\n\n");

  return `${instructions}

Selected chat skills:
The active expert requested these skills by name. Use them when they are relevant to the user's request.

${skillBlocks}`;
}
