import { useState, useEffect } from "react";
import { Address, decodeEventLog } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { FACTORY_ABI } from "@/config/abi";

interface Props {
  factoryAddress: Address;
  onCreated: (campaignAddress: Address, title: string, description: string) => void;
}

export function CreateCampaignForm({ factoryAddress, onCreated }: Props) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [goalUsd,     setGoalUsd]     = useState("");
  const [daysInput,   setDaysInput]   = useState("7");
  const [hoursInput,  setHoursInput]  = useState("0");

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess || !receipt) return;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "CampaignCreated") {
          const addr = (decoded.args as { campaign: Address }).campaign;
          const t    = title.trim();
          const d    = description.trim();
          reset();
          setTitle(""); setDescription(""); setGoalUsd(""); setDaysInput("7"); setHoursInput("0");
          onCreated(addr, t, d);
        }
      } catch {
        // not a factory log, skip
      }
    }
  }, [isSuccess, receipt]);

  function handleCreate() {
    const goal = parseFloat(goalUsd);
    if (!title.trim() || isNaN(goal) || goal <= 0) return;

    const days  = parseInt(daysInput)  || 0;
    const hours = parseInt(hoursInput) || 0;
    const durationSecs = days * 86400 + hours * 3600;
    if (durationSecs <= 0) return;

    const deadlineBig = BigInt(Math.floor(Date.now() / 1000) + durationSecs);
    const goalBig     = BigInt(Math.round(goal * 1e8));

    writeContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: "createCampaign",
      args: [goalBig, deadlineBig, title.trim(), description.trim()],
    });
  }

  const canSubmit =
    title.trim().length > 0 &&
    title.trim().length <= 100 &&
    description.trim().length <= 500 &&
    parseFloat(goalUsd) > 0 &&
    (parseInt(daysInput) > 0 || parseInt(hoursInput) > 0) &&
    !isPending && !isConfirming;

  return (
    <div className="card">
      <h2>Create a Campaign</h2>

      <label className="form-label">Title <span className="char-count">{title.length}/100</span></label>
      <input
        type="text"
        placeholder="e.g. Community Garden Fund"
        value={title}
        maxLength={100}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isPending || isConfirming}
        className="form-input"
      />

      <label className="form-label">Description <span className="char-count">{description.length}/500</span></label>
      <textarea
        placeholder="What is this campaign for? Who benefits?"
        value={description}
        maxLength={500}
        rows={3}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isPending || isConfirming}
        className="form-input"
      />

      <label className="form-label">Goal (USD)</label>
      <input
        type="number"
        min="0.01"
        step="0.01"
        placeholder="e.g. 100"
        value={goalUsd}
        onChange={(e) => setGoalUsd(e.target.value)}
        disabled={isPending || isConfirming}
        className="form-input"
      />

      <label className="form-label">Duration</label>
      <div className="duration-row">
        <div className="duration-field">
          <input
            type="number"
            min="0"
            step="1"
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            disabled={isPending || isConfirming}
            className="form-input"
          />
          <span className="duration-unit">days</span>
        </div>
        <div className="duration-field">
          <input
            type="number"
            min="0"
            max="23"
            step="1"
            value={hoursInput}
            onChange={(e) => setHoursInput(e.target.value)}
            disabled={isPending || isConfirming}
            className="form-input"
          />
          <span className="duration-unit">hours</span>
        </div>
      </div>

      <button
        className="btn-primary contribute-btn"
        onClick={handleCreate}
        disabled={!canSubmit}
      >
        {isPending || isConfirming ? "Deploying campaign…" : "Create Campaign"}
      </button>

      {error && (
        <p className="error-msg">Error: {error.message.split("\n")[0]}</p>
      )}
    </div>
  );
}
