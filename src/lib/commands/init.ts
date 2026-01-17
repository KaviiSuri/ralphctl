import type { InitOptions } from "../../domain/types.ts";
import { PLAN_TEMPLATE, BUILD_TEMPLATE } from "../templates/index.ts";
import { fileExists, writeFile } from "../files/index.ts";
import { confirmOverwrite } from "../io/index.ts";

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

  const planWritten = await writeTemplate(PLAN_FILE, PLAN_TEMPLATE, force);
  const buildWritten = await writeTemplate(BUILD_FILE, BUILD_TEMPLATE, force);

  if (planWritten || buildWritten) {
    console.log("\n✓ Initialized prompt templates");
  } else {
    console.log("\nNo files were written");
  }
}
