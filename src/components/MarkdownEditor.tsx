"use client";

import { useState } from "react";
import { Edit, Eye } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "",
  minHeight = "120px",
  className = "",
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-obsidian-500">
          Markdown supported
        </div>
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="flex items-center gap-1.5 text-xs text-obsidian-400 hover:text-obsidian-300 transition-colors px-2 py-1 rounded hover:bg-obsidian-900/50"
          title={isPreview ? "Switch to edit mode" : "Switch to preview mode"}
        >
          {isPreview ? (
            <>
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </>
          )}
        </button>
      </div>
      {isPreview ? (
        <div
          className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 min-h-[120px]"
          style={{ minHeight }}
        >
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-obsidian-500 text-sm italic">
              {placeholder || "Preview will appear here..."}
            </p>
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20 font-mono"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}
