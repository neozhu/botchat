import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendChatSkillInstructions,
  loadChatSkillsForPrompt,
  parseRequestedChatSkillNames,
} from "./skills.ts";

test("parseRequestedChatSkillNames reads comma-separated skills lines", () => {
  assert.deepEqual(
    parseRequestedChatSkillNames(`You are helpful.\nskills: copywriter, sql-review\nStay concise.`),
    ["copywriter", "sql-review"]
  );
});

test("loadChatSkillsForPrompt loads only named markdown skills", async () => {
  const dir = await mkdtemp(join(tmpdir(), "botchat-skills-"));

  try {
    await writeFile(
      join(dir, "copywriter.md"),
      "# Copywriter\n\nUse direct, concrete language."
    );
    await writeFile(
      join(dir, "sql-review.md"),
      "# SQL Review\n\nCheck indexes and RLS policies."
    );
    await writeFile(join(dir, "unused.md"), "# Unused\n\nDo not load this.");
    await writeFile(join(dir, "README.md"), "# Skills\n\nDocumentation only.");

    const skills = await loadChatSkillsForPrompt(
      "skills: copywriter, missing-skill",
      dir
    );

    assert.deepEqual(
      skills.map((skill) => skill.name),
      ["copywriter"]
    );
    assert.equal(skills[0]?.content, "# Copywriter\n\nUse direct, concrete language.");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadChatSkillsForPrompt loads flattened skill directories", async () => {
  const dir = await mkdtemp(join(tmpdir(), "botchat-skills-"));

  try {
    const skillDir = join(dir, "sap-abap");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "# SAP ABAP\n\nUse ABAP release-aware examples."
    );

    const skills = await loadChatSkillsForPrompt("skills: sap-abap", dir);

    assert.deepEqual(
      skills.map((skill) => skill.name),
      ["sap-abap"]
    );
    assert.equal(skills[0]?.content, "# SAP ABAP\n\nUse ABAP release-aware examples.");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadChatSkillsForPrompt appends a compact resources index", async () => {
  const dir = await mkdtemp(join(tmpdir(), "botchat-skills-"));

  try {
    const skillDir = join(dir, "sap-sqlscript");
    await mkdir(join(skillDir, "references"), { recursive: true });
    await mkdir(join(skillDir, "templates"), { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "# SAP SQLScript");
    await writeFile(join(skillDir, "references", "performance.md"), "# Performance");
    await writeFile(join(skillDir, "templates", "procedure.sql"), "CREATE PROCEDURE...");

    const skills = await loadChatSkillsForPrompt("skills: sap-sqlscript", dir);

    assert.match(skills[0]?.content ?? "", /Available skill resources/);
    assert.match(skills[0]?.content ?? "", /references\/performance\.md/);
    assert.match(skills[0]?.content ?? "", /templates\/procedure\.sql/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("appendChatSkillInstructions adds selected skills to instructions", () => {
  const instructions = appendChatSkillInstructions("Base prompt.", [
    {
      name: "copywriter",
      content: "# Copywriter\n\nUse direct, concrete language.",
    },
  ]);

  assert.match(instructions, /Base prompt\./);
  assert.match(instructions, /Selected chat skills/);
  assert.match(instructions, /<skill name="copywriter">/);
  assert.match(instructions, /Use direct, concrete language\./);
});
