import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import MarkdownBlock from './MarkdownBlock';

const AnimatedContainer = styled.div<{ isPartial: boolean }>`
  .markdown-line {
    position: relative;
    margin-top: 3px;
    min-height: 1.2em;
  }

  .markdown-line:first-child {
    margin-top: 0;
  }

  .markdown-line.code-block {
    margin-top: 0;
  }

  .markdown-line.animating {
    opacity: 0;
    transform: translate(-8px, 4px);
    animation: revealText 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    will-change: transform, opacity;
  }

  @keyframes revealText {
    0% {
      opacity: 0;
      transform: translate(-8px, 4px);
    }
    50% {
      opacity: 0.7;
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
      animation: blink 1s step-start infinite;
      opacity: 0.7;
      margin-left: 2px;
    }

    @keyframes blink {
      50% { opacity: 0; }
    }
  `}
`;

interface MarkdownLine {
  text: string;
  isCodeBlock: boolean;
}

interface AnimatedMarkdownBlockProps {
  markdown?: string;
  isPartial?: boolean;
}

const AnimatedMarkdownBlock: React.FC<AnimatedMarkdownBlockProps> = ({ markdown, isPartial = false }) => {
  const [lines, setLines] = useState<MarkdownLine[]>([]);

  useEffect(() => {
    if (markdown) {
      const newLines: Array<{ text: string; isCodeBlock: boolean }> = [];
      let currentBlock = '';
      let inCodeBlock = false;

      markdown.split('\n').forEach((line, idx, arr) => {
        if (line.startsWith('```')) {
          if (!inCodeBlock) {
            // Start of code block
            inCodeBlock = true;
            currentBlock = line + '\n';
          } else {
            // End of code block
            currentBlock += line;
            newLines.push({ text: currentBlock, isCodeBlock: true });
            currentBlock = '';
            inCodeBlock = false;
          }
        } else if (inCodeBlock) {
          currentBlock += line + '\n';
        } else if (line.trim() === '') {
          // Preserve empty lines outside code blocks
          newLines.push({ text: '', isCodeBlock: false });
        } else {
          newLines.push({ text: line, isCodeBlock: false });
        }

        // Handle unclosed code block at end of input
        if (inCodeBlock && idx === arr.length - 1) {
          newLines.push({ text: currentBlock, isCodeBlock: true });
        }
      });

      setLines(newLines);
    }
  }, [markdown]);

  const [shouldAnimate, setShouldAnimate] = useState(true);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    // Only animate if we're getting new content while streaming
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
          <MarkdownBlock markdown={line.text} />
        </div>
      ))}
    </AnimatedContainer>
  );
};

export default AnimatedMarkdownBlock;
