import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeEventLog,
  getContract,
  http,
  keccak256,
  parseAbi,
  parseEventLogs,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  hashInvoiceMetadata,
  invoiceIdFromReference,
} from "../lib/invoiceMetadata.ts";
import { loadArtifact, startAnvil } from "./support/anvil.ts";

const enabled = process.env.STFLOW_INTEGRATION === "1";
const integration = enabled ? test : test.skip;

const merchantKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const payerKey =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const registryAbi = parseAbi([
  "error UnauthorizedPayer()",
  "event InvoiceCreated(bytes32 indexed id, address indexed merchant, address indexed payer, uint128 amount, uint64 dueAt, bytes32 metadataHash)",
  "event InvoicePaid(bytes32 indexed id, address indexed payer, address indexed merchant, uint128 amount)",
  "function createInvoice(bytes32 referenceId, address payer, uint128 amount, uint64 dueAt, bytes32 metadataHash) returns (bytes32)",
  "function getInvoice(bytes32 id) view returns ((bytes32 id,address merchant,address payer,uint128 amount,uint64 createdAt,uint64 dueAt,uint64 paidAt,bytes32 metadataHash,uint8 status))",
  "function getInvoiceIds(address wallet,uint256 offset,uint256 limit) view returns (bytes32[])",
  "function invoiceCount(address wallet) view returns (uint256)",
  "function payInvoice(bytes32 id)",
]);

const usdcAbi = parseAbi([
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function mint(address account,uint256 amount)",
]);

integration("settles an invoice only from its assigned payer", async (t) => {
  const anvil = await startAnvil();
  t.after(() => anvil.stop());

  const transport = http(anvil.rpcUrl);
  const merchant = privateKeyToAccount(merchantKey);
  const payer = privateKeyToAccount(payerKey);
  const merchantClient = anvil.wallet(merchant, transport);
  const payerClient = anvil.wallet(payer, transport);
  const publicClient = anvil.public(transport);

  const usdcArtifact = await loadArtifact("contracts/out/MockUSDC.sol/MockUSDC.json");
  const registryArtifact = await loadArtifact(
    "contracts/out/STFlowInvoiceRegistry.sol/STFlowInvoiceRegistry.json",
  );

  const usdcHash = await merchantClient.deployContract({
    abi: usdcArtifact.abi,
    bytecode: usdcArtifact.bytecode,
  });
  const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcHash });
  assert.ok(usdcReceipt.contractAddress);

  const registryHash = await merchantClient.deployContract({
    abi: registryArtifact.abi,
    bytecode: registryArtifact.bytecode,
    args: [usdcReceipt.contractAddress],
  });
  const registryReceipt = await publicClient.waitForTransactionReceipt({
    hash: registryHash,
  });
  assert.ok(registryReceipt.contractAddress);

  const usdc = getContract({
    address: usdcReceipt.contractAddress,
    abi: usdcAbi,
    client: { public: publicClient, wallet: merchantClient },
  });
  const registry = getContract({
    address: registryReceipt.contractAddress,
    abi: registryAbi,
    client: { public: publicClient, wallet: merchantClient },
  });

  const amount = 168_000000n;
  const referenceId = keccak256(toBytes("stflow:integration:invoice:001"));
  const metadataHash = hashInvoiceMetadata({
    customerName: "Assigned payer",
    title: "USDC checkout invoice",
    description: "Arc integration settlement",
    memo: "test-only",
  });
  const block = await publicClient.getBlock();
  const dueAt = block.timestamp + 3_600n;
  const invoiceId = invoiceIdFromReference(merchant.address, referenceId);

  const mintHash = await usdc.write.mint([payer.address, amount]);
  await publicClient.waitForTransactionReceipt({ hash: mintHash });

  const createHash = await registry.write.createInvoice([
    referenceId,
    payer.address,
    amount,
    dueAt,
    metadataHash,
  ]);
  const createReceipt = await publicClient.waitForTransactionReceipt({
    hash: createHash,
  });
  const created = parseEventLogs({
    abi: registryAbi,
    eventName: "InvoiceCreated",
    logs: createReceipt.logs,
  });
  assert.equal(created.length, 1);
  assert.deepEqual(created[0].args, {
    id: invoiceId,
    merchant: merchant.address,
    payer: payer.address,
    amount,
    dueAt,
    metadataHash,
  });

  const stored = await registry.read.getInvoice([invoiceId]);
  assert.equal(stored.id, invoiceId);
  assert.equal(stored.merchant, merchant.address);
  assert.equal(stored.payer, payer.address);
  assert.equal(stored.amount, amount);
  assert.equal(stored.dueAt, dueAt);
  assert.equal(stored.metadataHash, metadataHash);
  assert.equal(stored.status, 0);
  assert.deepEqual(await registry.read.getInvoiceIds([merchant.address, 0n, 10n]), [
    invoiceId,
  ]);
  assert.deepEqual(await registry.read.getInvoiceIds([payer.address, 0n, 10n]), [
    invoiceId,
  ]);
  assert.equal(await registry.read.invoiceCount([merchant.address]), 1n);
  assert.equal(await registry.read.invoiceCount([payer.address]), 1n);

  await assert.rejects(
    publicClient.simulateContract({
      address: registry.address,
      abi: registryAbi,
      account: merchant,
      functionName: "payInvoice",
      args: [invoiceId],
    }),
    /UnauthorizedPayer/,
  );
  const rejectedHash = await merchantClient.writeContract({
    address: registry.address,
    abi: registryAbi,
    functionName: "payInvoice",
    args: [invoiceId],
    gas: 100_000n,
  });
  const rejectedReceipt = await publicClient.waitForTransactionReceipt({
    hash: rejectedHash,
  });
  assert.equal(rejectedReceipt.status, "reverted");

  const payerUsdc = getContract({
    address: usdc.address,
    abi: usdcAbi,
    client: { public: publicClient, wallet: payerClient },
  });
  const approveHash = await payerUsdc.write.approve([registry.address, amount]);
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  assert.equal(await payerUsdc.read.allowance([payer.address, registry.address]), amount);

  const merchantBefore = await usdc.read.balanceOf([merchant.address]);
  const payerBefore = await usdc.read.balanceOf([payer.address]);
  const payHash = await payerClient.writeContract({
    address: registry.address,
    abi: registryAbi,
    functionName: "payInvoice",
    args: [invoiceId],
  });
  const payReceipt = await publicClient.waitForTransactionReceipt({ hash: payHash });
  assert.equal(payReceipt.status, "success");

  const paid = payReceipt.logs
    .map((log) => {
      try {
        return decodeEventLog({ abi: registryAbi, data: log.data, topics: log.topics });
      } catch {
        return null;
      }
    })
    .filter((log) => log?.eventName === "InvoicePaid");
  assert.equal(paid.length, 1);
  assert.deepEqual(paid[0]?.args, {
    id: invoiceId,
    payer: payer.address,
    merchant: merchant.address,
    amount,
  });

  const settled = await registry.read.getInvoice([invoiceId]);
  assert.equal(settled.status, 1);
  assert.ok(settled.paidAt > 0n);
  assert.equal(await usdc.read.balanceOf([merchant.address]), merchantBefore + amount);
  assert.equal(await usdc.read.balanceOf([payer.address]), payerBefore - amount);
  assert.equal(await usdc.read.balanceOf([registry.address]), 0n);
});
