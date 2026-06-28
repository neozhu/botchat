# Chat Skills

Add global chat skills in this directory.

Preferred layout:

```text
skills/
  sap-abap/
    SKILL.md
    references/
    templates/
```

The legacy single-file layout `skills/name.md` is also supported.

To enable a skill for an expert, add a line to that expert's system prompt:

```text
skills: skill-file-name
```

Multiple skills can be comma-separated:

```text
skills: copywriter, sql-review
```

For folder skills, the skill name is the folder name. For single-file skills,
the skill name is the Markdown filename without `.md`.
