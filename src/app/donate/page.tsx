import { Metadata } from "next";
import { DonatePage } from "./DonatePage";

export const metadata: Metadata = {
  title: "Donate - Ethereum History",
  description:
    "Support Ethereum History, a free and open archive of Ethereum smart contracts from 2015 to 2017. Donate in ETH or USDC.",
};

export default function Page() {
  return <DonatePage />;
}
