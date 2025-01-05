export function USER_SYSTEM_PROMPT(settingsCustomInstructions?: string, reclineRulesFileInstructions?: string): string {
  return `====

ADDITIONAL INSTRUCTIONS

In addition to all previously specified instructions, the following instructions are provided by the user:

${settingsCustomInstructions}
${reclineRulesFileInstructions}

`;
}
