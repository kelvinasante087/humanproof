import { describe, expect, it } from "vitest";
import ganache from "ganache";
import solc from "solc";
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, custom, keccak256, toBytes, parseEther, type Abi } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

describe("Airdroppa payout contract", () => {
  it("only pays an issuer-authorized recipient once; cancelled, forged and expired vouchers do not consume eligibility", async () => {
    const provider = ganache.provider({ logging: { quiet: true }, chain: { hardfork: "shanghai", chainId: 84532 }, wallet: { deterministic: true } });
    try {
      const accounts = Object.values(provider.getInitialAccounts()).slice(0, 3).map(a => privateKeyToAccount(a.secretKey as `0x${string}`));
      const [issuer, human, attacker] = accounts;
      const transport = custom(provider);
      const chain = { id: 84532, name: "Local Base Sepolia test", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://localhost"] } } };
      const client = createPublicClient({ chain, transport });
      const wallets = accounts.map(account => createWalletClient({ account, chain, transport }));
      const source = readFileSync(new URL("../contracts/ProofToken.sol", import.meta.url), "utf8").replace(/^\uFEFF/, "");
      const output = JSON.parse(solc.compile(JSON.stringify({ language: "Solidity", sources: { "ProofToken.sol": { content: source } }, settings: { evmVersion: "shanghai", optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } })));
      expect(output.errors?.filter((e: { severity: string }) => e.severity === "error") ?? []).toHaveLength(0);
      const artifact = output.contracts["ProofToken.sol"].ProofToken;
      const abi = artifact.abi as Abi;
      const hash = await wallets[0].deployContract({ abi, bytecode: `0x${artifact.evm.bytecode.object}`, args: [issuer.address] });
      const receipt = await client.waitForTransactionReceipt({ hash });
      const address = receipt.contractAddress!;
      const claimId = keccak256(toBytes("human-one-campaign-one"));
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const domain = { name: "Airdroppa", version: "1", chainId: 84532, verifyingContract: address };
      const types = { Claim: [{ name: "claimId", type: "bytes32" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }] } as const;
      const message = { claimId, recipient: human.address, deadline };
      const signature = await issuer.signTypedData({ domain, types, primaryType: "Claim", message });
      const forged = await privateKeyToAccount(generatePrivateKey()).signTypedData({ domain, types, primaryType: "Claim", message });
      await expect(client.simulateContract({ address, abi, functionName: "claim", args: [claimId, deadline, forged], account: human })).rejects.toThrow();
      await expect(client.simulateContract({ address, abi, functionName: "claim", args: [claimId, deadline, signature], account: attacker })).rejects.toThrow();
      await expect(client.simulateContract({ address, abi, functionName: "claim", args: [claimId, BigInt(1), signature], account: human })).rejects.toThrow();
      // Old unrestricted selector and signatures for another campaign cannot mint.
      await expect(client.call({ account: attacker, to: address, data: keccak256(toBytes("claim()")).slice(0, 10) as `0x${string}` })).rejects.toThrow();
      const otherDomain = await issuer.signTypedData({ domain: { ...domain, chainId: 1 }, types, primaryType: "Claim", message });
      await expect(client.simulateContract({ address, abi, functionName: "claim", args: [claimId, deadline, otherDomain], account: human })).rejects.toThrow();
      // Issuing an authorization without submitting it (cancel/close) changes no chain state.
      expect(await client.readContract({ address, abi, functionName: "totalSupply" })).toBe(BigInt(0));
      const payout = await wallets[1].writeContract({ address, abi, functionName: "claim", args: [claimId, deadline, signature] });
      expect((await client.waitForTransactionReceipt({ hash: payout })).status).toBe("success");
      expect(await client.readContract({ address, abi, functionName: "balanceOf", args: [human.address] })).toBe(parseEther("500"));
      await expect(client.simulateContract({ address, abi, functionName: "claim", args: [claimId, deadline, signature], account: human })).rejects.toThrow();
      const secondWallet = await issuer.signTypedData({ domain, types, primaryType: "Claim", message: { ...message, recipient: attacker.address } });
      await expect(client.simulateContract({ address, abi, functionName: "claim", args: [claimId, deadline, secondWallet], account: attacker })).rejects.toThrow();
      expect(await client.readContract({ address, abi, functionName: "totalSupply" })).toBe(parseEther("500"));
    } finally { await provider.disconnect(); }
  });
});
