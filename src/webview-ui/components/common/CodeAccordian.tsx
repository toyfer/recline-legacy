import { memo, useEffect, useMemo, useState } from "react";

import { getLanguageFromPath } from "@webview-ui/utils/getLanguageFromPath";

import CodeBlock, { CODE_BLOCK_BG_COLOR } from "./CodeBlock";


interface CodeAccordianProps {
  code?: string;
  diff?: string;
  language?: string | undefined;
  path?: string;
  isFeedback?: boolean;
  isConsoleLogs?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading?: boolean;
  isStreaming?: boolean; // Indicates if this content is being actively streamed
}

const HOT_DURATION_MS = 3000; // How long the accordion stays "hot" after receiving new content

const shimmerStyles = {
  background: `linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(255, 255, 255, 0) 100%
  )`,
  backgroundSize: "1000px 100%",
  animation: "shimmer 2s infinite linear"
};

// Define shimmer animation keyframes
const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}
`;

// Add keyframes to document
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}

/*
We need to remove leading non-alphanumeric characters from the path in order for our leading ellipses trick to work.
^: Anchors the match to the start of the string.
[^a-zA-Z0-9]+: Matches one or more characters that are not alphanumeric.
The replace method removes these matched characters, effectively trimming the string up to the first alphanumeric character.
*/
export function removeLeadingNonAlphanumeric(path: string): string {
  if (!path)
    return "";
  return path.replace(/^[^a-z0-9]+/i, "");
}

function CodeAccordian({
  code,
  diff,
  language,
  path,
  isFeedback,
  isConsoleLogs,
  isExpanded,
  onToggleExpand,
  isLoading,
  isStreaming
}: CodeAccordianProps): React.ReactElement {
  const [isHot, setIsHot] = useState<boolean>(false);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());

  // Monitor code changes to detect new chunks
  useEffect(() => {
    if (code && isStreaming) {
      setLastUpdateTimestamp(Date.now());
      setIsHot(true);
    }
  }, [code, isStreaming]);

  // Control hot state duration
  useEffect(() => {
    if (isHot) {
      const timeout = setTimeout(() => {
        setIsHot(false);
      }, HOT_DURATION_MS);
      return () => clearTimeout(timeout);
    }
  }, [isHot, lastUpdateTimestamp]);
  const inferredLanguage = useMemo(
    () => {
      if (!code)
        return undefined;
      if (language)
        return language;
      if (!path)
        return undefined;
      return getLanguageFromPath(path);
    },
    [path, language, code]
  );

  return (
    <div
      style={{
        borderRadius: 3,
        backgroundColor: CODE_BLOCK_BG_COLOR,
        position: "relative",
        ...(isHot && !isExpanded ? shimmerStyles : {}),
        overflow: "hidden", // This ensures the inner scrollable area doesn't overflow the rounded corners
        border: "1px solid var(--vscode-editorGroup-border)"
      }}
    >
      {(path || isFeedback || isConsoleLogs) && (
        <div
          style={{
            color: "var(--vscode-descriptionForeground)",
            display: "flex",
            alignItems: "center",
            padding: "9px 10px",
            cursor: isLoading ? "wait" : "pointer",
            opacity: isLoading ? 0.7 : 1,
            // pointerEvents: isLoading ? "none" : "auto",
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none"
          }}
          onClick={isLoading ? undefined : onToggleExpand}
        >
          {isFeedback || isConsoleLogs ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                className={`codicon codicon-${
                  isFeedback
                    ? "feedback"
                    : "output"
                }`}
                style={{ marginRight: "6px" }}
              >
              </span>
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginRight: "8px"
                }}
              >
                {isFeedback ? "User Edits" : "Console Logs"}
              </span>
            </div>
          ) : (
            <>
              {path && path.startsWith(".") && <span>.</span>}
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginRight: "8px",
                  // trick to get ellipsis at beginning of string
                  direction: "rtl",
                  textAlign: "left"
                }}
              >
                {`${removeLeadingNonAlphanumeric(path ?? "")}\u200E`}
              </span>
            </>
          )}
          <div style={{ flexGrow: 1 }}></div>
          <span className={`codicon codicon-chevron-${isExpanded ? "up" : "down"}`}></span>
        </div>
      )}
      {(!(path || isFeedback || isConsoleLogs) || isExpanded) && (
        <div
          // className="code-block-scrollable" this doesn't seem to be necessary anymore, on silicon macs it shows the native mac scrollbar instead of the vscode styled one
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            maxWidth: "100%"
          }}
        >
          <CodeBlock
            source={`${"```"}${diff !== undefined ? "diff" : inferredLanguage}\n${(
              code
              ?? diff
              ?? ""
            ).trim()}\n${"```"}`}
          />
        </div>
      )}
    </div>
  );
}

// memo does shallow comparison of props, so if you need it to re-render when a nested object changes, you need to pass a custom comparison function
export default memo(CodeAccordian);
