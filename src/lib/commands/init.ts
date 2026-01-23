/**
 * Init command handler for initializing ralphctl
 *
 * This command sets up ralphctl by:
 * 1. Creating prompt templates (PROMPT_plan.md, PROMPT_build.md)
 * 2. Detecting available CLI tools (claude, opencode)
 * 3. Creating command folders (.claude/commands/, .opencode/commands/)
 * 4. Installing project command files
 */

import type { InitOptions } from "../../domain/types.ts";
import { PLAN_TEMPLATE, BUILD_TEMPLATE } from "../templates/index.ts";
import { fileExists, writeFile } from "../files/index.ts";
import { confirmOverwrite } from "../io/index.ts";
import { detectAvailableTools } from "../tools/detection.js";
import { determineToolChoice } from "../tools/prompting.js";
import { createCommandFolders, installCommandFiles } from "../command-infrastructure.js";
import { verifyRepoRoot } from "../repo/verification.js";

const PLAN_FILE = "PROMPT_plan.md";
const BUILD_FILE = "PROMPT_build.md";

async function writeTemplate(
  filePath: string,
  content: string,
  force: boolean
): Promise<boolean> {
  const exists = await fileExists(filePath);

  if (exists && !force) {
    const shouldOverwrite = await confirmOverwrite(filePath);
    if (!shouldOverwrite) {
      console.log(`Skipping ${filePath}`);
      return false;
    }
  }

  await writeFile(filePath, content);
  console.log(`Created ${filePath}`);
  return true;
}

export async function initHandler(options: InitOptions): Promise<void> {
  const force = options.force ?? false;

  console.log("🔧 Initializing ralphctl...\n");

  // Part 1: Create prompt templates
  console.log("Creating prompt templates...");
  const planWritten = await writeTemplate(PLAN_FILE, PLAN_TEMPLATE, force);
  const buildWritten = await writeTemplate(BUILD_FILE, BUILD_TEMPLATE, force);

  if (planWritten || buildWritten) {
    console.log("  ✓ Prompt templates created");
  } else {
    console.log("  ⚠ Prompt templates skipped (already exist)");
  }

  // Part 2: Set up project commands
  console.log("\nSetting up project commands...");

  // Step 1: Verify we're in a git repo root
  console.log("Checking repository...");
  const repoCheck = await verifyRepoRoot();

  // Check if we're not in a repo at all
  if (repoCheck.repoRootPath === null && !repoCheck.userConfirmed) {
    console.error("❌ Not a git repository. Project commands should be set up at repo root.");
    console.log("\n✓ Initialized prompt templates only (not in a git repository)");
    return;
  }

  // Check if we're not at repo root and user didn't confirm
  if (!repoCheck.isRepoRoot && !repoCheck.userConfirmed) {
    console.error("❌ Setup cancelled.");
    console.log("\n✓ Initialized prompt templates only");
    return;
  }

  // Step 2: Detect available tools
  console.log("\nDetecting CLI tools...");
  const detection = detectAvailableTools();

  if (detection.claude) {
    console.log("  ✓ Claude Code CLI detected");
  }
  if (detection.opencode) {
    console.log("  ✓ OpenCode CLI detected");
  }
  if (!detection.hasAny) {
    console.log("  ⚠ No CLI tools detected in PATH");
  }

  // Step 3: Determine which tools to set up
  console.log("\nDetermining tool setup...");
  const toolChoice = await determineToolChoice(detection);

  if (!toolChoice) {
    console.log("  ⚠ No tool selected. Skipping command installation.");
    console.log("\n✓ Initialized prompt templates only");
    console.log("  Run 'ralphctl init' again when CLI tools are available to install commands.");
    return;
  }

  // Step 4: Create command folders
  console.log("\nCreating command folders...");
  const folderResult = await createCommandFolders(toolChoice);

  if (folderResult.claudeReady && folderResult.claudePath) {
    console.log(`  ✓ Created ${folderResult.claudePath}`);
  }
  if (folderResult.opencodeReady && folderResult.opencodePath) {
    console.log(`  ✓ Created ${folderResult.opencodePath}`);
  }

  if (!folderResult.claudeReady && !folderResult.opencodeReady) {
    console.error("❌ Failed to create any command folders.");
    console.log("\n✓ Initialized prompt templates only");
    return;
  }

  // Step 5: Install command files
  console.log("\nInstalling command files...");
  const installResult = await installCommandFiles(folderResult);

  if (installResult.errors.length > 0) {
    console.error("\n❌ Command installation failed:");
    for (const error of installResult.errors) {
      console.error(`  - ${error}`);
    }
    console.log("\n✓ Initialized prompt templates only");
    return;
  }

  // Step 6: Print success summary
  console.log("\n✅ ralphctl initialized successfully!\n");

  if (installResult.claudeInstalled > 0 && installResult.claudePath) {
    console.log(`  📁 Claude Code: ${installResult.claudeInstalled} commands in ${installResult.claudePath}`);
  }
  if (installResult.opencodeInstalled > 0 && installResult.opencodePath) {
    console.log(`  📁 OpenCode: ${installResult.opencodeInstalled} commands in ${installResult.opencodePath}`);
  }

  console.log("\n📝 Available commands:");
  console.log("  /project:new <name>       - Create a new project");
  console.log("  /project:research <name>  - Capture research");
  console.log("  /project:prd <name>       - Create PRD");
  console.log("  /project:jtbd <name>      - Define Jobs to Be Done");
  console.log("  /project:tasks <name>     - Break down into tasks");
  console.log("  /project:hld <name>       - Document high-level design");
  console.log("  /project:specs <name>     - Generate spec files");

  console.log("\n🚀 Next step: Run '/project:new <name>' to create your first project");
}
