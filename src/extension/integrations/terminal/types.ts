export interface TerminalProcessEvents {
  line: [line: string];
  continue: [];
  completed: [];
  error: [error: Error];
  no_shell_integration: [];
}
