import * as vscode from "vscode"

export interface TerminalInfo {
	terminal: vscode.Terminal
	busy: boolean
	lastCommand: string
	id: number
}

export class TerminalRegistry {
	private static instance: TerminalRegistry
	private terminals: Map<number, TerminalInfo> = new Map()
	private idCounter: number = 1

	private constructor() {}

	static getInstance(): TerminalRegistry {
		if (!TerminalRegistry.instance) {
			TerminalRegistry.instance = new TerminalRegistry()
		}
		return TerminalRegistry.instance
	}

	createTerminal(cwd?: string | vscode.Uri): TerminalInfo {
		const terminal = vscode.window.createTerminal({
			cwd,
			name: "Cline",
			iconPath: new vscode.ThemeIcon("robot"),
		})

		const id = this.generateTerminalId()
		const info: TerminalInfo = {
			terminal,
			busy: false,
			lastCommand: "",
			id
		}

		this.terminals.set(id, info)
		return info
	}

	getTerminal(id: number): TerminalInfo | undefined {
		const info = this.terminals.get(id)
		if (info && this.isTerminalClosed(info.terminal)) {
			this.removeTerminal(id)
			return undefined
		}
		return info
	}

	updateTerminal(id: number, updates: Partial<TerminalInfo>): void {
		const terminal = this.getTerminal(id)
		if (terminal) {
			Object.assign(terminal, updates)
			this.terminals.set(id, terminal)
		}
	}

	removeTerminal(id: number): void {
		this.terminals.delete(id)
	}

	getAllTerminals(): TerminalInfo[] {
		// Filter out closed terminals in one pass and convert to array
		return Array.from(this.terminals.values()).filter(info => {
			const isActive = !this.isTerminalClosed(info.terminal)
			if (!isActive) {
				this.removeTerminal(info.id)
			}
			return isActive
		})
	}

	private generateTerminalId(): number {
		return this.idCounter++
	}

	private isTerminalClosed(terminal: vscode.Terminal): boolean {
		return terminal.exitStatus !== undefined
	}
}
