import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployEscrowDeal: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer, seller, buyer, guarantor } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Price locked in escrow (1 ETH by default — change as needed)
  const price = hre.ethers.parseEther("1");

  await deploy("EscrowDeal", {
    from: deployer,
    args: [seller, buyer, guarantor, price],
    log: true,
    autoMine: true,
  });

  const escrow: Contract = await hre.ethers.getContract("EscrowDeal", deployer);
  console.log("📝 Escrow state:", await escrow.state()); // 0 = AwaitingPayment
};

export default deployEscrowDeal;
deployEscrowDeal.tags = ["EscrowDeal"];
