// Import required modules from MeshSDK for Cardano blockchain interaction
import {
    BlockfrostProvider,
    MeshTxBuilder,
    MeshWallet,
    PlutusScript,
    serializePlutusScript,
    UTxO,
    resolvePlutusScriptAddress
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import blueprint from "./plutus.json"; // Import Plutus script blueprint

// Initialize Blockfrost provider for Cardano Preview network
export const blockchainProvider = new BlockfrostProvider('');

// Initialize Mesh wallet with Blockfrost provider for transaction handling
export const wallet = new MeshWallet({
    networkId: 0, // Preview network
    fetcher: blockchainProvider, // Fetch blockchain data
    submitter: blockchainProvider, // Submit transactions
    key: {
        type: 'mnemonic',
        words: [] // Placeholder for mnemonic words
    },
});

// Function to generate Plutus script and its address
export function getScript() {
    // Apply parameters to compiled Plutus script from blueprint
    const scriptCbor = applyParamsToScript(
        blueprint.validators[0].compiledCode, // Compiled script code
        [] // No parameters applied
    );
    // Define Plutus script with CBOR code and version
    const script: PlutusScript = {
        code: scriptCbor,
        version: "V3"
    };

    // Serialize script to get its Cardano address
    const scriptAddr = serializePlutusScript(
        { code: scriptCbor, version: "V3" }, undefined, 0
    ).address;

    // Return script CBOR and address
    return { scriptCbor, scriptAddr };
}

// Function to create a transaction builder instance
export function getTxBuilder() {
    return new MeshTxBuilder({
        fetcher: blockchainProvider, // Fetch blockchain data
        submitter: blockchainProvider, // Submit transactions
        verbose: true, // Enable detailed logging
    });
}

// Async function to fetch a UTxO by transaction hash
export async function getUtxoByTxHash(txHash: string): Promise<UTxO> {
    // Fetch UTxOs for the given transaction hash
    const utxos = await blockchainProvider.fetchUTxOs(txHash);
    if (utxos.length === 0) {
        throw new Error("UTxO not found"); // Error if no UTxOs found
    }
    return utxos[0]; // Return first UTxO
}

// Async function to get wallet info for transaction building
export async function getWalletInfoForTx(wallet) {
    // Fetch wallet's UTxOs
    const utxos = await wallet.getUtxos();
    // Get wallet's change address
    const walletAddress = await wallet.getChangeAddress();
    // Get first collateral UTxO
    const collateral = (await wallet.getCollateral())[0];
    // Return wallet info
    return { utxos, walletAddress, collateral };
}

// Async function to fetch a specific UTxO by address and transaction hash
export async function getUtxoForTx(address: string, txHash: string, wallet: any) {
    // Fetch UTxOs at the given address
    const utxos: UTxO[] = await wallet.fetchAddressUTxOs(address);
    // Find UTxO matching the transaction hash
    const utxo = utxos.find(function (utxo: UTxO) {
        return utxo.input.txHash === txHash;
    });

    if (!utxo) throw new Error("No UTXOs found in getUtxoForTx method."); // Error if no matching UTxO
    return utxo; // Return matching UTxO
}