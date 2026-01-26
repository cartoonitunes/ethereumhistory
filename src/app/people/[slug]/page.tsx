import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonPageClient } from "./PersonPageClient";
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

  return <PersonPageClient person={person} />;
}

