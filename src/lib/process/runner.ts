export interface ProcessRunnerOptions {
  command: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface ProcessRunnerResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  success: boolean;
}

export interface ProcessRunnerInteractiveResult {
  exitCode: number | null;
  success: boolean;
}

export async function runProcess(
  options: ProcessRunnerOptions
): Promise<ProcessRunnerResult> {
  const { command, cwd, env } = options;

  const process = Bun.spawn(command, {
    cwd,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);

  const exitCode = await process.exited;

  return {
    exitCode,
    stdout,
    stderr,
    success: exitCode === 0,
  };
}

export async function runProcessInteractive(
  options: ProcessRunnerOptions
): Promise<ProcessRunnerInteractiveResult> {
  const { command, cwd, env } = options;

  const process = Bun.spawn(command, {
    cwd,
    env,
  });

  const exitCode = await process.exited;

  return {
    exitCode,
    success: exitCode === 0,
  };
}
