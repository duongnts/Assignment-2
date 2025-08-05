// Import necessary utilities from MeshSDK and local common module
import { Asset, deserializeAddress, mConStr0 } from "@meshsdk/core";
import { getScript, getTxBuilder, wallet } from "./common";

// Main async function to lock assets into a smart contract
async function main() {
  // Define assets to lock (40,000,000 lovelace = 40 tADA)
  const assets: Asset[] = [
    {
      unit: "lovelace",
      quantity: "40000000",
    },
  ];

  // Fetch wallet's available UTxOs
  const utxos = await wallet.getUtxos();

  // Get wallet's used address (first one)
  const walletAddress = (await wallet.getUsedAddresses())[0];

  // Get Plutus script address from getScript function
  const { scriptAddr } = getScript();
  console.log("Script Address: ", scriptAddr);

  // Extract public key hash from wallet address
  const signerHash = deserializeAddress(walletAddress).pubKeyHash;

  // Initialize transaction builder
  const txBuilder = getTxBuilder();

  // Build transaction: send assets to script address with datum
  await txBuilder
    .txOut(scriptAddr, assets) // Send assets to script address
    .txOutDatumHashValue(mConStr0([signerHash])) // Attach datum with signer hash
    .changeAddress(walletAddress) // Set change address to wallet
    .selectUtxosFrom(utxos) // Select UTxOs for transaction
    .complete(); // Finalize transaction

  // Get unsigned transaction hex
  const unsignedTx = txBuilder.txHex;

  // Sign transaction with wallet
  const signedTx = await wallet.signTx(unsignedTx);

  // Submit transaction and get transaction hash
  const txHash = await wallet.submitTx(signedTx);

  // Log transaction hash
  console.log(`40 tADA locked into the contract at Tx ID: ${txHash}`);
}

// Execute main function
main();