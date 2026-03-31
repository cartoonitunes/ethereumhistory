import { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Privacy Policy - Ethereum History",
  description: "Privacy policy for EthereumHistory.com",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-obsidian-400 text-sm mb-8">Last updated: March 31, 2026</p>

        <div className="space-y-8 text-obsidian-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">What We Collect</h2>
            <p>
              When you sign in to Ethereum History as a historian, we collect the information
              necessary to create and maintain your account:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-obsidian-400">
              <li>Email address (via Google sign-in, GitHub, or manual login)</li>
              <li>Display name and profile information you choose to provide</li>
              <li>Ethereum wallet address (if you sign in with Ethereum)</li>
              <li>Your edits and contributions to contract documentation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-obsidian-400">
              <li>Authenticate your identity and manage your historian account</li>
              <li>Attribute your contributions to smart contract documentation</li>
              <li>Display your public historian profile and edit history</li>
              <li>Communicate with you about your account or contributions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">What We Share</h2>
            <p>
              Your historian profile (name, avatar, bio) and your contributions are publicly visible.
              We do not sell your personal information. We do not share your email address publicly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">Cookies</h2>
            <p>
              We use a session cookie to keep you logged in. We use basic analytics to understand
              how the site is used. We do not use tracking cookies or third-party advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">Third-Party Services</h2>
            <p>
              If you sign in with Google or GitHub, their respective privacy policies apply to
              the authentication process. We only receive the basic profile information needed
              to create your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">Data Retention</h2>
            <p>
              Your account and contributions are retained as part of the historical archive.
              You may request deletion of your account by contacting us. Contributions to the
              archive may be retained in anonymized form.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-obsidian-100 mb-3">Contact</h2>
            <p>
              For privacy-related inquiries, contact us at{" "}
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
