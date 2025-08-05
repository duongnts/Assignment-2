// Import necessary utilities from MeshSDK and local common module
import {
    deserializeAddress,
    mConStr0,
    stringToHex,
} from "@meshsdk/core";
import { getScript, getTxBuilder, getUtxoByTxHash, getWalletInfoForTx, wallet } from "./common";
import { blockchainProvider } from "./common";

// Main async function to unlock assets from a smart contract
async function main() {
    // Fetch wallet info: UTxOs, address, and collateral
    const {utxos, walletAddress, collateral} = await getWalletInfoForTx(wallet);

    // Fetch specific UTxO from the blockchain using transaction hash
    const scriptUtxo = (await blockchainProvider.fetchUTxOs('f8841ca6d6311e16f2d244319af252c2e7c2b23b1bd2b550bbc85aed8c3604d8'))[0];
    console.log("Script UTXO: ", scriptUtxo);

    // Get Plutus script CBOR code
    const { scriptCbor } = getScript();
    console.log("Script Cbor: ", scriptCbor);

    // Extract public key hash from wallet address
    const signerHash = deserializeAddress(walletAddress).pubKeyHash;

    // Define message for redeemer
    const message = "Hello, World!";

    // Initialize transaction builder
    const txBuilder = getTxBuilder();

    // Build transaction to unlock assets from script
    await txBuilder
      .spendingPlutusScript("V3") // Specify Plutus V3 script
      .txIn( 
        scriptUtxo.input.txHash, // UTxO transaction hash
        scriptUtxo.input.outputIndex, // UTxO output index
        scriptUtxo.output.amount, // UTxO amount
        scriptUtxo.output.address // UTxO address
      )
      .txInScript(scriptCbor) // Attach Plutus script
      .txInRedeemerValue(mConStr0([stringToHex(message)])) // Attach redeemer with message
      .txInDatumValue(mConStr0([signerHash])) // Attach datum with signer hash
      .requiredSignerHash(signerHash) // Specify required signer
      .changeAddress(walletAddress) // Set change address to wallet
      .txInCollateral(
        collateral.input.txHash, // Collateral transaction hash
        collateral.input.outputIndex, // Collateral output index
        collateral.output.amount, // Collateral amount
        collateral.output.address // Collateral address
      )
      .selectUtxosFrom(utxos) // Select wallet UTxOs for transaction
      .complete(); // Finalize transaction

    // Get unsigned transaction hex
    const unsignedTx = txBuilder.txHex;

    // Sign transaction with wallet
    const signedTx = await wallet.signTx(unsignedTx);

    // Submit transaction and get transaction hash
    const txHash = await wallet.submitTx(signedTx);

    // Log transaction hash
    console.log(`40 tADA unlocked from the contract at Tx ID: ${txHash}`);
}

// Execute main function
main();