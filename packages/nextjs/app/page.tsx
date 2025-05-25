"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";

type DealState = 0 | 1 | 2 | 3; // enum EscrowDeal.State

const STATE_LABELS: Record<DealState, string> = {
  0: "Awaiting payment",
  1: "Awaiting guarantor",
  2: "Completed",
  3: "Cancelled",
};

export default function EscrowPage() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: contract, isLoading } = useScaffoldContract({ contractName: "EscrowDeal", walletClient });

  const [seller, setSeller] = useState<string>();
  const [buyer, setBuyer] = useState<string>();
  const [guarantor, setGuarantor] = useState<string>();
  const [price, setPrice] = useState<bigint>();
  const [state, setState] = useState<DealState>(0);

  const load = async () => {
    if (!contract) return;
    setSeller(await contract.read.seller());
    setBuyer(await contract.read.buyer());
    setGuarantor(await contract.read.guarantor());
    setPrice(await contract.read.price());
    setState((await contract.read.state()) as DealState);
  };

  // keep UI fresh
  useEffect(() => {
    if (isLoading) return;
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [isLoading]); // eslint-disable-line

  if (isLoading) return <p>Loading...</p>;
  if (!contract) return <p>Contract not found.</p>;

  const isSeller = address === seller;
  const isBuyer = address === buyer;
  const isGuarantor = address === guarantor;

  const deposit = async () => {
    const value = price ? price : 0n;
    await contract.write.deposit({ value });
  };

  const cancelBeforeFunding = async () => {
    await contract.write.cancelBeforeFunding();
  };

  const confirmTransfer = async () => {
    await contract.write.confirmTransfer();
  };

  const refundBuyer = async () => {
    await contract.write.refundBuyer();
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Escrow deal</h1>

      <div className="grid sm:grid-cols-2 gap-4 border p-4 rounded-xl">
        <span className="font-semibold">Seller:</span> <Address address={seller} />
        <span className="font-semibold">Buyer:</span> <Address address={buyer} />
        <span className="font-semibold">Guarantor:</span> <Address address={guarantor} />
        <span className="font-semibold">Price:</span> {price && formatEther(price)} ETH
        <span className="font-semibold">State:</span> {STATE_LABELS[state]}
      </div>

      {/* action buttons */}
      <div className="flex flex-wrap gap-3">
        {state === 0 && isBuyer && (
          <button className="btn btn-primary" onClick={deposit}>
            Deposit {price && formatEther(price)} ETH
          </button>
        )}

        {state === 0 && (isBuyer || isSeller) && (
          <button className="btn btn-secondary" onClick={cancelBeforeFunding}>
            Cancel deal
          </button>
        )}

        {state === 1 && isGuarantor && (
          <>
            <button className="btn btn-success" onClick={confirmTransfer}>
              Confirm transfer
            </button>
            <button className="btn btn-error" onClick={refundBuyer}>
              Refund buyer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
