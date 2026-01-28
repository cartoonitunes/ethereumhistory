"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const components: Components = {
    p: ({ children }) => (
      <p className="text-obsidian-300 leading-relaxed mb-4">{children}</p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ether-400 hover:text-ether-300 underline transition-colors"
      >
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong className="text-obsidian-300 font-semibold">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="text-obsidian-300 italic">{children}</em>
    ),
    code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode; [key: string]: any }) => {
      if (inline) {
        return (
          <code
            className="font-mono text-sm bg-obsidian-900/50 text-obsidian-200 px-1.5 py-0.5 rounded"
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className="block font-mono text-sm bg-obsidian-950 text-obsidian-200 p-4 rounded-lg border border-obsidian-800 overflow-x-auto"
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-obsidian-950 border border-obsidian-800 rounded-lg p-4 overflow-x-auto mb-4">
        {children}
      </pre>
    ),
    h1: ({ children }) => (
      <h1 className="text-lg font-medium text-obsidian-300 mt-6 mb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-medium text-obsidian-300 mt-6 mb-2">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-medium text-obsidian-300 mt-6 mb-2">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-medium text-obsidian-300 mt-4 mb-2">
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-sm font-medium text-obsidian-300 mt-4 mb-2">
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm font-medium text-obsidian-300 mt-4 mb-2">
        {children}
      </h6>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-obsidian-300 mb-4 space-y-1 ml-4">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-obsidian-300 mb-4 space-y-1 ml-4">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="text-obsidian-300 leading-relaxed">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-obsidian-800 pl-4 my-4 text-obsidian-400 italic">
        {children}
      </blockquote>
    ),
    hr: () => (
      <hr className="border-obsidian-800 my-6" />
    ),
  };

  if (!content || content.trim() === "") {
    return null;
  }

  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
