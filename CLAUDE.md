# CLAUDE.md

## Rules

### Environment files

Never touch, edit, overwrite, rename, delete, or generate any environment file without explicit confirmation first.

This includes, but is not limited to:

- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `.env.test`
- any file containing secrets, API keys, tokens, credentials, or private configuration

Before making any change to an environment file, ask for permission and clearly state:

1. Which file would be changed
2. What exact change is needed
3. Why the change is necessary

Do not infer permission from nearby requests. Permission must be explicit.

## Safety rules

### Do not expose secrets

Never print, log, commit, summarize, or paste secrets, tokens, API keys, cookies, private keys, or credentials.

If a secret is found, mention only the file path and the variable name. Do not reveal the value.

### Ask before destructive actions

Ask for confirmation before running or applying anything destructive, including:

- deleting files or folders
- dropping databases
- resetting migrations
- force-pushing
- rewriting Git history
- removing dependencies
- large automated refactors
- changing production configuration

### Prefer minimal changes

Make the smallest change that solves the issue.

Do not rewrite unrelated code, reformat entire files, rename symbols, or reorganize folders unless explicitly asked.

### Preserve existing behavior

Do not change public APIs, data models, routes, schemas, prompts, or user-facing behavior unless the task requires it.

Call out any behavior change before applying it.

### Check before adding dependencies

Do not add new packages, frameworks, services, or build tools without explaining why the existing stack is insufficient.

Prefer built-in functionality and existing project dependencies.

### Keep generated code consistent

Match the project’s existing style, naming, formatting, file structure, and patterns.

Look for nearby examples before creating new abstractions.

### Validate changes

After making code changes, run the most relevant available checks when practical:

- typecheck
- lint
- tests
- build

If checks cannot be run, explain why and mention what should be run manually.

### Do not modify lockfiles casually

Only update lockfiles when dependencies actually change or when explicitly requested.

### No unrelated cleanup

Do not fix unrelated warnings, TODOs, formatting issues, or lint errors unless asked.

### Be explicit about uncertainty

If something is ambiguous, ask before changing code.

If making an assumption, state it clearly.
