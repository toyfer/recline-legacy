import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

interface LineMatch {
  originalStart: number;
  originalEnd: number;
  searchStart: number;
  searchEnd: number;
}

/**
 * A more efficient line matching algorithm that:
 * 1. Only scans through lines once while building an index
 * 2. Uses line hashing for faster comparisons
 * 3. Handles partial matches better
 */
function findBestLineMatch(
  originalLines: string[],
  searchLines: string[],
  startIndex: number
): LineMatch | null {
  // Build a line index from startIndex
  const lineIndex = new Map<string, number[]>();
  for (let i = startIndex; i < originalLines.length; i++) {
    const line = originalLines[i].trim();
    if (!lineIndex.has(line)) {
      lineIndex.set(line, []);
    }
    lineIndex.get(line)!.push(i);
  }

  // Find the best matching sequence
  let bestMatch: LineMatch | null = null;
  let bestScore = 0;

  // Get potential starting positions from first search line
  const firstLine = searchLines[0].trim();
  const startPositions = lineIndex.get(firstLine) || [];

  for (const startPos of startPositions) {
    let matchLength = 0;
    let fuzzyMatches = 0;

    // Try to match subsequent lines
    for (let i = 0; i < searchLines.length && startPos + i < originalLines.length; i++) {
      const originalLine = originalLines[startPos + i].trim();
      const searchLine = searchLines[i].trim();

      if (originalLine === searchLine) {
        matchLength++;
      } else if (originalLine.includes(searchLine) || searchLine.includes(originalLine)) {
        // Allow fuzzy matches with penalty
        fuzzyMatches++;
        matchLength += 0.5;
      } else {
        break;
      }
    }

    const score = matchLength + fuzzyMatches * 0.3;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        originalStart: startPos,
        originalEnd: startPos + searchLines.length,
        searchStart: 0,
        searchEnd: searchLines.length
      };
    }
  }

  return bestMatch;
}

/**
 * Get exact character positions from line numbers
 */
function getCharacterPositions(
  lines: string[],
  start: number,
  end: number
): [number, number] {
  let startChar = 0
  let endChar = 0
  
  for (let i = 0; i < end; i++) {
    if (i < start) {
      startChar += lines[i].length + 1
    }
    endChar += lines[i].length + 1
  }

  return [startChar, endChar]
}

/**
 * A more robust file reconstruction function that:
 * 1. Uses efficient line matching
 * 2. Handles atomic operations
 * 3. Provides better error messages
 * 4. Optimizes for streaming updates
 */
export async function constructNewFileContent(
  diffContent: string,
  originalContent: string,
  isFinal: boolean
): Promise<string> {
  // State tracking
  let result = ""
  let lastProcessedIndex = 0
  let currentSearchContent = ""
  let inSearch = false
  let inReplace = false
  let searchMatchStart = -1
  let searchMatchEnd = -1

  // Split into lines once
  const originalLines = originalContent.split("\n")
  const diffLines = diffContent.split("\n")
  let currentLine = 0

  // Remove partial marker line if present
  if (
    diffLines.length > 0 &&
    (diffLines[diffLines.length - 1].startsWith("<") ||
     diffLines[diffLines.length - 1].startsWith("=") ||
     diffLines[diffLines.length - 1].startsWith(">")) &&
    diffLines[diffLines.length - 1] !== "<<<<<<< SEARCH" &&
    diffLines[diffLines.length - 1] !== "=======" &&
    diffLines[diffLines.length - 1] !== ">>>>>>> REPLACE"
  ) {
    diffLines.pop()
  }

  try {
    while (currentLine < diffLines.length) {
      const line = diffLines[currentLine]

      if (line === "<<<<<<< SEARCH") {
        inSearch = true
        currentSearchContent = ""
        currentLine++
        continue
      }

      if (line === "=======") {
        inSearch = false
        inReplace = true

        // Handle empty search block
        if (!currentSearchContent) {
          if (originalContent.length === 0) {
            // New file
            searchMatchStart = 0
            searchMatchEnd = 0
          } else {
            // Full file replacement
            searchMatchStart = 0 
            searchMatchEnd = originalContent.length
          }
        } else {
          // Find match using line-based algorithm
          const searchLines = currentSearchContent.split("\n")
          if (searchLines[searchLines.length - 1] === "") {
            searchLines.pop()
          }

          const match = findBestLineMatch(originalLines, searchLines, lastProcessedIndex)
          if (!match) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Could not find a match for search block:\n${currentSearchContent.trimEnd()}`
            )
          }

          // Convert line positions to character positions
          [searchMatchStart, searchMatchEnd] = getCharacterPositions(
            originalLines,
            match.originalStart,
            match.originalEnd
          )
        }

        // Output content up to match
        result += originalContent.slice(lastProcessedIndex, searchMatchStart)
        currentLine++
        continue
      }

      if (line === ">>>>>>> REPLACE") {
        // Reset state and advance processed index
        inSearch = false
        inReplace = false
        lastProcessedIndex = searchMatchEnd
        currentSearchContent = ""
        searchMatchStart = -1
        searchMatchEnd = -1
        currentLine++
        continue
      }

      // Accumulate content
      if (inSearch) {
        currentSearchContent += line + "\n"
      } else if (inReplace && searchMatchStart !== -1) {
        result += line + "\n"
      }

      currentLine++
    }

    // Append remaining content for final update
    if (isFinal && lastProcessedIndex < originalContent.length) {
      result += originalContent.slice(lastProcessedIndex)
    }

    return result
  } catch (error) {
    // Ensure errors are properly typed
    if (error instanceof McpError) {
      throw error
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Error processing diff: ${error.message}`
    )
  }
}