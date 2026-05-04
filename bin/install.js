#!/usr/bin/env node
// claude-dbc — install Design by Contract skills into a coding agent harness.
//
// Usage:
//   npx github:mwaddip/claude-dbc                                 # interactive
//   npx github:mwaddip/claude-dbc install --harness=claude-code   # all skills
//   npx github:mwaddip/claude-dbc install --harness=codex --skill=design-by-contract-for-ai-agents
//   npx github:mwaddip/claude-dbc install --project --harness=claude-code   # ./.claude/skills/
//   npx github:mwaddip/claude-dbc list

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const HARNESSES = {
  'claude-code': { user: ['.claude', 'skills'], project: ['.claude', 'skills'] },
  'codex':       { user: ['.agents', 'skills'], project: ['.agents', 'skills'] },
};

const SKILLS_ROOT = path.resolve(__dirname, '..', 'skills');

function listSkills() {
  return fs.readdirSync(SKILLS_ROOT).filter(name => {
    const p = path.join(SKILLS_ROOT, name);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'SKILL.md'));
  }).sort();
}

function harnessDir(harness, projectMode) {
  const segments = HARNESSES[harness][projectMode ? 'project' : 'user'];
  const base = projectMode ? process.cwd() : os.homedir();
  return path.join(base, ...segments);
}

function installSkill(skill, destBase) {
  const src = path.join(SKILLS_ROOT, skill, 'SKILL.md');
  const destDir = path.join(destBase, skill);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, 'SKILL.md');
  fs.copyFileSync(src, dest);
  return dest;
}

function parseArgs(argv) {
  const out = { command: null, flags: {} };
  let i = 2;
  if (argv[i] && !argv[i].startsWith('--')) out.command = argv[i++];
  while (i < argv.length) {
    const a = argv[i++];
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=');
    out.flags[k] = v === undefined ? true : v;
  }
  return out;
}

function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); });
  });
}

function help() {
  console.log(`claude-dbc — install Design by Contract skills.

Usage:
  claude-dbc [install] [--harness=<name>] [--skill=<name>] [--project]
  claude-dbc list
  claude-dbc help

Harnesses:
  claude-code   ~/.claude/skills/<skill>/SKILL.md  (or ./.claude/skills/ with --project)
  codex         ~/.agents/skills/<skill>/SKILL.md  (or ./.agents/skills/ with --project)

Skills available: ${listSkills().join(', ')}`);
}

async function main() {
  const { command, flags } = parseArgs(process.argv);

  if (command === 'help' || flags.help) { help(); return; }

  if (command === 'list') {
    listSkills().forEach(s => console.log(s));
    return;
  }

  const cmd = command || 'install';
  if (cmd !== 'install') {
    console.error(`unknown command: ${cmd}\n`);
    help();
    process.exit(1);
  }

  let harness = flags.harness;
  if (!harness) {
    const choices = Object.keys(HARNESSES);
    harness = await ask(`Harness (${choices.join(' / ')}): `);
  }
  if (!HARNESSES[harness]) {
    console.error(`unknown harness: ${harness}. supported: ${Object.keys(HARNESSES).join(', ')}`);
    process.exit(1);
  }

  const all = listSkills();
  const skills = flags.skill ? [flags.skill] : all;
  for (const s of skills) {
    if (!all.includes(s)) {
      console.error(`unknown skill: ${s}. available: ${all.join(', ')}`);
      process.exit(1);
    }
  }

  const destBase = harnessDir(harness, !!flags.project);
  for (const s of skills) {
    const dest = installSkill(s, destBase);
    console.log(`installed ${s} → ${dest}`);
  }
  console.log(`done — restart your harness to pick up new skills`);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
