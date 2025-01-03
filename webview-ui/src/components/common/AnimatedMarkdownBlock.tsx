import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import MarkdownBlock from './MarkdownBlock';

const AnimatedContainer = styled.div<{ isPartial: boolean }>`
  .markdown-line {
    position: relative;
    opacity: 0;
    transform: translate(-4px, 2px);
    animation: revealText 0.25s cubic-bezier(0.2, 0.6, 0.35, 1) forwards;
  }

  .markdown-line:not(:first-child) {
    margin-top: 3px;
  }

  @keyframes revealText {
    from {
      opacity: 0;
      transform: translate(-4px, 2px);
    }
    to {
      opacity: 1;
      transform: translate(0, 0);
    }
  }

  ${props => props.isPartial && `
    &::after {
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

interface AnimatedMarkdownBlockProps {
  markdown?: string;
  isPartial?: boolean;
}

const AnimatedMarkdownBlock: React.FC<AnimatedMarkdownBlockProps> = ({ markdown, isPartial = false }) => {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (markdown) {
      // Split the markdown into lines while preserving code blocks
      const newLines: string[] = [];
      let currentBlock = '';
      let inCodeBlock = false;

      markdown.split('\n').forEach((line) => {
        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          currentBlock += line + '\n';
          if (!inCodeBlock) {
            newLines.push(currentBlock);
            currentBlock = '';
          }
        } else if (inCodeBlock) {
          currentBlock += line + '\n';
        } else {
          newLines.push(line);
        }
      });

      if (currentBlock) {
        newLines.push(currentBlock);
      }

      setLines(newLines);
    }
  }, [markdown]);

  // Use a timestamp-based key to force re-render on content updates
  const [renderKey, setRenderKey] = useState(Date.now());
  useEffect(() => {
    setRenderKey(Date.now());
  }, [markdown]);

  return (
    <AnimatedContainer isPartial={isPartial}>
      {lines.map((line, index) => (
        <div
          key={`${renderKey}-${index}`}
          className="markdown-line"
          style={{
            animationDelay: `${Math.min(index * 25, 200)}ms`,
            whiteSpace: 'pre-wrap'
          }}>
          <MarkdownBlock markdown={line} />
        </div>
      ))}
    </AnimatedContainer>
  );
};

export default AnimatedMarkdownBlock;
