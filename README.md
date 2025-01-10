# Recline (a fork of [Cline](https://github.com/cline/cline))

<div align="center">
<table>
<tbody>
<td align="center">
<a href="https://marketplace.visualstudio.com/items?itemName=julesmons.recline" target="_blank"><strong>Download on VS Marketplace</strong></a>
</td>
<td align="center">
<a href="https://github.com/julesmons/recline" target="_blank"><strong>Fork on GitHub</strong></a>
</td>
</tbody>
</table>
</div>

**Recline** is your AI-powered coding sidekick that works directly within your CLI and editor to create, edit, and run code like never before.
Recline aims to redefine the way you code — smarter, faster, and more efficiently.

This project is a fork of [Cline](https://github.com/cline/cline). While Recline builds upon the foundation laid by Cline, it sets itself apart through extensive rewrites and a comprehensive restructuring of the original codebase.
These enhancements attempt to make Cline/Recline more stable, more performant, and better suited for today’s development needs.

Powered by the cutting-edge [Claude 3.5 Sonnet](https://www-cdn.anthropic.com/fed9cc193a14b84131812372d8d5857f8f304c52/Model_Card_Claude_3_Addendum.pdf), Recline is equipped to handle complex software tasks with precision and ease.
Whether you need to create or modify files, navigate projects, execute terminal commands, or even browse the web — Recline has got your back. And don’t worry, you’re always in control — as every action requires your approval.

> [!IMPORTANT]  
> Due to no suitable NPM packages providing fd and ripgrep prebuilts, you'll need to install ripgrep (as rg) and fd (as fd) on your system.
> 
> - https://github.com/sharkdp/fd?tab=readme-ov-file#installation 
> - https://github.com/BurntSushi/ripgrep?tab=readme-ov-file#installation 

### Why Choose Recline?

1. **Tell Recline What You Need:** Just describe your task. Whether you’re turning mockups into working code or debugging with screenshots, Recline gets to work.
2. **Deep Project Understanding:** Recline examines your project structure, source code, and relevant files to get the context it needs—even for large, complex projects.
3. **Get Things Done:**
    - Create and edit files, fixing issues like missing dependencies or syntax errors on the fly.
    - Run terminal commands and monitor their outputs to resolve runtime issues quickly.
    - For web projects, interact with a headless browser to test functionality and debug visual inconsistencies.
4. **Clear Results, Ready for Action:** Recline wraps up tasks with clear outputs and ready-to-run commands—one click, and you’re good to go.

> **Pro Tip:** Open Recline in its own tab by hitting `CMD/CTRL + Shift + P` and selecting "Recline: Open In New Tab" for a focused workspace.

---

### What Makes Recline Special?

#### Flexible Model Integration
Recline works seamlessly with popular APIs like OpenRouter, Anthropic, OpenAI, Google Gemini, AWS Bedrock, Azure, and GCP Vertex. It even supports local models via LM Studio/Ollama. And with OpenRouter, you’re always up-to-date with the latest models.

Stay in the loop with real-time tracking of token usage and API costs, giving you full transparency into your resources.

#### Advanced Terminal Integration
Using [VSCode’s enhanced shell API](https://code.visualstudio.com/updates/v1_93#_terminal-shell-integration-api), Recline runs terminal commands precisely and captures output. From managing packages to deploying applications and running tests, Recline adapts to your tools and workflows effortlessly.

Got a long-running process like a dev server? The "Proceed While Running" feature ensures Recline keeps working while monitoring your background tasks.

#### Intelligent File Management
Recline’s file editor isn’t just smart—it’s intuitive. Review, tweak, or revert changes using the diff view. Recline actively resolves common issues like missing imports or syntax errors by monitoring compiler feedback.

Every change is logged in the file timeline, giving you full traceability and the option to roll back when needed.

#### Browser Integration
Take web project testing to the next level. Recline uses Claude 3.5 Sonnet’s [Computer Use](https://www.anthropic.com/news/3-5-models-and-computer-use) capabilities to interact with websites, debug visual issues, and verify functionality—all autonomously. Just ask Recline to "test the app" and watch it in action.

[Check out a demo here!](https://x.com/sdrzn/status/1850880547825823989)

#### Extensible Architecture
With the [Model Context Protocol](https://github.com/modelcontextprotocol), you can extend Recline’s functionality with custom tools. Recline can even help you build these tools! Just say "add a tool," and Recline will set up everything from the server to the integration.

Some cool ideas to try:
- "Add a tool that fetches Jira tickets."
- "Add a tool that manages AWS EC2s."

#### Context Enhancement Features
- **`@url`**: Import external documentation into your project as markdown.
- **`@problems`**: Pull diagnostics directly from the Problems panel for faster troubleshooting.
- **`@file`**: Add file contents to your workspace without extra prompts.
- **`@folder`**: Import entire directories at once for large-scale operations.

---

## Installing

Eventually Recline will be released on the VSCode Marketplace.
However; This project is currently in a very experimental state.
For instance, the changes to Cline's core have not been battle-tested yet.

To install Recline you'll need to manually build the extension and install directly from VSIX.

### 1. Clone the repository:
  ```bash
  git clone https://github.com/julesmons/recline.git
  ```
  ```bash
  cd ./recline
  ```
### 2. Install dependencies
  > [!IMPORTANT]  
  > Recline does **NOT** use Cline's `npm run install:all` and requires [PNPM](https://pnpm.io/installation) to be installed.
  ```bash
  pnpm install
  ```
### 3. Package as VSIX 
  > [!IMPORTANT]  
  > Make sure you've installed [@vscode/vsce](https://www.npmjs.com/package/@vscode/vsce) globally
  ```bash
  pnpm run package
  ```
### 4. Install the extension into VSCode
  > [!NOTE]  
  > Version number will differ based on the actual version in `./package.json`
  ```bash
  code --install-extension ./recline-0.2.11.vsix
  ```
### 5. Recline! 🎉

---

## Contributing

<details>
<summary>How to Set Up Your Development Environment</summary>

1. Clone the repository:
    ```bash
    git clone https://github.com/julesmons/recline.git
    ```
2. Open the project in VSCode:
    ```bash
    code recline
    ```
3. Install dependencies for both the extension and the webview GUI:
    ```bash
    pnpm install
    ```
4. Start a development instance:
    - Press `F5` or go to `Run -> Start Debugging` to launch a new VSCode window with Recline loaded.

</details>

---

## License

[Mozilla Public License Version 2.0 © 2025 Jules Mons](./LICENSE.md)  
[Apache 2.0 © 2024 Cline Bot Inc.](./CLINE.LICENSE.md)

---

## Attribution

[Cline](https://cline.bot)  
[Recliner Icon](https://thenounproject.com/creator/iconpai19/)
