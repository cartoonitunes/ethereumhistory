"use client";

import { useState } from "react";
import { MessageSquarePlus, Send, Check, X } from "lucide-react";

const FIELD_OPTIONS = [
  { value: "description", label: "Description" },
  { value: "short_description", label: "Short Description" },
  { value: "historical_significance", label: "Historical Significance" },
  { value: "historical_context", label: "Historical Context" },
];

interface SuggestEditFormProps {
  contractAddress: string;
}

export function SuggestEditForm({ contractAddress }: SuggestEditFormProps) {
  const [open, setOpen] = useState(false);
  const [fieldName, setFieldName] = useState("description");
  const [suggestedValue, setSuggestedValue] = useState("");
  const [reason, setReason] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!suggestedValue.trim() || suggestedValue.trim().length < 10) {
      setError("Suggestion must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          fieldName,
          suggestedValue: suggestedValue.trim(),
          reason: reason.trim() || null,
          submitterName: submitterName.trim() || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to submit");
        return;
      }

      setSubmitted(true);
      setSuggestedValue("");
      setReason("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
        <div className="flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-green-300 font-medium">Suggestion submitted</p>
            <p className="text-sm text-obsidian-400 mt-1">
              A historian will review your contribution. Thank you for helping preserve Ethereum history.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setOpen(false); }}
          className="mt-3 text-sm text-obsidian-400 hover:text-obsidian-300 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-obsidian-700 bg-obsidian-900/50 hover:bg-obsidian-800 hover:border-obsidian-600 text-obsidian-300 hover:text-obsidian-100 text-sm transition-colors"
      >
        <MessageSquarePlus className="w-4 h-4" />
        Suggest an edit
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-obsidian-700 bg-obsidian-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-obsidian-200 flex items-center gap-2">
          <MessageSquarePlus className="w-4 h-4 text-ether-400" />
          Suggest an edit
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-obsidian-500 hover:text-obsidian-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-obsidian-400 mb-4">
        No account needed. Suggestions are reviewed by historians before being applied.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-obsidian-400 mb-1">Field</label>
          <select
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-obsidian-900 border border-obsidian-700 text-obsidian-200 text-sm focus:border-ether-500/50 focus:outline-none"
          >
            {FIELD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-obsidian-400 mb-1">Your suggestion</label>
          <textarea
            value={suggestedValue}
            onChange={(e) => setSuggestedValue(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Write your suggested content here..."
            className="w-full px-3 py-2 rounded-lg bg-obsidian-900 border border-obsidian-700 text-obsidian-200 text-sm placeholder:text-obsidian-500 focus:border-ether-500/50 focus:outline-none resize-y"
          />
          <p className="text-xs text-obsidian-500 mt-1">{suggestedValue.length}/5000</p>
        </div>

        <div>
          <label className="block text-sm text-obsidian-400 mb-1">Why? (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Source link, context, or reasoning..."
            className="w-full px-3 py-2 rounded-lg bg-obsidian-900 border border-obsidian-700 text-obsidian-200 text-sm placeholder:text-obsidian-500 focus:border-ether-500/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-obsidian-400 mb-1">Your name (optional)</label>
          <input
            type="text"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            maxLength={100}
            placeholder="How should we credit you?"
            className="w-full px-3 py-2 rounded-lg bg-obsidian-900 border border-obsidian-700 text-obsidian-200 text-sm placeholder:text-obsidian-500 focus:border-ether-500/50 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting || suggestedValue.trim().length < 10}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ether-600 hover:bg-ether-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {submitting ? "Submitting..." : "Submit suggestion"}
        </button>
      </form>
    </div>
  );
}
