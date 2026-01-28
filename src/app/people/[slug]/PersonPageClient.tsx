"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, Save, X } from "lucide-react";
import { Header } from "@/components/Header";
import { PeopleWallets } from "@/components/PeopleWallets";
import { formatAddress } from "@/lib/utils";
import type { Person, HistorianMe } from "@/types";

interface PersonPageClientProps {
  person: Person;
}

export function PersonPageClient({ person: initialPerson }: PersonPageClientProps) {
  const [person, setPerson] = useState(initialPerson);
  const [me, setMe] = useState<HistorianMe | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Editable state
  const [savedName, setSavedName] = useState(person.name);
  const [savedRole, setSavedRole] = useState(person.role || "");
  const [savedShortBio, setSavedShortBio] = useState(person.shortBio || "");
  const [savedBio, setSavedBio] = useState(person.bio || "");
  const [savedHighlights, setSavedHighlights] = useState(
    person.highlights?.join("\n") || ""
  );
  const [savedWebsiteUrl, setSavedWebsiteUrl] = useState(person.websiteUrl || "");

  const [draftName, setDraftName] = useState(savedName);
  const [draftRole, setDraftRole] = useState(savedRole);
  const [draftShortBio, setDraftShortBio] = useState(savedShortBio);
  const [draftBio, setDraftBio] = useState(savedBio);
  const [draftHighlights, setDraftHighlights] = useState(savedHighlights);
  const [draftWebsiteUrl, setDraftWebsiteUrl] = useState(savedWebsiteUrl);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      setLoadingMe(true);
      try {
        const res = await fetch("/api/historian/me");
        const json = await res.json();
        if (cancelled) return;
        setMe((json?.data as HistorianMe) || null);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const canEdit = !!me?.active;

  async function savePerson() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/people/${person.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName.trim(),
          role: draftRole.trim() || null,
          shortBio: draftShortBio.trim() || null,
          bio: draftBio.trim() || null,
          highlights: draftHighlights.trim()
            ? draftHighlights
                .split("\n")
                .map((h) => h.trim())
                .filter((h) => h.length > 0)
            : null,
          websiteUrl: draftWebsiteUrl.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setSaveError(String(json?.error || "Failed to save."));
        return;
      }
      const updated = json.data.person as Person;
      setPerson(updated);
      setSavedName(updated.name);
      setSavedRole(updated.role || "");
      setSavedShortBio(updated.shortBio || "");
      setSavedBio(updated.bio || "");
      setSavedHighlights(updated.highlights?.join("\n") || "");
      setSavedWebsiteUrl(updated.websiteUrl || "");
      setEditMode(false);
    } catch {
      setSaveError("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header showHistorianLogin={true} historianMe={me} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/" className="text-sm text-obsidian-500 hover:text-obsidian-300">
          ← Back to Home
        </Link>

        <div className="mt-6 rounded-2xl border border-obsidian-800 bg-obsidian-900/30 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              {editMode ? (
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full text-3xl font-bold bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 rounded-lg outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                  placeholder="Name"
                />
              ) : (
                <h1 className="text-3xl font-bold">{person.name}</h1>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit ? (
                editMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40 text-sm text-obsidian-300 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={savePerson}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ether-600 hover:bg-ether-500 text-sm text-white disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    disabled={loadingMe}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40 text-sm text-obsidian-300"
                  >
                    Edit
                  </button>
                )
              ) : (
                <Link
                  href={`/historian/login?next=${encodeURIComponent(`/people/${person.slug}`)}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40 text-sm text-obsidian-300 hover:text-obsidian-100"
                >
                  <LogIn className="w-4 h-4" />
                  Historian login
                </Link>
              )}
            </div>
          </div>

          {saveError && <div className="mb-3 text-sm text-red-400">{saveError}</div>}

          <div className="flex flex-col gap-2 mb-4">
            {editMode ? (
              <input
                value={draftRole}
                onChange={(e) => setDraftRole(e.target.value)}
                className="w-full bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 rounded-lg text-obsidian-400 outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                placeholder="Role (optional)"
              />
            ) : (
              person.role && <div className="text-obsidian-400">{person.role}</div>
            )}
            {editMode ? (
              <input
                value={draftWebsiteUrl}
                onChange={(e) => setDraftWebsiteUrl(e.target.value)}
                className="w-full bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 rounded-lg text-sm text-ether-400 outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                placeholder="Website URL (optional)"
              />
            ) : (
              person.websiteUrl && (
                <a
                  href={person.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ether-400 hover:text-ether-300"
                >
                  {person.websiteUrl}
                </a>
              )
            )}
          </div>

          <div className="mb-4">
            <div className="text-xs text-obsidian-500 mb-1">Address</div>
            <div className="font-mono text-sm text-obsidian-400">{formatAddress(person.address)}</div>
          </div>

          <PeopleWallets wallets={person.wallets} />

          {editMode ? (
            <div className="mt-6 space-y-4">
              <div>
                <div className="text-xs text-obsidian-500 mb-1">Short Bio</div>
                <input
                  value={draftShortBio}
                  onChange={(e) => setDraftShortBio(e.target.value)}
                  className="w-full bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 rounded-lg text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                  placeholder="One-line bio (optional)"
                />
              </div>
              <div>
                <div className="text-xs text-obsidian-500 mb-1">Bio</div>
                <textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  className="w-full min-h-[120px] bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 rounded-lg text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20"
                  placeholder="Full bio (optional)"
                />
              </div>
              <div>
                <div className="text-xs text-obsidian-500 mb-1">Highlights (one per line)</div>
                <textarea
                  value={draftHighlights}
                  onChange={(e) => setDraftHighlights(e.target.value)}
                  className="w-full min-h-[100px] bg-obsidian-900/50 border border-obsidian-800 px-3 py-2 rounded-lg text-sm outline-none focus:border-ether-500/50 focus:ring-2 focus:ring-ether-500/20 font-mono"
                  placeholder="Highlight 1&#10;Highlight 2&#10;..."
                />
              </div>
            </div>
          ) : (
            <>
              {person.shortBio && (
                <p className="mt-6 text-obsidian-300 leading-relaxed font-medium">{person.shortBio}</p>
              )}
              {person.bio && (
                <p className="mt-6 text-obsidian-300 leading-relaxed">{person.bio}</p>
              )}
              {person.highlights && person.highlights.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold mb-3">Highlights</h2>
                  <ul className="list-disc pl-5 space-y-2 text-obsidian-300">
                    {person.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
