import { Metadata } from "next";
import { Header } from "@/components/Header";
import { cx } from "./cx";
import { SectionNav } from "./components/SectionNav";
import { TimelineControls, TimelineProvider } from "./components/Timeline";
import { Hero } from "./content/hero";
import { Interface } from "./content/interface";
import { Findings } from "./content/findings";
import { TimelineIntro } from "./content/timeline-intro";
import { Era1 } from "./content/era-1";
import { Era2 } from "./content/era-2";
import { Era3 } from "./content/era-3";
import { Era4 } from "./content/era-4";
import { Era5 } from "./content/era-5";
import { Members } from "./content/members";
import { Artifacts } from "./content/artifacts";
import { MistCoin } from "./content/mistcoin";
import { Onchain } from "./content/onchain";
import { Compliance } from "./content/compliance";
import { Method } from "./content/method";
import { Colophon } from "./content/colophon";

const TITLE = "ERC-20: A Code History - Ethereum History";
const DESCRIPTION =
  "A primary-source reconstruction of when each member of the ERC-20 interface first appeared in publicly available code, 2015 to 2016. Every claim resolves to a commit, gist revision, archived event or block.";

function getMetadataBaseUrl(): URL {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_ENV === "production"
      ? "https://www.ethereumhistory.com"
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "");
  return new URL(explicit || "https://www.ethereumhistory.com");
}

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: new URL("/erc20", getMetadataBaseUrl()).toString(),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "article",
    siteName: "Ethereum History",
  },
  twitter: {
    card: "summary_large_image",
    title: "ERC-20: A Code History",
    description:
      "When each member of the ERC-20 interface first appeared in public code, 2015 to 2016.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "ERC-20: A Code History",
  description: DESCRIPTION,
  about: "The drafting of the ERC-20 token standard, 2015 to 2016",
  isPartOf: {
    "@type": "WebSite",
    name: "Ethereum History",
    url: "https://www.ethereumhistory.com",
  },
};

/** The document's own measure. Wider than the site's prose pages: the
    comparison matrices need the room. */
function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

export default function Erc20Page() {
  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <SectionNav />

      <article className={cx("root")}>
        <section className={cx("hero")} id="top">
          <Wrap>
            <Hero />
          </Wrap>
        </section>

        <section id="interface" className={cx("band band--tint")}>
          <Wrap>
            <Interface />
          </Wrap>
        </section>

        <section id="findings" className={cx("band")}>
          <Wrap>
            <Findings />
          </Wrap>
        </section>

        <TimelineProvider>
          <section id="timeline" className={cx("band band--tint")} style={{ paddingBottom: 0 }}>
            <Wrap>
              <TimelineIntro />
            </Wrap>
          </section>

          <div className={cx("band--tint")} style={{ paddingBottom: "clamp(2rem, 5vw, 4rem)" }}>
            <TimelineControls />
            <Wrap>
              <Era1 />
              <Era2 />
              <Era3 />
              <Era4 />
              <Era5 />
            </Wrap>
          </div>
        </TimelineProvider>

        <section id="members" className={cx("band")}>
          <Wrap>
            <Members />
          </Wrap>
        </section>

        <section id="artifacts" className={cx("band band--tint")}>
          <Wrap>
            <Artifacts />
          </Wrap>
        </section>

        <section id="mistcoin" className={cx("band")}>
          <Wrap>
            <MistCoin />
          </Wrap>
        </section>

        <section id="onchain" className={cx("band band--tint")}>
          <Wrap>
            <Onchain />
          </Wrap>
        </section>

        <section id="compliance" className={cx("band")}>
          <Wrap>
            <Compliance />
          </Wrap>
        </section>

        <section id="method" className={cx("band band--tint")}>
          <Wrap>
            <Method />
          </Wrap>
        </section>

        <footer className={cx("band")}>
          <Wrap>
            <Colophon />
          </Wrap>
        </footer>
      </article>
    </div>
  );
}
