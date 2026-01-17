import { OpenCodeAdapter } from "../opencode/adapter.js";

export async function inspectHandler(): Promise<void> {
  const adapter = new OpenCodeAdapter();
  
  const sessionId = "TODO: implement session tracking";
  const result = await adapter.export(sessionId);
  
  if (result.success) {
    console.log(result.output);
  } else {
    console.error(result.error || "Failed to inspect");
    process.exit(1);
  }
}
