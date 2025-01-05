import type * as vscode from "vscode";

import stripAnsi from "strip-ansi";

import { sanitizeTerminalOutput } from "../../utils/sanitize";


export class TerminalProcess {
  private fullOutput: string = "";
  private lastRetrievedIndex: number = 0;
  private terminateLineYield: (() => void) | null = null;

  private cleanAndFormatLines(data: string, isFirstChunk: boolean): string {
    const lines = data ? data.split("\n") : [];

    const processedLines = lines.map((line, index) => {
      // Remove non-ASCII and control characters
      line = line.replace(/[^\x20-\x7E]/g, "");

      if (isFirstChunk && index <= 1) {
        // Handle duplicate first character issue
        if (index === 0 && line.length >= 2 && line[0] === line[1]) {
          line = line.slice(1);
        }
        // Clean line start
        line = line.replace(/^[^a-z0-9]*/i, "");
      }
      return line;
    });

    return processedLines.join("\n");
  }

  private async *executeWithoutShellIntegration(terminal: vscode.Terminal, command: string): AsyncGenerator<string> {
    terminal.sendText(command, true);
    throw new Error("No shell integration available");
  }

  private async *executeWithShellIntegration(terminal: vscode.Terminal, command: string): AsyncGenerator<string> {
    const execution = terminal.shellIntegration!.executeCommand(command);
    const stream = execution.read();
    yield * this.processOutput(stream, command);
  }

  private filterCommandEcho(data: string, command: string): string {
    const lines = data.split("\n");
    const filteredLines = lines.filter(line => !command.includes(line.trim()));
    return filteredLines.join("\n");
  }

  private processChunk(data: string, isFirstChunk: boolean, command: string, didOutputNonCommand: boolean): string {
    if (isFirstChunk) {
      data = this.processFirstChunk(data);
    }
    else {
      data = this.processNonFirstChunk(data);
    }

    if (!didOutputNonCommand) {
      data = this.filterCommandEcho(data, command);
    }

    return data;
  }

  private processFirstChunk(data: string): string {
    // Extract content between VSCode shell integration markers
    const outputBetweenSequences = this.sanitizeMultipleLines(
      data.match(/\]633;C([\s\S]*?)\]633;D/)?.[1] || ""
    ).trim();

    // Remove VSCode shell integration sequences
    const vscodeSequenceRegex = /\x1B\]633;.[^\x07]*\x07/g;
    const lastMatch = [...data.matchAll(vscodeSequenceRegex)].pop();
    if (lastMatch?.index !== undefined) {
      data = data.slice(lastMatch.index + lastMatch[0].length);
    }

    // Combine cleaned data
    if (outputBetweenSequences) {
      data = `${outputBetweenSequences}\n${data}`;
    }

    return this.cleanAndFormatLines(stripAnsi(data), true);
  }

  private processNonFirstChunk(data: string): string {
    return this.cleanAndFormatLines(stripAnsi(data), false);
  }

  private async *processOutput(stream: AsyncIterable<string>, command: string): AsyncGenerator<string> {
    let buffer = "";
    let isFirstChunk = true;
    let didOutputNonCommand = false;
    let didEmitEmptyLine = false;

    for await (let data of stream) {
      data = this.processChunk(data, isFirstChunk, command, didOutputNonCommand);
      if (data) {
        didOutputNonCommand = true;
      }

      if (!didEmitEmptyLine && !this.fullOutput && data) {
        yield "";
        didEmitEmptyLine = true;
      }

      this.fullOutput += data;
      buffer += data;

      // Normalize line endings
      buffer = buffer.replace(/\r\n/g, "\n");

      // Process complete lines
      let lineEndIndex: number;
      while ((lineEndIndex = buffer.indexOf("\n")) !== -1) {
        const line = this.sanitizeLine(buffer.slice(0, lineEndIndex));
        buffer = buffer.slice(lineEndIndex + 1);

        yield line;

        // Wait for continue if needed
        if (this.terminateLineYield) {
          await new Promise<void>((resolve) => {
            this.terminateLineYield = resolve;
          });
        }
      }

      isFirstChunk = false;
      this.lastRetrievedIndex = this.fullOutput.length - buffer.length;
    }

    // Handle any remaining content in buffer
    const remaining = this.sanitizeMultipleLines(buffer);
    if (remaining) {
      yield remaining;
    }
  }

  private sanitizeLine(line: string): string {
    return sanitizeTerminalOutput(line);
  }

  private sanitizeMultipleLines(output: string): string {
    return output
      .split("\n")
      .map(line => sanitizeTerminalOutput(line))
      .filter(line => line.length > 0)
      .join("\n");
  }

  continue(): void {
    if (this.terminateLineYield) {
      const resolve = this.terminateLineYield;
      this.terminateLineYield = null;
      resolve();
    }
  }

  getUnretrievedOutput(): string {
    const unretrieved = this.fullOutput.slice(this.lastRetrievedIndex);
    this.lastRetrievedIndex = this.fullOutput.length;
    return this.sanitizeMultipleLines(unretrieved);
  }

  async *run(terminal: vscode.Terminal, command: string): AsyncGenerator<string> {
    if (terminal.shellIntegration?.executeCommand) {
      yield * this.executeWithShellIntegration(terminal, command);
    }
    else {
      yield * this.executeWithoutShellIntegration(terminal, command);
    }
  }
}
