import { defineConfig } from "@vscode/test-cli";


export default defineConfig({
  files: "test/**/*.test.ts",
  workspaceFolder: ".",
  mocha: {
    ui: "tdd",
    timeout: 20000, // 20 seconds
    color: true
  }
});
