import { EventEmitter } from "events"
import stripAnsi from "strip-ansi"
import * as vscode from "vscode"

export interface TerminalProcessEvents {
	line: [line: string]
	continue: []
	completed: []
	error: [error: Error]
	no_shell_integration: []
}

// Configurable timeouts through VSCode settings
const getTimeouts = () => ({
	normal: vscode.workspace.getConfiguration('cline.terminal').get('normalTimeout', 2000),
	compiling: vscode.workspace.getConfiguration('cline.terminal').get('compilingTimeout', 15000)
});

// Compilation state detection configuration
const CompilationState = {
	startMarkers: new Set([
		'compiling', 'building', 'bundling',
		'transpiling', 'generating', 'starting'
	]),
	endMarkers: new Set([
		'compiled', 'success', 'finish', 'complete',
		'succeed', 'done', 'end', 'stop', 'exit',
		'terminate', 'error', 'fail'
	]),
	isCompiling(data: string): boolean {
		const loweredData = data.toLowerCase();
		return Array.from(this.startMarkers).some(marker =>
			loweredData.includes(marker.toLowerCase())
		) && !Array.from(this.endMarkers).some(marker =>
			loweredData.includes(marker.toLowerCase())
		);
	}
};

export class TerminalProcess extends EventEmitter<TerminalProcessEvents> {
	waitForShellIntegration: boolean = true
	private isListening: boolean = true
	private buffer: string = ""
	private fullOutput: string = ""
	private lastRetrievedIndex: number = 0
	isHot: boolean = false
	private hotTimer: NodeJS.Timeout | null = null

	async run(terminal: vscode.Terminal, command: string) {
		if (terminal.shellIntegration?.executeCommand) {
			await this.executeWithShellIntegration(terminal, command);
		} else {
			this.executeWithoutShellIntegration(terminal, command);
		}
	}

	private async executeWithShellIntegration(terminal: vscode.Terminal, command: string) {
		const execution = terminal.shellIntegration!.executeCommand!(command);
		const stream = execution.read();

		let isFirstChunk = true;
		let didOutputNonCommand = false;
		let didEmitEmptyLine = false;

		for await (let data of stream) {
			data = this.processChunk(data, isFirstChunk, command, didOutputNonCommand);
			if (data) {
				didOutputNonCommand = true;
			}

			this.updateHotState(data);

			if (!didEmitEmptyLine && !this.fullOutput && data) {
				this.emit("line", "");
				didEmitEmptyLine = true;
			}

			this.fullOutput += data;
			if (this.isListening) {
				this.emitIfEol(data);
				this.lastRetrievedIndex = this.fullOutput.length - this.buffer.length;
			}

			isFirstChunk = false;
		}

		this.emitRemainingBufferIfListening();
		this.clearHotState();
		this.emit("completed");
		this.emit("continue");
	}

	private executeWithoutShellIntegration(terminal: vscode.Terminal, command: string) {
		terminal.sendText(command, true);
		this.emit("completed");
		this.emit("continue");
		this.emit("no_shell_integration");
	}

	private processChunk(data: string, isFirstChunk: boolean, command: string, didOutputNonCommand: boolean): string {
		if (isFirstChunk) {
			data = this.processFirstChunk(data);
		} else {
			data = this.processNonFirstChunk(data);
		}

		if (!didOutputNonCommand) {
			data = this.filterCommandEcho(data, command);
		}

		return data;
	}

	private processFirstChunk(data: string): string {
		// Extract content between VSCode shell integration markers
		const outputBetweenSequences = this.removeLastLineArtifacts(
			data.match(/\]633;C([\s\S]*?)\]633;D/)?.[1] || ""
		).trim();

		// Remove VSCode shell integration sequences
		const vscodeSequenceRegex = /\x1b\]633;.[^\x07]*\x07/g;
		const lastMatch = [...data.matchAll(vscodeSequenceRegex)].pop();
		if (lastMatch?.index !== undefined) {
			data = data.slice(lastMatch.index + lastMatch[0].length);
		}

		// Combine cleaned data
		if (outputBetweenSequences) {
			data = outputBetweenSequences + "\n" + data;
		}

		return this.cleanAndFormatLines(stripAnsi(data), true);
	}

	private processNonFirstChunk(data: string): string {
		return this.cleanAndFormatLines(stripAnsi(data), false);
	}

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
				line = line.replace(/^[^a-zA-Z0-9]*/, "");
			}
			return line;
		});

		return processedLines.join("\n");
	}

	private filterCommandEcho(data: string, command: string): string {
		const lines = data.split("\n");
		const filteredLines = lines.filter(line => !command.includes(line.trim()));
		return filteredLines.join("\n");
	}

	private updateHotState(data: string) {
		this.isHot = true;
		if (this.hotTimer) {
			clearTimeout(this.hotTimer);
		}

		const timeouts = getTimeouts();
		const timeout = CompilationState.isCompiling(data) ?
			timeouts.compiling : timeouts.normal;

		this.hotTimer = setTimeout(() => {
			this.isHot = false;
		}, timeout);
	}

	private clearHotState() {
		if (this.hotTimer) {
			clearTimeout(this.hotTimer);
		}
		this.isHot = false;
	}

	private emitIfEol(chunk: string) {
		this.buffer += chunk;
		let lineEndIndex: number;

		// Normalize line endings
		this.buffer = this.buffer.replace(/\r\n/g, '\n');

		while ((lineEndIndex = this.buffer.indexOf("\n")) !== -1) {
			const line = this.sanitizeLine(this.buffer.slice(0, lineEndIndex));
			this.emit("line", line);
			this.buffer = this.buffer.slice(lineEndIndex + 1);
		}
	}

	private sanitizeLine(line: string): string {
		return line
			.replace(/\r/g, '') // Remove standalone CR
			.replace(/[\x00-\x09\x0B-\x1F\x7F-\uFFFF]/g, '') // Remove control chars
			.trim();
	}

	private emitRemainingBufferIfListening() {
		if (this.buffer && this.isListening) {
			const remainingBuffer = this.removeLastLineArtifacts(this.buffer);
			if (remainingBuffer) {
				this.emit("line", remainingBuffer);
			}
			this.buffer = "";
			this.lastRetrievedIndex = this.fullOutput.length;
		}
	}

	continue() {
		this.emitRemainingBufferIfListening();
		this.isListening = false;
		this.removeAllListeners("line");
		this.emit("continue");
	}

	getUnretrievedOutput(): string {
		const unretrieved = this.fullOutput.slice(this.lastRetrievedIndex);
		this.lastRetrievedIndex = this.fullOutput.length;
		return this.removeLastLineArtifacts(unretrieved);
	}

	removeLastLineArtifacts(output: string): string {
		const lines = output
			.replace(/\r\n/g, '\n')
			.split('\n')
			.map(line => line
				.replace(/\r/g, '')
				.replace(/[%$#>]\s*$/, '')
				.replace(/[\x00-\x09\x0B-\x1F\x7F-\uFFFF]/g, '')
				.trim()
			)
			.filter(line => line.length > 0);

		return lines.join('\n').trimEnd();
	}
}

export type TerminalProcessResultPromise = TerminalProcess & Promise<void>

export function mergePromise(process: TerminalProcess, promise: Promise<void>): TerminalProcessResultPromise {
	const nativePromisePrototype = (async () => {})().constructor.prototype;
	const descriptors = ["then", "catch", "finally"].map(
		(property) => [property, Reflect.getOwnPropertyDescriptor(nativePromisePrototype, property)] as const
	);

	for (const [property, descriptor] of descriptors) {
		if (descriptor) {
			const value = descriptor.value.bind(promise);
			Reflect.defineProperty(process, property, { ...descriptor, value });
		}
	}

	return process as TerminalProcessResultPromise;
}
