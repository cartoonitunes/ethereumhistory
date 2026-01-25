import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { PeopleWallets } from "@/components/PeopleWallets";
import { getPersonBySlug } from "@/lib/db";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = await getPersonBySlug(slug);
  if (!person) return { title: "Person Not Found - Ethereum History" };
  return {
    title: `${person.name} - Ethereum History`,
    description: person.shortBio || `Profile for ${person.name}.`,
  };
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const person = await getPersonBySlug(slug);
  if (!person) notFound();

  return (
    <div className="min-h-screen">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/" className="text-sm text-obsidian-500 hover:text-obsidian-300">
          ← Back to Home
        </Link>

        <div className="mt-6 rounded-2xl border border-obsidian-800 bg-obsidian-900/30 p-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">{person.name}</h1>
            {person.role && <div className="text-obsidian-400">{person.role}</div>}
            {person.websiteUrl && (
              <a
                href={person.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-ether-400 hover:text-ether-300"
              >
                Early Days of Ethereum
              </a>
            )}
          </div>

          <PeopleWallets wallets={person.wallets} />

          {person.bio && <p className="mt-6 text-obsidian-300 leading-relaxed">{person.bio}</p>}

          {person.highlights && person.highlights.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">Highlights</h2>
              <ul className="list-disc pl-5 space-y-2 text-obsidian-300">
                {person.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

