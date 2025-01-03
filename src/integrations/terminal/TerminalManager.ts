import pWaitFor from "p-wait-for"
import * as vscode from "vscode"
import { arePathsEqual } from "../../utils/path"
import { mergePromise, TerminalProcess, TerminalProcessResultPromise } from "./TerminalProcess"
import { TerminalInfo, TerminalRegistry } from "./TerminalRegistry"
import "./types"

const SHELL_INTEGRATION_TIMEOUT = 4000
const MIN_VSCODE_VERSION_WITH_SHELL = "1.93.0"

export class TerminalManager {
	private terminalIds: Set<number> = new Set()
	private processes: Map<number, TerminalProcess> = new Map()
	private disposables: vscode.Disposable[] = []
	private readonly registry = TerminalRegistry.getInstance()
	private shellIntegrationSupported: boolean

	constructor() {
		this.shellIntegrationSupported = this.checkShellIntegrationSupport()
		this.setupShellIntegrationHandler()
	}

	private checkShellIntegrationSupport(): boolean {
		const version = vscode.version
		return version >= MIN_VSCODE_VERSION_WITH_SHELL
	}

	private setupShellIntegrationHandler(): void {
		if (!this.shellIntegrationSupported) {
			return
		}

		try {
			const disposable = (vscode.window as vscode.Window).onDidStartTerminalShellExecution?.(
				async (e) => e?.execution?.read()
			)
			if (disposable) {
				this.disposables.push(disposable)
			}
		} catch (error) {
			console.warn("Shell integration setup failed:", error)
		}
	}

	runCommand(terminalInfo: TerminalInfo, command: string): TerminalProcessResultPromise {
		terminalInfo.busy = true
		terminalInfo.lastCommand = command

		const process = new TerminalProcess()
		this.processes.set(terminalInfo.id, process)

		this.setupProcessListeners(process, terminalInfo)
		this.executeCommand(process, terminalInfo, command)

		const promise = this.createProcessPromise(process)
		return mergePromise(process, promise)
	}

	private setupProcessListeners(process: TerminalProcess, terminalInfo: TerminalInfo): void {
		process.once("completed", () => {
			terminalInfo.busy = false
		})

		process.once("no_shell_integration", () => {
			this.handleNoShellIntegration(terminalInfo.id)
		})
	}

	private handleNoShellIntegration(terminalId: number): void {
		console.warn(`Shell integration not available for terminal ${terminalId}`)
		this.registry.removeTerminal(terminalId)
		this.terminalIds.delete(terminalId)
		this.processes.delete(terminalId)
	}

	private createProcessPromise(process: TerminalProcess): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			process.once("continue", resolve)
			process.once("error", (error) => {
				console.error("Terminal process error:", error)
				reject(error)
			})
		})
	}

	private async executeCommand(
		process: TerminalProcess,
		terminalInfo: TerminalInfo,
		command: string
	): Promise<void> {
		if (terminalInfo.terminal.shellIntegration) {
			process.waitForShellIntegration = false
			process.run(terminalInfo.terminal, command)
			return
		}

		try {
			await pWaitFor(
				() => terminalInfo.terminal.shellIntegration !== undefined,
				{ timeout: SHELL_INTEGRATION_TIMEOUT }
			)
		} catch (error) {
			console.warn("Shell integration timeout:", error)
		} finally {
			const currentProcess = this.processes.get(terminalInfo.id)
			if (currentProcess?.waitForShellIntegration) {
				currentProcess.waitForShellIntegration = false
				currentProcess.run(terminalInfo.terminal, command)
			}
		}
	}

	async getOrCreateTerminal(cwd: string): Promise<TerminalInfo> {
		const availableTerminal = this.findAvailableTerminal(cwd)
		if (availableTerminal) {
			this.terminalIds.add(availableTerminal.id)
			return availableTerminal
		}

		const newTerminalInfo = this.registry.createTerminal(cwd)
		this.terminalIds.add(newTerminalInfo.id)
		return newTerminalInfo
	}

	private findAvailableTerminal(cwd: string): TerminalInfo | undefined {
		return this.registry.getAllTerminals().find((terminal: TerminalInfo) => {
			if (terminal.busy) {return false}

			const terminalCwd = terminal.terminal.shellIntegration?.cwd
			if (!terminalCwd) {return false}

			return arePathsEqual(vscode.Uri.file(cwd).fsPath, terminalCwd.fsPath)
		})
	}

	getTerminals(busy: boolean): Array<{ id: number; lastCommand: string }> {
		return Array.from(this.terminalIds)
			.map(id => this.registry.getTerminal(id))
			.filter((t): t is TerminalInfo => t !== undefined && t.busy === busy)
			.map(({ id, lastCommand }) => ({ id, lastCommand }))
	}

	getUnretrievedOutput(terminalId: number): string {
		if (!this.terminalIds.has(terminalId)) {
			return ""
		}
		return this.processes.get(terminalId)?.getUnretrievedOutput() ?? ""
	}

	isProcessHot(terminalId: number): boolean {
		return this.processes.get(terminalId)?.isHot ?? false
	}

	disposeAll(): void {
		this.terminalIds.clear()
		this.processes.clear()
		this.disposables.forEach(disposable => disposable.dispose())
		this.disposables = []
	}
}
