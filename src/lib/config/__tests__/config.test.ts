import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { loadAppConfig } from "../loader";
import { ConfigSchema } from "../schema";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("Config Schema", () => {
	it("validates valid config", () => {
		const valid = {
			smartModel: "claude-opus-4-5",
			fastModel: "claude-sonnet-4-5",
			agent: "claude-code" as const,
			maxIterations: 15,
			permissionPosture: "ask" as const,
		};
		expect(() => ConfigSchema.parse(valid)).not.toThrow();
	});

	it("allows partial config", () => {
		const partial = { smartModel: "gpt-5" };
		expect(() => ConfigSchema.parse(partial)).not.toThrow();
	});

	it("allows empty config", () => {
		expect(() => ConfigSchema.parse({})).not.toThrow();
	});

	it("rejects invalid agent", () => {
		expect(() => ConfigSchema.parse({ agent: "invalid" })).toThrow(
			"agent must be 'opencode' or 'claude-code'",
		);
	});

	it("rejects invalid permissionPosture", () => {
		expect(() =>
			ConfigSchema.parse({ permissionPosture: "invalid" }),
		).toThrow("permissionPosture must be 'allow-all' or 'ask'");
	});

	it("rejects non-number maxIterations", () => {
		expect(() => ConfigSchema.parse({ maxIterations: "10" })).toThrow(
			"maxIterations must be a number",
		);
	});

	it("rejects float maxIterations", () => {
		expect(() => ConfigSchema.parse({ maxIterations: 10.5 })).toThrow(
			"maxIterations must be a whole number",
		);
	});

	it("rejects negative maxIterations", () => {
		expect(() => ConfigSchema.parse({ maxIterations: -5 })).toThrow(
			"maxIterations must be greater than 0",
		);
	});

	it("rejects zero maxIterations", () => {
		expect(() => ConfigSchema.parse({ maxIterations: 0 })).toThrow(
			"maxIterations must be greater than 0",
		);
	});
});

describe("Config Loading", () => {
	let tempDir: string;
	let originalCwd: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ralphctl-test-"));
		originalCwd = process.cwd();
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("loads config from project file", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(
			configPath,
			JSON.stringify({ smartModel: "test-model" }),
		);

		process.chdir(tempDir);

		const config = await loadAppConfig();
		expect(config.smartModel).toBe("test-model");
	});

	it("loads config from explicit --config file", async () => {
		const configPath = path.join(tempDir, "custom.json");
		await fs.writeFile(configPath, JSON.stringify({ agent: "claude-code" }));

		const config = await loadAppConfig({}, configPath);
		expect(config.agent).toBe("claude-code");
	});

	it("throws error for missing explicit --config file", async () => {
		const missingPath = path.join(tempDir, "nonexistent.json");
		await expect(loadAppConfig({}, missingPath)).rejects.toThrow();
	});

	it("silently ignores missing auto-discovered files", async () => {
		process.chdir(tempDir);
		await expect(loadAppConfig()).resolves.toBeDefined();
	});

	it("loads YAML config files", async () => {
		const configPath = path.join(tempDir, ".ralphctl.yaml");
		await fs.writeFile(
			configPath,
			"smartModel: yaml-model\nagent: opencode\n",
		);

		process.chdir(tempDir);

		const config = await loadAppConfig();
		expect(config.smartModel).toBe("yaml-model");
		expect(config.agent).toBe("opencode");
	});
});

describe("Config Merging", () => {
	let tempDir: string;
	let originalCwd: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ralphctl-test-"));
		originalCwd = process.cwd();
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("CLI flags override config file", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(
			configPath,
			JSON.stringify({ smartModel: "file-model", agent: "opencode" }),
		);

		process.chdir(tempDir);

		const config = await loadAppConfig({ smartModel: "cli-model" });

		expect(config.smartModel).toBe("cli-model"); // CLI wins
		expect(config.agent).toBe("opencode"); // From file
	});

	it("undefined CLI flags do not override config", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(
			configPath,
			JSON.stringify({ smartModel: "file-model" }),
		);

		process.chdir(tempDir);

		const config = await loadAppConfig({
			smartModel: undefined,
			agent: "claude-code",
		});

		expect(config.smartModel).toBe("file-model"); // undefined filtered
		expect(config.agent).toBe("claude-code"); // From CLI
	});

	it("merges partial configs from multiple sources", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(
			configPath,
			JSON.stringify({ smartModel: "file-smart", maxIterations: 20 }),
		);

		process.chdir(tempDir);

		const config = await loadAppConfig({ agent: "claude-code" });

		expect(config.smartModel).toBe("file-smart");
		expect(config.maxIterations).toBe(20);
		expect(config.agent).toBe("claude-code");
	});

	it("explicit --config file overrides project config", async () => {
		const projectConfigPath = path.join(tempDir, ".ralphctl.json");
		const customConfigPath = path.join(tempDir, "custom.json");

		await fs.writeFile(
			projectConfigPath,
			JSON.stringify({ smartModel: "project-model", agent: "opencode" }),
		);
		await fs.writeFile(
			customConfigPath,
			JSON.stringify({ smartModel: "custom-model" }),
		);

		process.chdir(tempDir);

		const config = await loadAppConfig({}, customConfigPath);

		expect(config.smartModel).toBe("custom-model"); // Custom file wins
		expect(config.agent).toBeUndefined(); // Not in custom file
	});
});

describe("filterUndefined", () => {
	// Test the behavior through loadAppConfig
	let tempDir: string;
	let originalCwd: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ralphctl-test-"));
		originalCwd = process.cwd();
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("removes undefined values from CLI overrides", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(
			configPath,
			JSON.stringify({ smartModel: "file-model", agent: "opencode" }),
		);

		process.chdir(tempDir);

		const config = await loadAppConfig({
			smartModel: undefined,
			fastModel: undefined,
			maxIterations: undefined,
		});

		// All values should come from file since CLI values are undefined
		expect(config.smartModel).toBe("file-model");
		expect(config.agent).toBe("opencode");
	});

	it("preserves falsy values except undefined", async () => {
		// Test that the filter doesn't remove falsy values like 0, false, ""
		// by checking that validation errors occur (proving the value wasn't filtered)
		await expect(
			loadAppConfig({
				maxIterations: 0, // Invalid (must be positive), should cause validation error
			}),
		).rejects.toThrow("maxIterations must be greater than 0");
	});
});

describe("Error Handling", () => {
	let tempDir: string;
	let originalCwd: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ralphctl-test-"));
		originalCwd = process.cwd();
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("provides helpful error messages for invalid config", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(
			configPath,
			JSON.stringify({ agent: "invalid-agent" }),
		);

		process.chdir(tempDir);

		await expect(loadAppConfig()).rejects.toThrow(
			"agent must be 'opencode' or 'claude-code'",
		);
	});

	it("includes source file in error message", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(
			configPath,
			JSON.stringify({ maxIterations: "not-a-number" }),
		);

		process.chdir(tempDir);

		try {
			await loadAppConfig();
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			const message = (error as Error).message;
			expect(message).toContain("Config validation failed");
			expect(message).toContain("maxIterations");
		}
	});

	it("handles invalid JSON gracefully", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(configPath, "{ invalid json }");

		process.chdir(tempDir);

		await expect(loadAppConfig()).rejects.toThrow();
	});
});

describe("Edge Cases", () => {
	let tempDir: string;
	let originalCwd: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ralphctl-test-"));
		originalCwd = process.cwd();
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("handles empty config file", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(configPath, JSON.stringify({}));

		process.chdir(tempDir);

		const config = await loadAppConfig();
		expect(config).toBeDefined();
		expect(Object.keys(config).length).toBe(0);
	});

	it("handles config with extra fields", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(
			configPath,
			JSON.stringify({
				smartModel: "test-model",
				unknownField: "should-be-ignored",
			}),
		);

		process.chdir(tempDir);

		const config = await loadAppConfig();
		expect(config.smartModel).toBe("test-model");
		expect((config as any).unknownField).toBeUndefined();
	});

	it("handles all fields set to valid values", async () => {
		const configPath = path.join(tempDir, ".ralphctl.json");
		await fs.writeFile(
			configPath,
			JSON.stringify({
				smartModel: "model-1",
				fastModel: "model-2",
				agent: "opencode",
				maxIterations: 25,
				permissionPosture: "ask",
			}),
		);

		process.chdir(tempDir);

		const config = await loadAppConfig();
		expect(config.smartModel).toBe("model-1");
		expect(config.fastModel).toBe("model-2");
		expect(config.agent).toBe("opencode");
		expect(config.maxIterations).toBe(25);
		expect(config.permissionPosture).toBe("ask");
	});
});
