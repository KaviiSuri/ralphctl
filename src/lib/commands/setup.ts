/**
 * Setup command handler for installing project commands
 *
 * This command sets up the project command infrastructure by:
 * 1. Detecting available CLI tools (claude, opencode)
 * 2. Prompting user if needed
 * 3. Creating command folders (.claude/commands/, .opencode/commands/)
 * 4. Installing project command files
 */

import { detectAvailableTools } from "../tools/detection.js";
import { determineToolChoice } from "../tools/prompting.js";
import { createCommandFolders, installCommandFiles } from "../command-infrastructure.js";
import { verifyRepoRoot } from "../repo/verification.js";

export interface SetupOptions {
  force?: boolean;
}

export async function setupHandler(options: SetupOptions = {}): Promise<void> {
  console.log("🔧 Setting up project commands...\n");

  // Step 1: Verify we're in a git repo root
  console.log("Checking repository...");
  const repoCheck = await verifyRepoRoot();

  // Check if we're not in a repo at all
  if (repoCheck.repoRootPath === null && !repoCheck.userConfirmed) {
    console.error("❌ Not a git repository. Project commands should be set up at repo root.");
    process.exit(1);
  }

  // Check if we're not at repo root and user didn't confirm
  if (!repoCheck.isRepoRoot && !repoCheck.userConfirmed) {
    console.error("❌ Setup cancelled.");
    process.exit(1);
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
    console.error("❌ No tool selected. Setup cancelled.");
    process.exit(1);
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
    process.exit(1);
  }

  // Step 5: Install command files
  console.log("\nInstalling command files...");
  const installResult = await installCommandFiles(folderResult);

  if (installResult.errors.length > 0) {
    console.error("\n❌ Installation failed:");
    for (const error of installResult.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  // Step 6: Print success summary
  console.log("\n✅ Project commands installed successfully!\n");

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
