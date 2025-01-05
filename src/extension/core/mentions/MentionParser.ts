import type { Mention } from "./types";

import { InvalidMentionError, MentionType } from "./types";


/**
 * Regex for matching mentions while avoiding TypeScript path aliases:
 * - Negative lookbehind (?<!from\s|import\s) prevents matching after import statements
 * - Negative lookbehind (?<!["']\s*) prevents matching inside string literals in imports
 * - Standard mention pattern remains the same for files, folders, problems, and URLs
 */
const MENTION_REGEX = /(?<!from\s|import\s|["']\s*)@((?:\/|\w+:\/\/)\S+?|problems\b)(?=[.,;:!?]?(?:\s|$))/g;

/**
 * Handles parsing and validation of mentions in text
 */
export class MentionParser {
  /**
   * Creates a structured Mention object from a raw mention string
   */
  private static createMention(value: string, raw: string): Mention {
    if (!value) {
      throw new InvalidMentionError("Empty mention value");
    }

    // URL mention
    if (value.startsWith("http")) {
      return {
        type: MentionType.Url,
        value,
        raw
      };
    }

    // File system mention
    if (value.startsWith("/")) {
      const mentionPath = value.slice(1);
      return {
        type: mentionPath.endsWith("/") ? MentionType.Folder : MentionType.File,
        value: mentionPath,
        raw
      };
    }

    // Problems mention
    if (value === "problems") {
      return {
        type: MentionType.Problems,
        value,
        raw
      };
    }

    throw new InvalidMentionError(`Invalid mention format: ${value}`);
  }

  /**
   * Parses all mentions from the given text
   */
  public static parseMentions(text: string): Mention[] {
    const mentions: Mention[] = [];
    const matches = text.matchAll(MENTION_REGEX);

    for (const match of matches) {
      try {
        const mention = MentionParser.createMention(match[1], match[0]);
        mentions.push(mention);
      }
      catch (error) {
        if (error instanceof InvalidMentionError) {
          console.warn(`Skipping invalid mention: ${error.message}`);
        }
        else {
          throw error;
        }
      }
    }

    return mentions;
  }

  /**
   * Replaces mentions in text with a more readable format
   */
  public static replaceMentionsWithLabels(text: string): string {
    return text.replace(MENTION_REGEX, (match, mention) => {
      if (mention.startsWith("http")) {
        return `'${mention}' (see below for site content)`;
      }
      else if (mention.startsWith("/")) {
        const mentionPath = mention.slice(1);
        return mentionPath.endsWith("/")
          ? `'${mentionPath}' (see below for folder content)`
          : `'${mentionPath}' (see below for file content)`;
      }
      else if (mention === "problems") {
        return `Workspace Problems (see below for diagnostics)`;
      }
      return match;
    });
  }
}
