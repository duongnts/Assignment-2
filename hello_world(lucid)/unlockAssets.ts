import { Blockfrost, Data, Lucid, SpendingValidator, TxHash, Address, Addresses, fromText, Redeemer, UTxO, Constr, } from "https://deno.land/x/lucid/mod.ts";

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

// Define PlutusV2 smart contract (spending validator) in hex format
const script: SpendingValidator = lucid.newScript({
  type: "PlutusV2",
  script: CBORHEX
});
const contractAddress: Address = script.toAddress();
console.log(`SC address: ${contractAddress}`);

// Get public key hash from wallet address
const { payment } = Addresses.inspect(await lucid.wallet.address());
const publicKeyHash = payment.hash;

// Define datum structure with an owner field (string)
const Datum = Data.Object({
    owner: Data.String,
});

// Create static TypeScript type for datum
type Datum = Data.Static<typeof Datum>;

// Async function to unlock assets from smart contract using UTxOs and redeemer
async function unlockAssests(
    utxos: UTxO[], // List of unspent transaction outputs
    { validator, redeemer }: { validator: SpendingValidator; redeemer: Redeemer } // Validator script and redeemer
): Promise<TxHash> {
    // Create and complete transaction to unlock assets
    const tx = await lucid
        .newTx()
        .collectFrom(utxos, redeemer) // Collect UTxOs with redeemer
        .addSigner(publicKeyHash) // Add signer
        .attachScript(validator) // Attach Plutus validator
        .commit();
    
    // Sign and finalize the transaction
    const signedTx = await tx.sign().commit();

    // Submit transaction and return its hash
    return signedTx.submit();
}

// Main async function to execute the logic
async function main() {
    // Fetch all UTxOs at the contract address
    const scriptUTxOs = await lucid.utxosAt(contractAddress);

    // Filter UTxOs where the datum's owner matches the wallet's public key hash
    const utxos = scriptUTxOs.filter((utxo) => {
        try {
            const temp = Data.from<Datum>(utxo.datum ?? '', Datum); // Parse datum
            if (temp.owner === publicKeyHash) {
                return true; // Include UTxO if owner matches
            }
            return false;
        } catch (e) {
            console.log(e); // Log errors during datum parsing
            return false;
        }
    });

    // Create redeemer with "Hello world!" in hex format
    const redeemer = Data.to(new Constr(0, [fromText("Hello world!")]));

    // Unlock assets from filtered UTxOs using the validator and redeemer
    const txHash = await unlockAssests(utxos, { validator: script, redeemer });

    // Wait for transaction confirmation on the blockchain
    await lucid.awaitTx(txHash);

    // Log transaction hash and redeemer
    console.log(`Tx hash: ${txHash}\n redeemer: ${redeemer}`);
}

// Run the main function
main();