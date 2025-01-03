import React, { useEffect, useState, useRef, memo } from 'react';
import styled from 'styled-components';
import { useRemark } from "react-remark"
import rehypeHighlight, { Options } from "rehype-highlight"
import { visit } from "unist-util-visit"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { CODE_BLOCK_BG_COLOR } from "./CodeBlock"

const AnimatedContainer = styled.div<{ isPartial: boolean }>`
  .markdown-line {
    position: relative;
    margin-top: 3px;
    min-height: 1.2em;
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.3s ease-out, transform 0.3s ease-out;
  }

  .markdown-line:first-child {
    margin-top: 0;
  }

  .markdown-line.code-block {
    margin-top: 0;
  }

  .markdown-line.animating {
    opacity: 0;
    transform: translate(-8px, 8px);
    animation: revealText 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    will-change: transform, opacity;
  }

  @keyframes revealText {
    0% {
      opacity: 0;
      transform: translate(-8px, 8px);
    }
    50% {
      opacity: 0.7;
      transform: translate(-4px, 4px);
    }
    100% {
      opacity: 1;
      transform: translate(0, 0);
    }
  }

  ${props => props.isPartial && `
    .markdown-line:last-child:not(.code-block)::after {
      content: '▋';
      display: inline-block;
      vertical-align: middle;
      opacity: 0.7;
      margin-left: 2px;
      transform-origin: center;
      animation: blink 1s step-start infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 0; }
      50% { opacity: 0.7; }
    }
  `}
`;

const StyledMarkdown = styled.div`
  pre {
    background-color: ${CODE_BLOCK_BG_COLOR};
    border-radius: 3px;
    margin: 13x 0;
    padding: 10px 10px;
    max-width: calc(100vw - 20px);
    overflow-x: auto;
    overflow-y: hidden;
  }

  pre > code {
    .hljs-deletion {
      background-color: var(--vscode-diffEditor-removedTextBackground);
      display: inline-block;
      width: 100%;
    }
    .hljs-addition {
      background-color: var(--vscode-diffEditor-insertedTextBackground);
      display: inline-block;
      width: 100%;
    }
  }

  code {
    span.line:empty {
      display: none;
    }
    word-wrap: break-word;
    border-radius: 3px;
    background-color: ${CODE_BLOCK_BG_COLOR};
    font-size: var(--vscode-editor-font-size, var(--vscode-font-size, 12px));
    font-family: var(--vscode-editor-font-family);
  }

  code:not(pre > code) {
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--vscode-textPreformat-foreground, #f78383);
    background-color: var(--vscode-textCodeBlock-background, #1e1e1e);
    padding: 0px 2px;
    border-radius: 3px;
    border: 1px solid var(--vscode-textSeparator-foreground, #424242);
    white-space: pre-line;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  font-family:
    var(--vscode-font-family),
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    "Open Sans",
    "Helvetica Neue",
    sans-serif;
  font-size: var(--vscode-font-size, 13px);

  p,
  li,
  ol,
  ul {
    line-height: 1.1;
    margin: 0;
  }

  ol,
  ul {
    padding-left: 2.5em;
    margin-left: 0;
  }

  p {
    white-space: pre-wrap;
    margin: 0;
  }

  a {
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  /* Remove default margins between elements */
  * {
    margin-top: 0;
    margin-bottom: 0;
  }
`;

const StyledPre = styled.pre<{ theme: any }>`
  & .hljs {
    color: var(--vscode-editor-foreground, #fff);
  }

  ${(props) =>
    Object.keys(props.theme)
      .map((key) => `
        & ${key} {
          color: ${props.theme[key]};
        }
      `)
      .join("")}
`;

const remarkUrlToLink = () => {
  return (tree: any) => {
    visit(tree, "text", (node: any, index, parent) => {
      const urlRegex = /https?:\/\/[^\s<>)"]+/g
      const matches = node.value.match(urlRegex)
      if (!matches) return

      const parts = node.value.split(urlRegex)
      const children: any[] = []

      parts.forEach((part: string, i: number) => {
        if (part) children.push({ type: "text", value: part })
        if (matches[i]) {
          children.push({
            type: "link",
            url: matches[i],
            children: [{ type: "text", value: matches[i] }],
          })
        }
      })

      if (parent) {
        parent.children.splice(index, 1, ...children)
      }
    })
  }
}

interface MarkdownLine {
  text: string;
  isCodeBlock: boolean;
}

interface AnimatedMarkdownBlockProps {
  markdown?: string;
  isPartial?: boolean;
}

const AnimatedMarkdownInner = memo(({ line }: { line: string }) => {
  const { theme } = useExtensionState()
  const [reactContent, setMarkdown] = useRemark({
    remarkPlugins: [
      remarkUrlToLink,
      () => {
        return (tree) => {
          visit(tree, "code", (node: any) => {
            if (!node.lang) {
              node.lang = "javascript"
            } else if (node.lang.includes(".")) {
              node.lang = node.lang.split(".").slice(-1)[0]
            }
          })
        }
      },
    ],
    rehypePlugins: [
      rehypeHighlight as any,
      {
      } as Options,
    ],
    rehypeReactOptions: {
      components: {
        pre: ({ node, ...preProps }: any) => <StyledPre {...preProps} theme={theme} />,
      },
    },
  })

  useEffect(() => {
    setMarkdown(line || "")
  }, [line, setMarkdown, theme])

	return (
		<div style={{}}>
			<StyledMarkdown>{reactContent}</StyledMarkdown>
		</div>
	)
})

const AnimatedMarkdownBlock: React.FC<AnimatedMarkdownBlockProps> = ({ markdown, isPartial = false }) => {
  const [lines, setLines] = useState<MarkdownLine[]>([]);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (markdown) {
      const newLines: Array<{ text: string; isCodeBlock: boolean }> = [];
      let currentBlock = '';
      let inCodeBlock = false;

      markdown.split('\n').forEach((line, idx, arr) => {
        if (line.startsWith('```')) {
          if (!inCodeBlock) {
            inCodeBlock = true;
            currentBlock = line + '\n';
          } else {
            currentBlock += line;
            newLines.push({ text: currentBlock, isCodeBlock: true });
            currentBlock = '';
            inCodeBlock = false;
          }
        } else if (inCodeBlock) {
          currentBlock += line + '\n';
        } else if (line.trim() === '') {
          newLines.push({ text: '', isCodeBlock: false });
        } else {
          newLines.push({ text: line, isCodeBlock: false });
        }

        if (inCodeBlock && idx === arr.length - 1) {
          newLines.push({ text: currentBlock, isCodeBlock: true });
        }
      });

      setLines(newLines);
    }
  }, [markdown]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setShouldAnimate(isPartial);
  }, [markdown, isPartial]);

  return (
    <AnimatedContainer isPartial={isPartial}>
      {lines.map((line, index) => (
        <div
          key={`${line.text}-${index}`}
          className={`markdown-line ${line.isCodeBlock ? 'code-block' : ''} ${shouldAnimate ? 'animating' : ''}`}
          style={{
            animationDelay: `${Math.min(index * 30, 400)}ms`,
            whiteSpace: 'pre-wrap',
            backfaceVisibility: 'hidden'
          }}>
          <AnimatedMarkdownInner line={line.text} />
        </div>
      ))}
    </AnimatedContainer>
  );
};

export default memo(AnimatedMarkdownBlock);
