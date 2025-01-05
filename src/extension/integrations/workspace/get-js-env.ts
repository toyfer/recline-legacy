import { promisify } from "node:util";
import { exec } from "node:child_process";

import * as vscode from "vscode";


const execAsync = promisify(exec);

interface PackageManager {
  name: string;
  version: string;
  globalPackages: string[];
}

export async function getNodeVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync("node --version");
    return stdout.trim();
  }
  catch {
    return undefined;
  }
}

export async function getTypeScriptInfo(): Promise<{ version: string } | undefined> {
  const tsExtension = vscode.extensions.getExtension("vscode.typescript-language-features");

  if (!tsExtension) {
    return undefined;
  }

  try {
    const { stdout } = await execAsync("tsc --version");
    return { version: stdout.replace("Version ", "").trim() };
  }
  catch {
    return undefined;
  }
}

async function getGlobalPackages(command: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(command);
    return stdout
      .split("\n")
      .filter(Boolean)
      .map(line => line.trim());
  }
  catch {
    return [];
  }
}

export async function getPackageManagers(): Promise<PackageManager[]> {
  const managers: PackageManager[] = [];

  // Check npm
  try {
    const { stdout: npmVersion } = await execAsync("npm --version");
    const globalPackages = await getGlobalPackages("npm list -g --depth=0");
    managers.push({
      name: "npm",
      version: npmVersion.trim(),
      globalPackages
    });
  }
  catch {}

  // Check yarn
  try {
    const { stdout: yarnVersion } = await execAsync("yarn --version");
    const globalPackages = await getGlobalPackages("yarn global list --depth=0");
    managers.push({
      name: "yarn",
      version: yarnVersion.trim(),
      globalPackages
    });
  }
  catch {}

  // Check pnpm
  try {
    const { stdout: pnpmVersion } = await execAsync("pnpm --version");
    const globalPackages = await getGlobalPackages("pnpm list -g --depth=0");
    managers.push({
      name: "pnpm",
      version: pnpmVersion.trim(),
      globalPackages
    });
  }
  catch {}

  return managers;
}

export async function getJavaScriptEnvironment() {
  const environment: Record<string, any> = {
    nodeVersion: await getNodeVersion(),
    typescript: await getTypeScriptInfo(),
    packageManagers: await getPackageManagers()
  };

  // Filter out undefined values
  return Object.fromEntries(
    Object.entries(environment).filter(([_, value]) => value !== undefined)
  );
}
