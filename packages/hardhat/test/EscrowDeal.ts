import { expect } from "chai";
import { ethers } from "hardhat";
import { EscrowDeal } from "../typechain-types";

describe("EscrowDeal", () => {
  const PRICE_ETH = "1";

  let seller: any;
  let buyer: any;
  let guarantor: any;
  let outsider: any;
  let deal: EscrowDeal;

  beforeEach(async () => {
    [seller, buyer, guarantor, outsider] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("EscrowDeal");
    deal = (await Escrow.deploy(
      seller.address,
      buyer.address,
      guarantor.address,
      ethers.parseEther(PRICE_ETH),
    )) as EscrowDeal;
    await deal.waitForDeployment();
  });

  describe("Deployment", () => {
    it("initial state", async () => {
      expect(await deal.seller()).to.equal(seller.address);
      expect(await deal.buyer()).to.equal(buyer.address);
      expect(await deal.guarantor()).to.equal(guarantor.address);
      expect(await deal.price()).to.equal(ethers.parseEther(PRICE_ETH));
      expect(await deal.state()).to.equal(0); // AwaitingPayment
    });
  });

  describe("deposit()", () => {
    it("buyer deposits exact price", async () => {
      await expect(deal.connect(buyer).deposit({ value: ethers.parseEther(PRICE_ETH) }))
        .to.emit(deal, "Deposited")
        .withArgs(buyer.address, ethers.parseEther(PRICE_ETH));

      expect(await deal.state()).to.equal(1); // AwaitingConfirmation
    });

    it("reverts on wrong amount", async () => {
      await expect(deal.connect(buyer).deposit({ value: ethers.parseEther("0.5") })).to.be.revertedWith(
        "Incorrect amount",
      );
    });

    it("reverts when non-buyer calls", async () => {
      await expect(deal.connect(outsider).deposit({ value: ethers.parseEther(PRICE_ETH) })).to.be.revertedWith(
        "Only buyer",
      );
    });

    it("reverts if already funded", async () => {
      await deal.connect(buyer).deposit({ value: ethers.parseEther(PRICE_ETH) });
      await expect(deal.connect(buyer).deposit({ value: ethers.parseEther(PRICE_ETH) })).to.be.revertedWith(
        "Wrong state",
      );
    });
  });

  describe("cancelBeforeFunding()", () => {
    it("buyer may cancel before funding", async () => {
      await expect(deal.connect(buyer).cancelBeforeFunding()).to.emit(deal, "Cancelled").withArgs(buyer.address);

      expect(await deal.state()).to.equal(3); // Cancelled
    });

    it("seller may cancel before funding", async () => {
      await deal.connect(seller).cancelBeforeFunding();
      expect(await deal.state()).to.equal(3);
    });

    it("outsider cannot cancel", async () => {
      await expect(deal.connect(outsider).cancelBeforeFunding()).to.be.revertedWith("Not a participant");
    });

    it("cannot cancel after funding", async () => {
      await deal.connect(buyer).deposit({ value: ethers.parseEther(PRICE_ETH) });
      await expect(deal.connect(buyer).cancelBeforeFunding()).to.be.revertedWith("Wrong state");
    });
  });

  describe("confirmTransfer()", () => {
    beforeEach(async () => {
      await deal.connect(buyer).deposit({ value: ethers.parseEther(PRICE_ETH) });
    });

    it("guarantor confirms, funds go to seller", async () => {
      await expect(deal.connect(guarantor).confirmTransfer()).to.changeEtherBalances(
        [seller, deal],
        [ethers.parseEther(PRICE_ETH), -ethers.parseEther(PRICE_ETH)],
      );

      expect(await deal.state()).to.equal(2); // Completed
    });

    it("non-guarantor cannot confirm", async () => {
      await expect(deal.connect(outsider).confirmTransfer()).to.be.revertedWith("Only guarantor");
    });

    it("cannot confirm twice", async () => {
      await deal.connect(guarantor).confirmTransfer();
      await expect(deal.connect(guarantor).confirmTransfer()).to.be.revertedWith("Wrong state");
    });
  });

  describe("refundBuyer()", () => {
    beforeEach(async () => {
      await deal.connect(buyer).deposit({ value: ethers.parseEther(PRICE_ETH) });
    });

    it("guarantor refunds buyer", async () => {
      await expect(deal.connect(guarantor).refundBuyer()).to.changeEtherBalances(
        [buyer, deal],
        [ethers.parseEther(PRICE_ETH), -ethers.parseEther(PRICE_ETH)],
      );

      expect(await deal.state()).to.equal(3); // Cancelled
    });

    it("cannot refund twice", async () => {
      await deal.connect(guarantor).refundBuyer();
      await expect(deal.connect(guarantor).refundBuyer()).to.be.revertedWith("Wrong state");
    });

    it("non-guarantor cannot refund", async () => {
      await expect(deal.connect(buyer).refundBuyer()).to.be.revertedWith("Only guarantor");
    });
  });

  describe("post-finalization protections", () => {
    it("no actions allowed after Completed", async () => {
      await deal.connect(buyer).deposit({ value: ethers.parseEther(PRICE_ETH) });
      await deal.connect(guarantor).confirmTransfer();

      await expect(deal.connect(buyer).deposit({ value: ethers.parseEther(PRICE_ETH) })).to.be.revertedWith(
        "Wrong state",
      );

      await expect(deal.connect(guarantor).refundBuyer()).to.be.revertedWith("Wrong state");
    });

    it("no actions allowed after Cancelled via refund", async () => {
      await deal.connect(buyer).deposit({ value: ethers.parseEther(PRICE_ETH) });
      await deal.connect(guarantor).refundBuyer();

      await expect(deal.connect(buyer).deposit({ value: ethers.parseEther(PRICE_ETH) })).to.be.revertedWith(
        "Wrong state",
      );

      await expect(deal.connect(guarantor).confirmTransfer()).to.be.revertedWith("Wrong state");
    });
  });
});
