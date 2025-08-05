import { Blockfrost, Data, Lucid, SpendingValidator, TxHash, Address, paymentCredentialOf } from "https://deno.land/x/lucid/mod.ts";

// Initialize environment variables
const BLOCKFROST_API_KEY = Deno.env.get("BLOCKFROST_API_KEY")
const SEED_PHRASES = Deno.env.get("SEED_PHRASES")
const CBORHEX = Deno.env.get("CBORHEX")

// Initialize Lucid with Blockfrost provider for Cardano Preview network
const lucid = new Lucid({
  provider: new Blockfrost(
    "https://cardano-preview.blockfrost.io/api/v0",
    BLOCKFROST_API_KEY,
  ),
});
// Select wallet using mnemonic seed phrase for transaction signing
lucid.selectWalletFromSeed(SEED_PHRASES);

// Get public key hash from wallet address
const addr = await lucid.wallet.address();
const publicKeyHash = paymentCredentialOf(addr).hash;

// Define PlutusV2 smart contract (spending validator) in hex format
const script: SpendingValidator = lucid.newScript({
  type: "PlutusV2",
  script: CBORHEX
});
const contractAddress: Address = script.toAddress();
console.log(`SC address: ${contractAddress}`);

// Define datum structure with an owner field (string)
const Datum = Data.Object({
    owner: Data.String,
});

// Create static TypeScript type for datum
type Datum = Data.Static<typeof Datum>;

// Async function to lock assets (lovelace) with datum into smart contract
async function lockAssets(
    lovelace: bigint, // Amount to lock in lovelace
    { datum }: { datum: string } // Datum to attach to the transaction
): Promise<TxHash> {

    // Create and complete transaction to lock assets with datum
    const tx = await lucid
        .newTx()
        .payToContract(contractAddress, { Inline: datum }, { lovelace: lovelace })
        .commit();
    
    // Sign and finalize the transaction
    const signedTx = await tx.sign().commit();
    
    // Submit transaction and return its hash
    return signedTx.submit();
}

// Main async function to execute the logic
async function main() {
    // Create datum with wallet's public key hash (or default if undefined)
    const datum = Data.to<Datum>({
        owner: publicKeyHash ?? '00000000000000000000000000000000000000000000000000000000',
    }, Datum);

    // Lock 4,000,000 lovelace with the datum
    const txHash = await lockAssets(4000000n, { datum });

    // Wait for transaction confirmation on the blockchain
    await lucid.awaitTx(txHash);

    // Log transaction hash and datum
    console.log(`Tx hash: ${txHash}\ndatum: ${datum}`);
}

// Run the main function
main();