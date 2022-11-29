import { ethers } from "ethers";
import {
  ERC20_ABI,
  getSimpleWallet,
  getGasFee,
  printOp,
  getHttpRpcClient,
} from "../../src";
// @ts-ignore
import config from "../../config.json";

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const walletAPI = getSimpleWallet(
    provider,
    config.signingKey,
    config.entryPoint,
    config.simpleWalletFactory
  );

  const token = ethers.utils.getAddress(process.argv[2]);
  const to = ethers.utils.getAddress(process.argv[3]);
  const value = process.argv[4];
  const erc20 = new ethers.Contract(token, ERC20_ABI, provider);
  const [symbol, decimals] = await Promise.all([
    erc20.symbol(),
    erc20.decimals(),
  ]);
  const amount = ethers.utils.parseUnits(value, decimals);
  console.log(`Transferring ${value} ${symbol}...`);

  const op = await walletAPI.createSignedUserOp({
    target: erc20.address,
    data: erc20.interface.encodeFunctionData("transfer", [to, amount]),
    ...(await getGasFee(provider)),
  });
  console.log(`Signed UserOperation: ${await printOp(op)}`);

  const client = await getHttpRpcClient(
    provider,
    config.bundlerUrl,
    config.entryPoint
  );
  const reqId = await client.sendUserOpToBundler(op);
  console.log(`RequestID: ${reqId}`);

  console.log("Waiting for transaction...");
  const txHash = await walletAPI.getUserOpReceipt(reqId);
  console.log(`Transaction hash: ${txHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
