import path from "node:path";
import { readFile } from "node:fs/promises";

import * as vscode from "vscode";
import { after, describe, it } from "mocha";

import "should";


const packagePath = path.join(__dirname, "..", "..", "..", "package.json");

describe("Recline Extension", () => {
  after(() => {
    vscode.window.showInformationMessage("All tests done!");
  });

  it("should verify extension ID matches package.json", async () => {
    const packageJSON = JSON.parse(await readFile(packagePath, "utf8"));
    const id = `${packageJSON.publisher}.${packageJSON.name}`;
    const reclineExtensionApi = vscode.extensions.getExtension(id);

    reclineExtensionApi?.id.should.equal(id);
  });

  it("should successfully execute the plus button command", async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
    await vscode.commands.executeCommand("recline.plusButtonClicked");
  });
});
