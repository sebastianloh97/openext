#!/usr/bin/env bun
import {
  existsSync,
  symlinkSync,
  unlinkSync,
  mkdirSync,
  readdirSync,
  lstatSync,
  statSync,
  readFileSync,
  writeFileSync,
  readlinkSync,
} from "node:fs";
import { join, resolve, basename, dirname, extname, relative } from "node:path";

// ─── Constants ───────────────────────────────────────────────────────

const HUB_DIR = resolve(import.meta.dir);
const MANIFEST_NAME = "openext.json";
const OPENCODE_DIR = ".opencode";

const EXTENSION_TYPES = [
  "agents",
  "skills",
  "commands",
  "plugins",
  "scripts",
  "config",
] as const;
type ExtensionType = (typeof EXTENSION_TYPES)[number];

const FILE_LEVEL_TYPES: ExtensionType[] = [
  "agents",
  "commands",
  "plugins",
  "scripts",
];
const DIRECTORY_LEVEL_TYPES: ExtensionType[] = ["skills"];

// ─── Helpers ─────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(msg);
}
function warn(msg: string) {
  console.warn(`warning: ${msg}`);
}
function error(msg: string) {
  console.error(`error: ${msg}`);
}

function resolveProject(projectPath: string | undefined): string {
  return resolve(projectPath ?? process.cwd());
}

function opencodeDir(project: string): string {
  return join(project, OPENCODE_DIR);
}

function manifestPath(project: string): string {
  return join(opencodeDir(project), MANIFEST_NAME);
}

interface Manifest {
  [type: string]: string[];
}

function readManifest(project: string): Manifest | null {
  const mp = manifestPath(project);
  if (!existsSync(mp)) return null;
  return JSON.parse(readFileSync(mp, "utf-8"));
}

function writeManifest(project: string, manifest: Manifest) {
  const mp = manifestPath(project);
  const od = opencodeDir(project);
  if (!existsSync(od)) mkdirSync(od, { recursive: true });
  writeFileSync(mp, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}

function isHubManagedSymlink(linkPath: string): boolean {
  if (!lstatSync(linkPath).isSymbolicLink()) return false;
  const target = resolve(readlinkSync(linkPath));
  return target.startsWith(HUB_DIR + "/");
}

/**
 * For file-level types, resolve the bare name to the actual hub filename
 * by scanning the hub directory.
 */
function resolveHubEntry(
  type: ExtensionType,
  name: string
): { hubPath: string; linkPath: string } | null {
  if (type === "skills") {
    const hubPath = join(HUB_DIR, "skills", name);
    if (!existsSync(hubPath) || !statSync(hubPath).isDirectory()) return null;
    return { hubPath, linkPath: "" }; // linkPath set by caller
  }

  if (type === "config") {
    const hubPath = join(HUB_DIR, "config", name);
    if (!existsSync(hubPath) || !statSync(hubPath).isFile()) return null;
    return { hubPath, linkPath: "" };
  }

  // File-level types: scan hub directory for matching basename
  const hubDir = join(HUB_DIR, type);
  if (!existsSync(hubDir)) return null;

  const matches = readdirSync(hubDir)
    .filter((f) => {
      const full = join(hubDir, f);
      return lstatSync(full).isFile() && basename(f, extname(f)) === name;
    })
    .sort();

  if (matches.length === 0) return null;
  if (matches.length > 1) {
    error(
      `multiple files in hub ${type}/ match name "${name}": ${matches.join(", ")}`
    );
    return null;
  }

  const hubPath = join(hubDir, matches[0]);
  return { hubPath, linkPath: "" };
}

/**
 * Compute the symlink destination path inside the project's .opencode/ dir.
 */
function computeLinkPath(
  project: string,
  type: ExtensionType,
  name: string,
  hubPath: string
): string {
  if (type === "config") {
    // Config files land at .opencode/ root
    return join(opencodeDir(project), name);
  }
  if (type === "skills") {
    // Skills are directory-level symlinks inside .opencode/skills/
    return join(opencodeDir(project), "skills", name);
  }
  // File-level types: use the actual hub filename
  const filename = basename(hubPath);
  return join(opencodeDir(project), type, filename);
}

/**
 * Ensure the parent directory of linkPath exists as a real directory.
 */
function ensureParentDir(linkPath: string) {
  const parent = dirname(linkPath);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }
}

/**
 * Parse type/name from a combined argument like "skills/chrome".
 */
function parseTypeName(input: string): { type: ExtensionType; name: string } {
  const idx = input.indexOf("/");
  if (idx === -1) {
    throw new Error(
      `invalid format "${input}": expected <type>/<name> (e.g., skills/chrome)`
    );
  }
  const type = input.slice(0, idx) as ExtensionType;
  const name = input.slice(idx + 1);
  if (!EXTENSION_TYPES.includes(type)) {
    throw new Error(
      `unknown type "${type}": must be one of ${EXTENSION_TYPES.join(", ")}`
    );
  }
  if (!name) {
    throw new Error(`empty name in "${input}"`);
  }
  return { type, name };
}

/**
 * Create a symlink, handling existing files/symlinks.
 * Returns: "created" | "skipped-exists" | "skipped-real" | "skipped-wrong-target"
 */
function createSymlink(
  hubPath: string,
  linkPath: string,
  dryRun: boolean,
  force: boolean
): "created" | "skipped-exists" | "skipped-real" | "skipped-wrong-target" | "error" {
  // Use lstatSync instead of existsSync to detect broken symlinks
  // (existsSync follows symlinks and returns false for broken ones).
  let ls;
  try {
    ls = lstatSync(linkPath);
  } catch {
    // Path does not exist at all (no file, no symlink)
    ls = null;
  }

  if (ls) {
    if (ls.isSymbolicLink()) {
      const currentTarget = resolve(readlinkSync(linkPath));
      if (currentTarget === resolve(hubPath)) {
        return "skipped-exists"; // already correct
      }
      // Points elsewhere or broken
      if (!force) {
        return "skipped-wrong-target";
      }
      // Force: remove and recreate
      if (!dryRun) unlinkSync(linkPath);
    } else {
      // Real file/directory
      if (!force) {
        return "skipped-real";
      }
      if (!dryRun) unlinkSync(linkPath);
    }
  }

  if (!dryRun) {
    ensureParentDir(linkPath);
    symlinkSync(resolve(hubPath), linkPath);
  }
  return "created";
}

/**
 * Ensure .opencode/ is in .gitignore
 */
function ensureGitignore(project: string, dryRun: boolean) {
  const gitignorePath = join(project, ".gitignore");
  let content = "";
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, "utf-8");
    // Check if .opencode/ is already listed
    const lines = content.split("\n");
    if (lines.some((l) => l.trim() === ".opencode/" || l.trim() === OPENCODE_DIR)) {
      return; // already present
    }
  }
  const addition = (content && !content.endsWith("\n") ? "\n" : "") + ".opencode/\n";
  if (!dryRun) {
    writeFileSync(gitignorePath, content + addition, "utf-8");
  }
  log(`  .gitignore: added .opencode/`);
}

/**
 * Collect all hub-managed symlinks under .opencode/ for a project.
 */
function collectHubManagedSymlinks(project: string): string[] {
  const results: string[] = [];
  const od = opencodeDir(project);
  if (!existsSync(od)) return results;

  // Check type subdirectories (agents, skills, commands, plugins, scripts)
  for (const type of FILE_LEVEL_TYPES.concat(DIRECTORY_LEVEL_TYPES)) {
    const typeDir = join(od, type);
    if (!existsSync(typeDir)) continue;
    const ls = lstatSync(typeDir);
    if (!ls.isDirectory()) continue;

    for (const entry of readdirSync(typeDir)) {
      const fullPath = join(typeDir, entry);
      if (lstatSync(fullPath).isSymbolicLink() && isHubManagedSymlink(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  // Check config files at .opencode/ root
  for (const entry of readdirSync(od)) {
    const fullPath = join(od, entry);
    if (lstatSync(fullPath).isSymbolicLink() && isHubManagedSymlink(fullPath)) {
      // Verify it points to hub's config/
      const target = resolve(readlinkSync(fullPath));
      if (target.startsWith(join(HUB_DIR, "config") + "/")) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

// ─── Commands ────────────────────────────────────────────────────────

function cmdInit(project: string, dryRun: boolean, force: boolean): number {
  const manifest = readManifest(project);
  if (manifest === null) {
    log("no manifest found");
    return 0;
  }

  let created = 0;
  let skipped = 0;
  let removed = 0;
  let errors = 0;

  // Collect all expected link paths
  const expectedLinks = new Set<string>();

  // Step 2: Create symlinks for manifest entries
  for (const [type, names] of Object.entries(manifest)) {
    if (!EXTENSION_TYPES.includes(type as ExtensionType)) continue;
    for (const name of names) {
      const resolved = resolveHubEntry(type as ExtensionType, name);
      if (!resolved) {
        error(`hub entry not found: ${type}/${name}`);
        errors++;
        continue;
      }
      const linkPath = computeLinkPath(
        project,
        type as ExtensionType,
        name,
        resolved.hubPath
      );
      expectedLinks.add(resolve(linkPath));

      const result = createSymlink(resolved.hubPath, linkPath, dryRun, force);
      switch (result) {
        case "created":
          log(`  + ${type}/${name}`);
          created++;
          break;
        case "skipped-exists":
          skipped++;
          break;
        case "skipped-real":
          warn(`skipped (real file exists): ${relative(project, linkPath)} -- use --force to overwrite`);
          skipped++;
          break;
        case "skipped-wrong-target":
          warn(`skipped (symlink points elsewhere): ${relative(project, linkPath)} -- use --force to overwrite`);
          skipped++;
          break;
      }
    }
  }

  // Step 3: Remove stale hub-managed symlinks
  const hubSymlinks = collectHubManagedSymlinks(project);
  for (const linkPath of hubSymlinks) {
    if (!expectedLinks.has(resolve(linkPath))) {
      if (!dryRun) unlinkSync(linkPath);
      log(`  - removed stale: ${relative(project, linkPath)}`);
      removed++;
    }
  }

  // Step 4: .gitignore
  ensureGitignore(project, dryRun);

  // Step 5: Summary
  const summaryParts: string[] = [];
  if (created > 0) summaryParts.push(`${created} created`);
  if (skipped > 0) summaryParts.push(`${skipped} skipped`);
  if (removed > 0) summaryParts.push(`${removed} removed`);
  if (errors > 0) summaryParts.push(`${errors} errors`);
  log(`summary: ${summaryParts.join(", ") || "nothing to do"}`);

  return errors > 0 ? 1 : 0;
}

function cmdAdd(
  project: string,
  typeInput: string,
  dryRun: boolean
): number {
  const { type, name } = parseTypeName(typeInput);

  // Step 1: Verify extension exists in hub
  const resolved = resolveHubEntry(type, name);
  if (!resolved) {
    error(`hub entry not found: ${type}/${name}`);
    return 1;
  }

  // Step 2: Read or create manifest
  const manifest = readManifest(project) ?? {};
  if (!manifest[type]) manifest[type] = [];

  // Step 3: Check if already present
  if (manifest[type].includes(name)) {
    log(`already in manifest: ${type}/${name}`);
    return 0;
  }

  // Step 4: Add to manifest
  manifest[type].push(name);
  if (!dryRun) writeManifest(project, manifest);

  // Step 5-6: Create symlink
  const linkPath = computeLinkPath(project, type, name, resolved.hubPath);
  const result = createSymlink(resolved.hubPath, linkPath, dryRun, false);

  if (result === "created") {
    log(`  + ${type}/${name}`);
  } else if (result === "skipped-exists") {
    log(`  symlink already correct: ${type}/${name}`);
  } else if (result === "skipped-real") {
    warn(`real file exists at ${relative(project, linkPath)}; symlink not created`);
  } else if (result === "skipped-wrong-target") {
    warn(`symlink at ${relative(project, linkPath)} points elsewhere; not overwritten`);
  }

  log(`added ${type}/${name} to manifest${dryRun ? " (dry-run)" : ""}`);
  return 0;
}

function cmdRemove(
  project: string,
  typeInput: string,
  dryRun: boolean
): number {
  const { type, name } = parseTypeName(typeInput);

  // Step 1: Read manifest
  const manifest = readManifest(project);
  if (!manifest) {
    error("no manifest found");
    return 1;
  }
  if (!manifest[type] || !manifest[type].includes(name)) {
    error(`not in manifest: ${type}/${name}`);
    return 1;
  }

  // Step 2: Remove from manifest array
  manifest[type] = manifest[type].filter((n: string) => n !== name);
  if (manifest[type].length === 0) {
    delete manifest[type];
  }

  // Step 3: Write manifest
  if (!dryRun) writeManifest(project, manifest);

  // Step 4: Remove symlink
  // Use lstatSync to detect broken symlinks (existsSync returns false for them).
  const resolved = resolveHubEntry(type, name);
  if (resolved) {
    const linkPath = computeLinkPath(project, type, name, resolved.hubPath);
    let linkStat;
    try { linkStat = lstatSync(linkPath); } catch { linkStat = null; }
    if (linkStat) {
      if (linkStat.isSymbolicLink() && isHubManagedSymlink(linkPath)) {
        if (!dryRun) unlinkSync(linkPath);
        log(`  removed symlink: ${relative(project, linkPath)}`);
      } else if (linkStat.isSymbolicLink()) {
        warn(`symlink at ${relative(project, linkPath)} is not hub-managed; skipped`);
      } else {
        warn(`${relative(project, linkPath)} is a real file; skipped`);
      }
    } else {
      log(`  symlink already absent: ${type}/${name}`);
    }
  } else {
    // Hub entry no longer exists; still try to find and remove the symlink
    // by computing the path from the name
    const linkPath = computeLinkPathFallback(project, type, name);
    if (linkPath) {
      let linkStat;
      try { linkStat = lstatSync(linkPath); } catch { linkStat = null; }
      if (linkStat && linkStat.isSymbolicLink() && isHubManagedSymlink(linkPath)) {
        if (!dryRun) unlinkSync(linkPath);
        log(`  removed symlink: ${relative(project, linkPath)}`);
      }
    }
  }

  log(`removed ${type}/${name} from manifest${dryRun ? " (dry-run)" : ""}`);
  return 0;
}

/**
 * Fallback to compute link path when hub entry no longer exists.
 */
function computeLinkPathFallback(
  project: string,
  type: ExtensionType,
  name: string
): string | null {
  if (type === "config") {
    return join(opencodeDir(project), name);
  }
  if (type === "skills") {
    return join(opencodeDir(project), "skills", name);
  }
  // For file-level types, we don't know the extension without the hub entry.
  // Scan the .opencode/ subdirectory for a matching basename.
  const typeDir = join(opencodeDir(project), type);
  if (!existsSync(typeDir)) return null;
  for (const entry of readdirSync(typeDir)) {
    if (basename(entry, extname(entry)) === name) {
      return join(typeDir, entry);
    }
  }
  return null;
}

function cmdClean(project: string, dryRun: boolean): number {
  const od = opencodeDir(project);
  if (!existsSync(od)) {
    log("no .opencode/ directory found");
    return 0;
  }

  let removed = 0;

  // Check type subdirectories
  for (const type of FILE_LEVEL_TYPES.concat(DIRECTORY_LEVEL_TYPES)) {
    const typeDir = join(od, type);
    if (!existsSync(typeDir)) continue;
    const ls = lstatSync(typeDir);
    if (!ls.isDirectory()) continue;

    for (const entry of readdirSync(typeDir)) {
      const fullPath = join(typeDir, entry);
      if (!lstatSync(fullPath).isSymbolicLink()) continue;

      const target = resolve(readlinkSync(fullPath));
      if (target.startsWith(HUB_DIR + "/") && !existsSync(target)) {
        log(`  removing broken: ${relative(project, fullPath)} -> ${target}`);
        if (!dryRun) unlinkSync(fullPath);
        removed++;
      }
    }
  }

  // Check config files at .opencode/ root
  for (const entry of readdirSync(od)) {
    const fullPath = join(od, entry);
    if (!lstatSync(fullPath).isSymbolicLink()) continue;

    const target = resolve(readlinkSync(fullPath));
    if (
      target.startsWith(join(HUB_DIR, "config") + "/") &&
      !existsSync(target)
    ) {
      log(`  removing broken: ${relative(project, fullPath)} -> ${target}`);
      if (!dryRun) unlinkSync(fullPath);
      removed++;
    }
  }

  if (removed === 0) {
    log("no broken symlinks found");
  } else {
    log(`removed ${removed} broken symlink${removed > 1 ? "s" : ""}${dryRun ? " (dry-run)" : ""}`);
  }

  return 0;
}

function cmdCreate(typeInput: string, name: string, dryRun: boolean): number {
  const type = typeInput as ExtensionType;
  if (!EXTENSION_TYPES.includes(type)) {
    error(`unknown type "${type}": must be one of ${EXTENSION_TYPES.join(", ")}`);
    return 1;
  }

  let hubPath: string;

  switch (type) {
    case "agents":
    case "commands": {
      hubPath = join(HUB_DIR, type, `${name}.md`);
      break;
    }
    case "plugins":
    case "scripts": {
      hubPath = join(HUB_DIR, type, `${name}.ts`);
      break;
    }
    case "skills": {
      hubPath = join(HUB_DIR, type, name, "SKILL.md");
      break;
    }
    case "config": {
      hubPath = join(HUB_DIR, type, name);
      break;
    }
  }

  if (existsSync(hubPath)) {
    error(`already exists: ${hubPath}`);
    return 1;
  }

  if (dryRun) {
    log(`would create: ${hubPath}`);
    return 0;
  }

  // Ensure parent directory exists
  const parent = dirname(hubPath);
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true });

  let content: string;

  switch (type) {
    case "agents":
    case "commands": {
      content = `---\nname: ${name}\n---\n\n# ${name}\n\nDescription: TODO\n`;
      break;
    }
    case "plugins":
    case "scripts": {
      content = `// ${name}\n\nexport default {};\n`;
      break;
    }
    case "skills": {
      content = `---\nname: ${name}\n---\n\n# ${name}\n\nDescription: TODO\n`;
      break;
    }
    case "config": {
      content = "";
      break;
    }
  }

  writeFileSync(hubPath, content, "utf-8");
  log(`created: ${relative(HUB_DIR, hubPath)}`);
  return 0;
}

function cmdList(filterType?: string): number {
  if (filterType && !EXTENSION_TYPES.includes(filterType as ExtensionType)) {
    error(`unknown type "${filterType}": must be one of ${EXTENSION_TYPES.join(", ")}`);
    return 1;
  }

  const types = filterType
    ? [filterType as ExtensionType]
    : [...EXTENSION_TYPES];

  for (const type of types) {
    const hubDir = join(HUB_DIR, type);
    const entries: string[] = [];

    if (existsSync(hubDir)) {
      for (const entry of readdirSync(hubDir)) {
        const full = join(hubDir, entry);
        const ls = lstatSync(full);
        if (type === "skills") {
          if (ls.isDirectory()) {
            entries.push(entry);
          } else if (ls.isSymbolicLink() && statSync(full).isDirectory()) {
            entries.push(entry);
          }
        } else {
          if (ls.isFile()) {
            // Show bare name for file-level types, full name for config
            if (type === "config") {
              entries.push(entry);
            } else {
              entries.push(basename(entry, extname(entry)));
            }
          } else if (ls.isSymbolicLink() && statSync(full).isFile()) {
            if (type === "config") {
              entries.push(entry);
            } else {
              entries.push(basename(entry, extname(entry)));
            }
          }
        }
      }
    }

    if (entries.length > 0 || !filterType) {
      console.log(`${type}:`);
      if (entries.length > 0) {
        console.log(`  ${[...new Set(entries)].sort().join(", ")}`);
      } else {
        console.log(`  (none)`);
      }
    }
  }

  return 0;
}

function cmdStatus(project: string): number {
  const manifest = readManifest(project);
  if (!manifest) {
    error("no manifest found");
    return 1;
  }

  let missing = 0;
  let broken = 0;
  let unexpected = 0;
  let conflicting = 0;
  let ok = 0;

  // Check manifest entries
  for (const [type, names] of Object.entries(manifest)) {
    if (!EXTENSION_TYPES.includes(type as ExtensionType)) continue;
    for (const name of names) {
      const resolved = resolveHubEntry(type as ExtensionType, name);
      if (!resolved) {
        log(`  BROKEN    ${type}/${name}: hub entry does not exist`);
        broken++;
        continue;
      }

      const linkPath = computeLinkPath(
        project,
        type as ExtensionType,
        name,
        resolved.hubPath
      );

      // Use lstatSync to detect broken symlinks (existsSync returns false for them).
      let linkStat;
      try { linkStat = lstatSync(linkPath); } catch { linkStat = null; }

      if (!linkStat) {
        log(`  MISSING   ${type}/${name}: symlink does not exist`);
        missing++;
        continue;
      }

      if (!linkStat.isSymbolicLink()) {
        log(`  CONFLICT  ${type}/${name}: real file exists instead of symlink`);
        conflicting++;
        continue;
      }

      const target = resolve(readlinkSync(linkPath));
      if (!existsSync(target)) {
        log(`  BROKEN    ${type}/${name}: symlink target missing`);
        broken++;
        continue;
      }

      if (target !== resolve(resolved.hubPath)) {
        log(`  CONFLICT  ${type}/${name}: symlink points to unexpected target`);
        conflicting++;
        continue;
      }

      ok++;
    }
  }

  // Check for unexpected hub-managed symlinks
  const hubSymlinks = collectHubManagedSymlinks(project);
  for (const linkPath of hubSymlinks) {
    const rel = relative(opencodeDir(project), linkPath);
    // Determine the type/name for this symlink
    const target = resolve(readlinkSync(linkPath));
    const relToHub = relative(HUB_DIR, target);
    const parts = relToHub.split("/");

    let inManifest = false;
    if (parts.length >= 2) {
      const hubType = parts[0] as ExtensionType;
      let hubName: string;

      if (hubType === "skills") {
        hubName = parts[1];
      } else if (hubType === "config") {
        hubName = parts.slice(1).join("/");
      } else {
        // File-level type: strip extension
        hubName = basename(parts[1], extname(parts[1]));
      }

      // Check if this type/name is in the manifest
      const manifestNames = manifest[hubType] ?? [];
      inManifest = manifestNames.includes(hubName);
    }

    if (!inManifest) {
      log(`  UNEXPECTED ${rel}: hub-managed symlink not in manifest`);
      unexpected++;
    }
  }

  // Summary
  const parts: string[] = [];
  if (ok > 0) parts.push(`${ok} ok`);
  if (missing > 0) parts.push(`${missing} missing`);
  if (broken > 0) parts.push(`${broken} broken`);
  if (unexpected > 0) parts.push(`${unexpected} unexpected`);
  if (conflicting > 0) parts.push(`${conflicting} conflicting`);
  log(`status: ${parts.join(", ")}`);

  return missing + broken + unexpected + conflicting > 0 ? 1 : 0;
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`usage: openext <command> [options] [project-path]

Commands:
  init [project-path]         Reconcile symlinks with manifest
  add <type>/<name> [path]    Add extension to manifest and symlink
  remove <type>/<name> [path] Remove extension from manifest and symlink
  clean [project-path]        Remove broken hub-managed symlinks
  create <type> <name>        Create skeleton extension in hub
  list [--type <type>]        List available extensions in hub
  status [project-path]       Compare manifest against actual state

Options:
  --dry-run   Preview changes without writing
  --force     Overwrite existing files (init only)
  --type <t>  Filter by extension type (list only)`);
    process.exit(0);
  }

  const command = args[0];
  const rest = args.slice(1);

  // Parse flags
  const dryRun = rest.includes("--dry-run");
  const force = rest.includes("--force");

  // Remove flags from positional args
  const positional = rest.filter((a) => !a.startsWith("--"));

  // Handle --type for list command
  let filterType: string | undefined;
  if (command === "list") {
    const typeIdx = rest.indexOf("--type");
    if (typeIdx !== -1 && typeIdx + 1 < rest.length) {
      filterType = rest[typeIdx + 1];
    }
  }

  switch (command) {
    case "init": {
      const project = resolveProject(positional[0]);
      const code = cmdInit(project, dryRun, force);
      process.exit(code);
      break;
    }
    case "add": {
      if (!positional[0]) {
        error("expected <type>/<name>");
        process.exit(1);
      }
      const project = resolveProject(positional[1]);
      const code = cmdAdd(project, positional[0], dryRun);
      process.exit(code);
      break;
    }
    case "remove": {
      if (!positional[0]) {
        error("expected <type>/<name>");
        process.exit(1);
      }
      const project = resolveProject(positional[1]);
      const code = cmdRemove(project, positional[0], dryRun);
      process.exit(code);
      break;
    }
    case "clean": {
      const project = resolveProject(positional[0]);
      const code = cmdClean(project, dryRun);
      process.exit(code);
      break;
    }
    case "create": {
      if (!positional[0] || !positional[1]) {
        error("expected <type> <name>");
        process.exit(1);
      }
      const code = cmdCreate(positional[0], positional[1], dryRun);
      process.exit(code);
      break;
    }
    case "list": {
      const code = cmdList(filterType);
      process.exit(code);
      break;
    }
    case "status": {
      const project = resolveProject(positional[0]);
      const code = cmdStatus(project);
      process.exit(code);
      break;
    }
    default:
      error(`unknown command: ${command}`);
      process.exit(1);
  }
}

main();
