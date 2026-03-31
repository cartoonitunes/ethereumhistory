import { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Terms of Service - Ethereum History",
  description: "Terms of service for EthereumHistory.com",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p className="text-obsidian-400 text-sm mb-8">Last updated: March 31, 2026</p>

        <div className="space-y-8 text-obsidian-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">About Ethereum History</h2>
            <p>
              Ethereum History is a free, community-driven archive documenting the earliest
              smart contracts deployed on Ethereum. By using this site, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">Historian Accounts</h2>
            <p>
              You may create an account to contribute documentation about smart contracts.
              You are responsible for the accuracy of the information you submit. New accounts
              start as untrusted, and contributions may be reviewed before publication.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">Contributions</h2>
            <p>
              By submitting content to Ethereum History, you grant us a non-exclusive, perpetual,
              royalty-free license to display, modify, and distribute your contributions as part
              of the archive. You retain ownership of your original content.
            </p>
            <p className="mt-2">
              Contributions should be factual and based on verifiable sources. Do not submit
              content that is defamatory, misleading, or infringes on intellectual property rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-obsidian-400">
              <li>Submit false or intentionally misleading historical information</li>
              <li>Attempt to gain unauthorized access to accounts or systems</li>
              <li>Use automated tools to scrape or overload the service</li>
              <li>Impersonate other historians or misrepresent your identity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">No Warranty</h2>
            <p>
              Ethereum History is provided &quot;as is&quot; without warranty of any kind.
              The information in the archive is community-contributed and may contain errors.
              We do not guarantee the accuracy, completeness, or reliability of any content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">Donations</h2>
            <p>
              Donations to Ethereum History are voluntary and non-refundable.
              Donations support the maintenance and development of the archive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">Changes</h2>
            <p>
              We may update these terms from time to time. Continued use of the site
              after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">Contact</h2>
            <p>
              Questions about these terms? Contact us at{" "}
              <a href="mailto:hello@ethereumhistory.com" className="text-ether-400 hover:text-ether-300">
                hello@ethereumhistory.com
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
