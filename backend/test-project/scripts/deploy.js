async function main() {
  const Lock = await ethers.getContractFactory("Lock");
  const lock = await Lock.deploy();
  await lock.waitForDeployment();
  console.log("Contract deployed to:", await lock.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
