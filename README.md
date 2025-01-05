# Recline (fork of Cline)

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

Recline: The autonomous AI assistant that seamlessly integrates with your CLI and editor to create, edit, and run; redefining how you code.

Powered by [Claude 3.5 Sonnet's advanced agentic capabilities](https://www-cdn.anthropic.com/fed9cc193a14b84131812372d8d5857f8f304c52/Model_Card_Claude_3_Addendum.pdf), Recline excels at tackling intricate software development challenges with methodical precision. Through its comprehensive toolkit, Recline can create and modify files, navigate complex projects, interact with web browsers, and execute terminal commands—all with your explicit approval. The integration of the Model Context Protocol (MCP) even enables Recline to expand its own capabilities through custom tools. While traditional autonomous AI systems operate in isolated environments, Recline's human-in-the-loop interface ensures safety and transparency by requiring your approval for every file modification and terminal operation.

1. Simply describe your task and attach relevant images—whether you're converting mockups into functional applications or debugging with screenshots.
2. Recline begins by conducting a thorough analysis of your project structure, examining source code ASTs, performing targeted searches, and reviewing pertinent files. This strategic approach to context management allows Recline to provide valuable assistance even in large, sophisticated projects without overwhelming its context window.
3. Once equipped with the necessary insights, Recline can:
    - Craft and modify files while actively monitoring linter/compiler feedback, enabling autonomous resolution of issues like missing dependencies and syntax errors.
    - Execute and monitor terminal commands in real-time, allowing swift responses to development server issues or other runtime complications.
    - For web-based projects, Recline can navigate sites in a headless browser—clicking, typing, scrolling, and capturing both visual and console output to address runtime errors and visual inconsistencies.
4. Upon task completion, Recline presents the results with a ready-to-use terminal command, such as `open -a "Google Chrome" index.html`, executable with a single click.

> [!TIP]
> Access Recline as a dedicated editor tab by using `CMD/CTRL + Shift + P` and selecting "Recline: Open In New Tab". This enables side-by-side interaction with your file explorer while maintaining clear visibility of workspace modifications.

---

<img align="right" width="340" src="https://github.com/user-attachments/assets/3cf21e04-7ce9-4d22-a7b9-ba2c595e88a4">

### Flexible Model Integration

Recline offers seamless integration with leading API providers including OpenRouter, Anthropic, OpenAI, Google Gemini, AWS Bedrock, Azure, and GCP Vertex. The platform supports any OpenAI-compatible API and accommodates local models through LM Studio/Ollama. OpenRouter users benefit from immediate access to the latest models upon release.

To maintain transparency, Recline meticulously tracks token usage and API costs throughout both the complete task cycle and individual requests, providing real-time insights into resource utilization.

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="left" width="370" src="https://github.com/user-attachments/assets/81be79a8-1fdb-4028-9129-5fe055e01e76">

### Advanced Terminal Integration

Leveraging the enhanced [shell integration capabilities in VSCode v1.93](https://code.visualstudio.com/updates/v1_93#_terminal-shell-integration-api), Recline executes terminal commands with precision while capturing their output. This enables a comprehensive range of operations—from package management and build processes to application deployment, database administration, and test execution—all while adapting seamlessly to your development environment and toolchain.

For ongoing processes like development servers, the "Proceed While Running" feature allows Recline to continue its tasks while monitoring background operations. This continuous awareness of terminal output enables swift responses to emerging issues, such as compilation errors during file modifications.

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="right" width="400" src="https://github.com/user-attachments/assets/c5977833-d9b8-491e-90f9-05f9cd38c588">

### Intelligent File Management

Recline's file manipulation capabilities are presented through an intuitive diff view interface, allowing you to review, modify, or revert changes directly. The system actively monitors for linter and compiler feedback, enabling autonomous resolution of common issues like missing imports or syntax errors.

Every modification is chronicled in your file's Timeline, ensuring complete traceability and the ability to restore previous versions when needed.

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="left" width="370" src="https://github.com/user-attachments/assets/bc2e85ba-dfeb-4fe6-9942-7cfc4703cbe5">

### Browser Integration

Claude 3.5 Sonnet's [Computer Use](https://www.anthropic.com/news/3-5-models-and-computer-use) capabilities empower Recline to operate within web browsers—interacting with elements, inputting text, and capturing both visual and console output. This enables sophisticated debugging, comprehensive testing, and general web interaction capabilities, facilitating autonomous resolution of visual and runtime issues without manual intervention.

Experience this functionality by requesting Recline to "test the app"—watch as it launches your development server, initiates browser interaction, and conducts thorough functionality verification. [View demonstration here.](https://x.com/sdrzn/status/1850880547825823989)

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="right" width="350" src="https://github.com/user-attachments/assets/ac0efa14-5c1f-4c26-a42d-9d7c56f5fadd">

### Extensible Architecture

The [Model Context Protocol](https://github.com/modelcontextprotocol) enables Recline to extend its capabilities through custom tools. While [community-created servers](https://github.com/modelcontextprotocol/servers) are available, Recline excels at crafting tools tailored to your specific workflow. Simply request Recline to "add a tool" and it will manage the entire process—from server creation to extension integration. These custom tools become permanent additions to Recline's capabilities, ready for future use.

Consider these possibilities:
- "add a tool that fetches Jira tickets": Streamline development by directly accessing ticket requirements
- "add a tool that manages AWS EC2s": Monitor and adjust cloud infrastructure dynamically

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="left" width="360" src="https://github.com/user-attachments/assets/7fdf41e6-281a-4b4b-ac19-020b838b6970">

### Context Enhancement Features

**`@url`:**  Import external documentation by providing a URL - automatically converts web content to markdown format, ensuring your documentation stays current.

**`@problems`:** Seamlessly integrate workspace diagnostics from the Problems panel, enabling Recline to provide targeted solutions.

**`@file`:** Efficiently incorporate file contents into your workspace context, with intelligent file search capabilities - eliminates redundant authorization prompts.

**`@folder`:** Optimize your workflow by importing entire directory contents simultaneously, perfect for large-scale context operations.

<details>
<summary>Development Environment Setup</summary>

1. Initialize your local repository _(Note: [git-lfs](https://git-lfs.com/) required)_:
    ```bash
    git clone https://github.com/Recline/Recline.git
    ```
2. Launch the development environment:
    ```bash
    code Recline
    ```
3. Configure dependencies for both extension and webview-gui:
    ```bash
    npm run install:all
    ```
4. Start the development instance: Press `F5` or navigate to `Run -> Start Debugging`. This launches a new VSCode window with your extension loaded.

   Note: If build issues occur, install the [esbuild problem matchers extension](https://marketplace.visualstudio.com/items?itemName=connor4312.esbuild-problem-matchers).

</details>

## License

[Mozilla Public License Version 2.0 © 2025 Jules Mons](./LICENSE.md)  
[Apache 2.0 © 2024 Cline Bot Inc.](./CLINE.LICENSE.md)  

## Attribution

[Cline](https://cline.bot)  
[Recliner Icon](https://thenounproject.com/creator/iconpai19/)  
