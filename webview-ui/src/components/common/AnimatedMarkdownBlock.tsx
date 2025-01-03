import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import MarkdownBlock from './MarkdownBlock';

const AnimatedContainer = styled.div<{ isPartial: boolean }>`
  .markdown-line {
    opacity: 0;
    transform: translateY(10px);
    animation: revealText 0.3s ease forwards;
  }

  @keyframes revealText {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Add a subtle typing cursor effect when streaming */
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

  return (
    <AnimatedContainer isPartial={isPartial}>
      {lines.map((line, index) => (
        <div
          key={index}
          className="markdown-line"
          style={{
            animationDelay: `${index * 50}ms`,
            whiteSpace: 'pre-wrap'
          }}>
          <MarkdownBlock markdown={line} />
        </div>
      ))}
    </AnimatedContainer>
  );
};

export default AnimatedMarkdownBlock;
