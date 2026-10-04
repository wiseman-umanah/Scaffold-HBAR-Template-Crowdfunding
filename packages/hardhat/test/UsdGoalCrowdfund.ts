import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";

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
  const GOAL_USD       = 10n * 10n ** 8n; // $10.00 (8 dec)
  const PRICE_MEETING  = 10_150_000n;     // $0.1015 — 100 HBAR ≈ $10.15 ✓
  const PRICE_FAILING  = 5_000_000n;      // $0.05   — 100 HBAR ≈ $5.00  ✗
  const PRICE_BOUNDARY = 10_000_000n;     // $0.10   — 100 HBAR  = $10.00 ✓ (exact)
  const ONE_HOUR       = 3600;
  const MAX_AGE        = 3600n;

  let organizer:    Signer;
  let contributor1: Signer;
  let contributor2: Signer;
  let MockFeed: any;
  let Crowdfund:    any;

  before(async function () {
    [organizer, contributor1, contributor2] = await ethers.getSigners();
    MockFeed  = await ethers.getContractFactory("MockFeed");
    Crowdfund = await ethers.getContractFactory("UsdGoalCrowdfund");
  });

  async function deploy(deadlineOffset = ONE_HOUR) {
    const ts       = await currentTimestamp();
    const deadline = ts + deadlineOffset;
    const feed     = await MockFeed.connect(organizer).deploy();
    await feed.waitForDeployment();
    await feed.setRound(1n, PRICE_MEETING, BigInt(ts), 1n);
    const crowdfund = await Crowdfund.connect(organizer).deploy(
      GOAL_USD,
      BigInt(deadline),
      await feed.getAddress(),
      MAX_AGE,
      ethers.ZeroAddress
    );
    await crowdfund.waitForDeployment();
    return { crowdfund, feed, deadline, ts };
  }

  // ── 1. Goal met: contribute → finalize → withdraw ────────────────────────
  describe("goal met path", function () {
    it("organizer receives full totalRaised on withdraw", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      const contribution = ethers.parseEther("100");
      await crowdfund.connect(contributor1).contribute({ value: contribution });
      expect(await crowdfund.totalRaised()).to.equal(contribution);

      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      expect(await crowdfund.finalized()).to.be.true;
      expect(await crowdfund.goalMet()).to.be.true;

      const before = await ethers.provider.getBalance(await organizer.getAddress());
      const tx     = await crowdfund.connect(organizer).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const after  = await ethers.provider.getBalance(await organizer.getAddress());

      expect(after).to.be.gt(before - gasUsed);
      expect(await crowdfund.withdrawn()).to.be.true;
      expect(await ethers.provider.getBalance(await crowdfund.getAddress())).to.equal(0n);
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

    it("multi-contributor: organizer receives sum of all contributions", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      const c1 = ethers.parseEther("60");
      const c2 = ethers.parseEther("50");
      await crowdfund.connect(contributor1).contribute({ value: c1 });
      await crowdfund.connect(contributor2).contribute({ value: c2 });
      expect(await crowdfund.totalRaised()).to.equal(c1 + c2);

      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts), 2n);
      await crowdfund.connect(organizer).finalize();

      const before  = await ethers.provider.getBalance(await organizer.getAddress());
      const tx      = await crowdfund.connect(organizer).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const after   = await ethers.provider.getBalance(await organizer.getAddress());

      expect(after).to.be.closeTo(before + c1 + c2 - gasUsed, ethers.parseEther("0.001"));
      expect(await ethers.provider.getBalance(await crowdfund.getAddress())).to.equal(0n);
    });

    it("Withdrawn event emits correct organizer and amount", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      const contribution = ethers.parseEther("100");
      await crowdfund.connect(contributor1).contribute({ value: contribution });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      await expect(crowdfund.connect(organizer).withdraw())
        .to.emit(crowdfund, "Withdrawn")
        .withArgs(await organizer.getAddress(), contribution);
    });
  });

  // ── 2. Goal not met: contribute → finalize → refund ─────────────────────
  describe("goal not met path", function () {
    it("contributor receives exact contribution back on refund", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      const contribution = ethers.parseEther("100");
      await crowdfund.connect(contributor1).contribute({ value: contribution });

      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_FAILING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      expect(await crowdfund.goalMet()).to.be.false;

      const addr1  = await contributor1.getAddress();
      expect(await crowdfund.contributions(addr1)).to.equal(contribution);

      const before  = await ethers.provider.getBalance(addr1);
      const tx      = await crowdfund.connect(contributor1).refund();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const after   = await ethers.provider.getBalance(addr1);

      expect(after).to.be.closeTo(before + contribution - gasUsed, ethers.parseEther("0.001"));
      expect(await crowdfund.contributions(addr1)).to.equal(0n);
    });

    it("second refund reverts (contribution zeroed)", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("50") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_FAILING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      await crowdfund.connect(contributor1).refund();
      await expect(crowdfund.connect(contributor1).refund()).to.be.revertedWith("nothing to refund");
    });

    it("multi-contributor: each gets exact amount back, contract empties", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      const c1 = ethers.parseEther("40");
      const c2 = ethers.parseEther("30");
      await crowdfund.connect(contributor1).contribute({ value: c1 });
      await crowdfund.connect(contributor2).contribute({ value: c2 });

      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_FAILING, BigInt(ts), 2n);
      await crowdfund.connect(organizer).finalize();

      // contributor1 refund
      const b1    = await ethers.provider.getBalance(await contributor1.getAddress());
      const tx1   = await crowdfund.connect(contributor1).refund();
      const r1    = await tx1.wait();
      const gas1  = r1!.gasUsed * r1!.gasPrice;
      const a1    = await ethers.provider.getBalance(await contributor1.getAddress());
      expect(a1).to.be.closeTo(b1 + c1 - gas1, ethers.parseEther("0.001"));

      // contributor2 refund
      const b2    = await ethers.provider.getBalance(await contributor2.getAddress());
      const tx2   = await crowdfund.connect(contributor2).refund();
      const r2    = await tx2.wait();
      const gas2  = r2!.gasUsed * r2!.gasPrice;
      const a2    = await ethers.provider.getBalance(await contributor2.getAddress());
      expect(a2).to.be.closeTo(b2 + c2 - gas2, ethers.parseEther("0.001"));

      expect(await ethers.provider.getBalance(await crowdfund.getAddress())).to.equal(0n);
    });

    it("Refunded event emits correct contributor and amount", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      const contribution = ethers.parseEther("50");
      await crowdfund.connect(contributor1).contribute({ value: contribution });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_FAILING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      await expect(crowdfund.connect(contributor1).refund())
        .to.emit(crowdfund, "Refunded")
        .withArgs(await contributor1.getAddress(), contribution);
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

  // ── 3. Guard rails ───────────────────────────────────────────────────────
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
      await expect(crowdfund.connect(contributor1).finalize()).to.be.revertedWith("deadline not reached");
    });

    it("double finalize reverts", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      await expect(crowdfund.connect(contributor2).finalize()).to.be.revertedWith("already finalized");
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

    it("refund reverts when goal was met", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      await expect(crowdfund.connect(contributor1).refund()).to.be.revertedWith("goal was met");
    });

    it("refund reverts when not finalized", async function () {
      const { crowdfund } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await expect(crowdfund.connect(contributor1).refund()).to.be.revertedWith("not finalized");
    });

    it("Contributed event emits correct contributor, amount and totalRaised", async function () {
      const { crowdfund } = await deploy();
      const amount = ethers.parseEther("42");
      await expect(crowdfund.connect(contributor1).contribute({ value: amount }))
        .to.emit(crowdfund, "Contributed")
        .withArgs(await contributor1.getAddress(), amount, amount);
    });
  });

  // ── 4. Boundary math ─────────────────────────────────────────────────────
  describe("boundary math", function () {
    it("usdRaised == goalUsd ⇒ goalMet = true", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_BOUNDARY, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      expect(await crowdfund.goalMet()).to.be.true;
    });

    it("usdRaised just below goalUsd ⇒ goalMet = false", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("99") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_BOUNDARY, BigInt(ts), 2n);
      await crowdfund.connect(contributor2).finalize();
      expect(await crowdfund.goalMet()).to.be.false;
    });
  });

  // ── 5. Oracle validation ─────────────────────────────────────────────────
  describe("oracle validation", function () {
    it("stale oracle (updatedAt too old) reverts", async function () {
      const { crowdfund, feed, deadline } = await deploy();
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("100") });
      await warpPast(deadline);
      const ts = await currentTimestamp();
      await feed.setRound(2n, PRICE_MEETING, BigInt(ts) - MAX_AGE - 1n, 2n);
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

  // ── 6. View helpers ───────────────────────────────────────────────────────
  describe("view helpers", function () {
    it("timeLeft returns correct value before deadline", async function () {
      const { crowdfund, deadline } = await deploy(ONE_HOUR);
      const ts = await currentTimestamp();
      expect(await crowdfund.timeLeft()).to.be.closeTo(BigInt(deadline - ts), 5n);
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
      // 100 HBAR * $0.1015 = $10.15 → 1_015_000_000 (8 dec)
      expect(await crowdfund.previewUsdValue(ethers.parseEther("100"))).to.equal(1_015_000_000n);
    });
  });
});
