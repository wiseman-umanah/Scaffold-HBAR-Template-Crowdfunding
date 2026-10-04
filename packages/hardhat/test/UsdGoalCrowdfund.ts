import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function warpPast(deadline: number) {
  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  const delta = deadline - now + 1;
  if (delta > 0) {
    await network.provider.send("evm_increaseTime", [delta]);
    await network.provider.send("evm_mine", []);
  }
}

async function currentTimestamp(): Promise<number> {
  return (await ethers.provider.getBlock("latest"))!.timestamp;
}

describe("UsdGoalCrowdfund", function () {
  // ── Fixtures ────────────────────────────────────────────────────────────

  // goalUsd = $10 (8 decimals)  →  10 * 1e8 = 1_000_000_000
  const GOAL_USD = 10n * 10n ** 8n; // $10.00

  // HBAR price: $0.1015  →  answer = 10_150_000 (8 dec)
  const PRICE_MEETING = 10_150_000n;  // ~$0.1015, 100 HBAR ≈ $10.15  ✓
  const PRICE_FAILING = 5_000_000n;   // ~$0.05,   100 HBAR ≈ $5.00   ✗
  const PRICE_BOUNDARY = 10_000_000n; // $0.10,    100 HBAR = $10.00  = goal ✓

  const ONE_HOUR = 3600;
  const MAX_AGE  = 3600n;

  let organizer: Signer;
  let contributor1: Signer;
  let contributor2: Signer;

  let MockFeed: any;
  let Crowdfund: any;

  before(async function () {
    [organizer, contributor1, contributor2] = await ethers.getSigners();
    MockFeed = await ethers.getContractFactory("MockFeed");
    Crowdfund = await ethers.getContractFactory("UsdGoalCrowdfund");
  });

  async function deploy(deadlineOffset = ONE_HOUR) {
    const ts = await currentTimestamp();
    const deadline = ts + deadlineOffset;

    const feed = await MockFeed.connect(organizer).deploy();
    await feed.waitForDeployment();

    // Set a fresh oracle answer
    const updatedAt = BigInt(ts);
    await feed.setRound(1n, PRICE_MEETING, updatedAt, 1n);

    const crowdfund = await Crowdfund.connect(organizer).deploy(
      GOAL_USD,
      BigInt(deadline),
      await feed.getAddress(),
      MAX_AGE,
      ethers.ZeroAddress   // organizer_ = 0 → falls back to msg.sender
    );
    await crowdfund.waitForDeployment();

    return { crowdfund, feed, deadline, ts };
  }

  // ── 1. Contribute → finalize (goal met) → withdraw ──────────────────────
  describe("goal met path", function () {
    it("organizer can withdraw after goal is met", async function () {
      const { crowdfund, feed, deadline } = await deploy();

      // Contribute 100 HBAR from contributor1
      const contribution = ethers.parseEther("100");
      await crowdfund
        .connect(contributor1)
        .contribute({ value: contribution });

      expect(await crowdfund.totalRaised()).to.equal(contribution);

      // Warp past deadline
      await warpPast(deadline);

      // Set oracle to meeting price, fresh updatedAt
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts), 2n);

      // Finalize
      await crowdfund.connect(contributor2).finalize();
      expect(await crowdfund.finalized()).to.be.true;
      expect(await crowdfund.goalMet()).to.be.true;

      // Organizer withdraws
      const before = await ethers.provider.getBalance(await organizer.getAddress());
      const tx = await crowdfund.connect(organizer).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(await organizer.getAddress());

      expect(after).to.be.gt(before - gasUsed); // received funds
      expect(await crowdfund.withdrawn()).to.be.true;
    });

    it("second withdraw reverts", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      await crowdfund.connect(organizer).withdraw();
      await expect(crowdfund.connect(organizer).withdraw()).to.be.revertedWith("already withdrawn");
    });
  });

  // ── 2. Contribute → finalize (goal not met) → refund ────────────────────
  describe("goal not met path", function () {
    it("contributor can refund when goal not met", async function () {
      const { crowdfund, feed, deadline } = await deploy();

      const contribution = ethers.parseEther("100");
      await crowdfund.connect(contributor1).contribute({ value: contribution });

      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_FAILING, BigInt(ts), 2n);

      await crowdfund.connect(contributor2).finalize();
      expect(await crowdfund.goalMet()).to.be.false;

      // contributions[contributor1] should equal the contribution
      const addr1 = await contributor1.getAddress();
      expect(await crowdfund.contributions(addr1)).to.equal(contribution);

      // Refund
      const before = await ethers.provider.getBalance(addr1);
      const tx = await crowdfund.connect(contributor1).refund();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(addr1);

      // contributor gets ~100 HBAR back (minus gas)
      expect(after).to.be.closeTo(before + contribution - gasUsed, ethers.parseEther("0.001"));

      // contributions zeroed
      expect(await crowdfund.contributions(addr1)).to.equal(0n);
    });

    it("second refund reverts (contribution already zeroed)", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("50") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_FAILING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      await crowdfund.connect(contributor1).refund();
      await expect(crowdfund.connect(contributor1).refund()).to.be.revertedWith("nothing to refund");
    });

    it("organizer withdraw reverts when goal not met", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_FAILING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      await expect(crowdfund.connect(organizer).withdraw()).to.be.revertedWith("goal not met");
    });
  });

  // ── 3. Edge cases & guard rails ──────────────────────────────────────────
  describe("guard rails", function () {
    it("contribute after deadline reverts", async function () {
      const { crowdfund, deadline } = await deploy();
      await warpPast(deadline);
      await expect(
        crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("campaign closed");
    });

    it("finalize before deadline reverts", async function () {
      const { crowdfund } = await deploy(ONE_HOUR);
      await expect(crowdfund.connect(contributor1).finalize()).to.be.revertedWith(
        "deadline not reached"
      );
    });

    it("double finalize reverts", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      await expect(crowdfund.connect(contributor2).finalize()).to.be.revertedWith(
        "already finalized"
      );
    });

    it("contribute with msg.value == 0 reverts", async function () {
      const { crowdfund } = await deploy();
      await expect(
        crowdfund.connect(contributor1).contribute({ value: 0n })
      ).to.be.revertedWith("must send HBAR");
    });

    it("non-organizer cannot withdraw", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      await expect(crowdfund.connect(contributor1).withdraw()).to.be.revertedWith("not organizer");
    });
  });

  // ── 4. Boundary: usdRaised == goalUsd → goalMet = true ──────────────────
  describe("boundary math", function () {
    it("usdRaised == goalUsd ⇒ goalMet = true", async function () {
      // 100 HBAR * PRICE_BOUNDARY ($0.10) = $10.00 = goalUsd  → goalMet = true
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund
        .connect(contributor1)
        .contribute({ value: ethers.parseEther("100") });

      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_BOUNDARY, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();

      expect(await crowdfund.goalMet()).to.be.true;
    });

    it("usdRaised just below goalUsd ⇒ goalMet = false", async function () {
      // 99 HBAR * $0.10 = $9.90 < $10.00  → goalMet = false
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund
        .connect(contributor1)
        .contribute({ value: ethers.parseEther("99") });

      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_BOUNDARY, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();

      expect(await crowdfund.goalMet()).to.be.false;
    });
  });

  // ── 5. Stale oracle reverts in finalize ──────────────────────────────────
  describe("oracle validation", function () {
    it("stale oracle (updatedAt too old) reverts", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);

      // Set updatedAt to 2 hours before now — exceeds maxAge of 1 hour
      const ts = await currentTimestamp();
      const staleUpdatedAt = BigInt(ts) - MAX_AGE - 1n;
      await feed.setRound(2n, PRICE_MEETING, staleUpdatedAt, 2n);

      await expect(crowdfund.connect(contributor2).finalize()).to.be.revertedWith("stale oracle");
    });

    it("non-positive answer reverts", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, 0n, BigInt(ts), 2n);
      await expect(crowdfund.connect(contributor2).finalize()).to.be.revertedWith("bad price");
    });

    it("stale round (answeredInRound < roundId) reverts", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      // answeredInRound (1) < roundId (5) → stale
      await feed.setRound(5n, PRICE_MEETING, BigInt(ts), 1n);
      await expect(crowdfund.connect(contributor2).finalize()).to.be.revertedWith("stale round");
    });

    it("unexpected feed decimals reverts", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await feed.setDecimals(18);
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts), 2n);
      await expect(crowdfund.connect(contributor2).finalize()).to.be.revertedWith("unexpected decimals");
    });
  });

  // ── 6. View helpers ──────────────────────────────────────────────────────
  describe("view helpers", function () {
    it("timeLeft returns correct value before deadline", async function () {
      const { crowdfund, deadline } = await deploy(ONE_HOUR);
      const ts = await currentTimestamp();
      const tl = await crowdfund.timeLeft();
      expect(tl).to.be.closeTo(BigInt(deadline - ts), 5n);
    });

    it("timeLeft returns 0 after deadline", async function () {
      const { crowdfund, deadline } = await deploy();
      await warpPast(deadline);
      expect(await crowdfund.timeLeft()).to.equal(0n);
    });

    it("isOpen returns true when open", async function () {
      const { crowdfund } = await deploy();
      expect(await crowdfund.isOpen()).to.be.true;
    });

    it("isOpen returns false after deadline", async function () {
      const { crowdfund, deadline } = await deploy();
      await warpPast(deadline);
      expect(await crowdfund.isOpen()).to.be.false;
    });

    it("previewUsdValue returns correct USD amount", async function () {
      const { crowdfund } = await deploy();
      // 100 HBAR * $0.1015 = $10.15  → 1_015_000_000 (8 dec)
      const usd = await crowdfund.previewUsdValue(ethers.parseEther("100"));
      expect(usd).to.equal(1_015_000_000n);
    });
  });
});
