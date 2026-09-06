/**
 * The banner that turns a preview into an account.
 *
 * The copy used to say the card was stored nowhere. That stopped being true
 * when previews began persisting: the row is saved, keyed by address, and
 * listed on the public leaderboard. Telling someone their scan is not kept, on
 * a page whose scan is kept and ranked, was both wrong and a worse pitch than
 * the truth. What they are actually missing is their name on it.
 *
 * Shown only to signed out visitors, and placed directly under the card rather
 * than at the foot of the page: by the time someone has scrolled past their own
 * holdings they have had the whole experience and the offer to keep it arrives
 * after the moment it was worth taking.
 *
 * Both buttons go through /api/preview/claim, which remembers the address in a
 * cookie before handing off to sign in. That is what lets the wallet, its
 * holdings and the card be saved automatically on the way back, whichever sign
 * in method the person chooses.
 *
 * They also both land on the same page, deliberately. /historian/login is one
 * combined door: its Google and GitHub buttons create an account or sign into
 * an existing one without the visitor having to know which they are doing. Two
 * labels for one destination is worth it because a person who already has an
 * account and a person who does not are looking for different words, and
 * showing only one of the two reliably loses the other.
 */

import Link from "next/link";

export default function SavePreviewCta({
  address,
  holdingCount,
}: {
  address: string;
  holdingCount: number;
}) {
  const claim = `/api/preview/claim?address=${encodeURIComponent(address)}`;
  const noun = holdingCount === 1 ? "contract" : "contracts";

  return (
    <section
      aria-labelledby="save-preview-heading"
      className="w-full max-w-2xl overflow-hidden rounded-2xl border border-ether-500/30 bg-gradient-to-b from-ether-500/10 to-transparent"
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.13em] text-ether-300">
            Unclaimed
          </span>
          <h2 id="save-preview-heading" className="text-lg font-semibold text-obsidian-50 sm:text-xl">
            Claim this card as yours
          </h2>
          <p className="text-sm leading-relaxed text-obsidian-300">
            Your card is saved for now. Sign in to claim it, manage multiple wallets,
            and appear as a named collector on the leaderboard.
            {holdingCount > 0 ? (
              <>
                {" "}
                Claiming also lets you verify this wallet by signature for the badge,
                and gives the {holdingCount} {noun} below a collection page of their
                own.
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={claim}
            prefetch={false}
            className="inline-flex items-center justify-center rounded-lg bg-ether-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ether-500"
          >
            Create an account
          </Link>
          <Link
            href={claim}
            prefetch={false}
            className="inline-flex items-center justify-center rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-obsidian-100 transition-colors hover:border-white/30 hover:bg-white/5"
          >
            Sign in
          </Link>
          <span className="text-xs text-obsidian-400 sm:ml-2">
            Your wallet and holdings are saved for you on the way back.
          </span>
        </div>
      </div>
    </section>
  );
}
