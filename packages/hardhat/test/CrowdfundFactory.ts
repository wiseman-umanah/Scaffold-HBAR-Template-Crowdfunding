import { ethers, network } from "hardhat";
import { expect } from "chai";

async function currentTimestamp(): Promise<number> {
  return (await ethers.provider.getBlock("latest"))!.timestamp;
}

describe("CrowdfundFactory", function () {
  const FEED_DECIMALS = 8;
  const ONE_HOUR      = 3600;
  const MAX_AGE       = 3600n;
  const GOAL_USD      = 10n * 10n ** 8n;

  let deployer: any;
  let alice: any;
  let MockFeed: any;
  let Factory: any;
  let feed: any;
  let factory: any;

  before(async function () {
    [deployer, alice] = await ethers.getSigners();
    MockFeed = await ethers.getContractFactory("MockFeed");
    Factory  = await ethers.getContractFactory("CrowdfundFactory");

    feed = await MockFeed.deploy();
    await feed.waitForDeployment();

    factory = await Factory.deploy(await feed.getAddress(), MAX_AGE);
    await factory.waitForDeployment();
  });

  async function createCampaign(signer = alice, offsetSeconds = ONE_HOUR) {
    const ts       = await currentTimestamp();
    const deadline = BigInt(ts + offsetSeconds);
    const tx = await factory.connect(signer).createCampaign(
      GOAL_USD,
      deadline,
      "Test Campaign",
      "A test description"
    );
    const receipt = await tx.wait();
    // extract CampaignCreated event
    const event = receipt.logs
      .map((log: any) => {
        try { return factory.interface.parseLog(log); } catch { return null; }
      })
      .find((e: any) => e?.name === "CampaignCreated");

    return { receipt, campaignAddr: event!.args.campaign as string, deadline };
  }

  it("deploys a UsdGoalCrowdfund and emits CampaignCreated", async function () {
    const { campaignAddr } = await createCampaign();
    expect(campaignAddr).to.match(/^0x[0-9a-fA-F]{40}$/);
    expect(await factory.campaignCount()).to.equal(1n);
    expect(await factory.campaigns(0)).to.equal(campaignAddr);
  });

  it("organizer of the deployed campaign is the caller, not the factory", async function () {
    const { campaignAddr } = await createCampaign(alice);
    const Crowdfund = await ethers.getContractFactory("UsdGoalCrowdfund");
    const crowdfund = Crowdfund.attach(campaignAddr);
    expect((await crowdfund.organizer()).toLowerCase()).to.equal(
      (await alice.getAddress()).toLowerCase()
    );
  });

  it("CampaignCreated event contains correct metadata", async function () {
    const ts = await currentTimestamp();
    const deadline = BigInt(ts + ONE_HOUR);
    const tx = await factory.connect(alice).createCampaign(
      GOAL_USD,
      deadline,
      "My Title",
      "My description here"
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log: any) => {
        try { return factory.interface.parseLog(log); } catch { return null; }
      })
      .find((e: any) => e?.name === "CampaignCreated");

    expect(event!.args.title).to.equal("My Title");
    expect(event!.args.description).to.equal("My description here");
    expect(event!.args.goalUsd).to.equal(GOAL_USD);
    expect(event!.args.organizer.toLowerCase()).to.equal(
      (await alice.getAddress()).toLowerCase()
    );
  });

  it("campaignCount increments with each deployment", async function () {
    const before = await factory.campaignCount();
    await createCampaign();
    expect(await factory.campaignCount()).to.equal(before + 1n);
  });

  it("getCampaigns returns correct slice", async function () {
    // Create 2 more to ensure we have enough
    await createCampaign();
    await createCampaign();
    const total = Number(await factory.campaignCount());
    const all   = await factory.getCampaigns(0, total);
    expect(all.length).to.equal(total);
    // slice from 1 to 2
    const slice = await factory.getCampaigns(1, 2);
    expect(slice.length).to.equal(1);
    expect(slice[0]).to.equal(all[1]);
  });

  it("getCampaigns clamps 'to' at campaigns.length", async function () {
    const total = Number(await factory.campaignCount());
    const all   = await factory.getCampaigns(0, total + 999);
    expect(all.length).to.equal(total);
  });

  it("getCampaigns returns empty array when 'from' >= length", async function () {
    const total = Number(await factory.campaignCount());
    const result = await factory.getCampaigns(total, total + 5);
    expect(result.length).to.equal(0);
  });

  it("reverts when title is empty", async function () {
    const ts = await currentTimestamp();
    await expect(
      factory.connect(alice).createCampaign(GOAL_USD, BigInt(ts + ONE_HOUR), "", "desc")
    ).to.be.revertedWith("title required");
  });

  it("reverts when title exceeds 100 chars", async function () {
    const ts    = await currentTimestamp();
    const title = "a".repeat(101);
    await expect(
      factory.connect(alice).createCampaign(GOAL_USD, BigInt(ts + ONE_HOUR), title, "desc")
    ).to.be.revertedWith("title too long");
  });

  it("reverts when description exceeds 500 chars", async function () {
    const ts   = await currentTimestamp();
    const desc = "x".repeat(501);
    await expect(
      factory.connect(alice).createCampaign(GOAL_USD, BigInt(ts + ONE_HOUR), "Title", desc)
    ).to.be.revertedWith("description too long");
  });
});
