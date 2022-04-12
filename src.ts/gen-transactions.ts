//import { FeeMarketEIP1559Transaction } from "@ethereumjs/tx";
//console.log(FeeMarketEIP1559Transaction);
import { default as CC } from "@ethereumjs/common";
import { Chain, Hardfork } from '@ethereumjs/common'
const Common = (<any>CC).default;

import { rlp } from 'ethereumjs-util'
import TX from "@ethereumjs/tx";
const { AccessListEIP2930Transaction, FeeMarketEIP1559Transaction, Transaction } = TX;
import { Random } from "./random.js";

export interface TestCaseTransactionTx {
    to?: string;
    nonce?: number;
    gasLimit?: string;

    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;

    data?: string;
    value?: string;

    accessList?: Array<{ address: string, storageKeys: Array<string> }>;

    chainId?: string;
}

export interface TestCaseTransaction {
    name: string;
    transaction: TestCaseTransactionTx;
    privateKey: string;

    unsignedLegacy: string;
    signedLegacy: string;
    unsignedEip155: string;
    signedEip155: string;
    unsignedBerlin: string;
    signedBerlin: string;
    unsignedLondon: string;
    signedLondon: string;
}


function genTransaction(name: string, privateKey: string, tx: TestCaseTransactionTx): TestCaseTransaction {
    const legacy = Object.assign({ }, tx, { type: 0, chainId: 0, maxPriorityFeePerGas: undefined, maxFeePerGas: undefined, accessList: undefined });
    const legacyCommon = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.Homestead });
    let txLegacy = Transaction.fromTxData(legacy, { common: legacyCommon });
    const unsignedLegacy = "0x" + rlp.encode(txLegacy.getMessageToSign(false)).toString("hex");
    txLegacy = txLegacy.sign(Buffer.from(privateKey.substring(2), "hex"));
    const signedLegacy = "0x" + txLegacy.serialize().toString("hex");

    const eip155 = Object.assign({ }, tx, { type: 0 }, { maxPriorityFeePerGas: undefined, maxFeePerGas: undefined, accessList: undefined });
    const eip155Common = Common.custom({ chainId: parseInt(tx.chainId || "0"), hardfork: Hardfork.SpuriousDragon });
    let txEip155 = Transaction.fromTxData(eip155, { common: eip155Common })
    let unsignedEip155 = "0x" + rlp.encode(txEip155.getMessageToSign(false)).toString("hex");
    txEip155 = txEip155.sign(Buffer.from(privateKey.substring(2), "hex"));
    let signedEip155 = "0x" + txEip155.serialize().toString("hex");

    // EIP-155 doesn't support chainId of 0
    if (tx.chainId == null) {
        unsignedEip155 = signedEip155 = "";
    }

    const berlin = Object.assign({ }, tx, { type: 1 }, { maxPriorityFeePerGas: undefined, maxFeePerGas: undefined });
    if (berlin.chainId == null) { berlin.chainId = "0x00"; }
    let txBerlin = AccessListEIP2930Transaction.fromTxData(berlin)
    const unsignedBerlin = "0x" + txBerlin.getMessageToSign(false).toString("hex");
    txBerlin = txBerlin.sign(Buffer.from(privateKey.substring(2), "hex"));
    const signedBerlin = "0x" + txBerlin.serialize().toString("hex");

    const london = Object.assign({ }, tx, { type: 2 }, { gasPrice: undefined });
    if (london.chainId == null) { london.chainId = "0x00"; }
    let txLondon = FeeMarketEIP1559Transaction.fromTxData(london)
    const unsignedLondon = "0x" + txLondon.getMessageToSign(false).toString("hex");
    txLondon = txLondon.sign(Buffer.from(privateKey.substring(2), "hex"));
    const signedLondon = "0x" + txLondon.serialize().toString("hex");

    return {
        name, transaction: tx, privateKey,
        unsignedLegacy, unsignedEip155, unsignedBerlin, unsignedLondon,
        signedLegacy, signedEip155, signedBerlin, signedLondon
    }
}

export async function gen_transactions(): Promise<Array<TestCaseTransaction>> {
    const output: Array<TestCaseTransaction> = [ ];

    for (let i = 0; i < 128; i++) {
        const name = `random-${ i }`;
        const random = new Random(name);
        const privateKey = random.hexString(32);

        const accessList = [ ];
        {
            const addrCount = random.int(0, 4);
            const keyCount = random.int(0, 4);

            const storageKeys = [ ];
            for (let j = 0; j < keyCount; j++) {
                storageKeys.push(random.hexString(32));
            }

            for (let j = 0; j < addrCount; j++) {
                const address = random.hexString(20);
                accessList.push({ address, storageKeys });
            }
        }

        const tx = {
            to: random.hexString(20),
            nonce: random.int(0, 1000),
            gasLimit: random.hexString(1, 5),

            gasPrice: random.hexString(1, 5),
            maxFeePerGas: random.hexString(4, 7),
            maxPriorityFeePerGas: random.hexString(1, 3),

            data: random.hexString(0, 128),
            value: random.hexString(1, 5),
            accessList,

            chainId: random.hexString(1, 5),
        };
        output.push(genTransaction(name, privateKey, tx));
    }

    // Try all possible default values
    {
        const random = new Random("defaults");
        const privateKey = random.hexString(32);
        const tx: any = {
            to: random.hexString(20),
            nonce: random.int(100, 1000),
            gasLimit: random.hexString(1, 5),

            gasPrice: random.hexString(1, 5),
            maxFeePerGas: random.hexString(1, 5),
            maxPriorityFeePerGas: random.hexString(1, 5),

            data: random.hexString(1, 128),
            value: random.hexString(1, 5),
            accessList: [
                {
                    address: random.hexString(20),
                    storageKeys: [
                        random.hexString(32),
                        random.hexString(32),
                        random.hexString(32),
                    ]
                }
            ],

            chainId: random.hexString(1, 5),
        };
        const keys = Object.keys(tx);
        for (let i = 0; i < (1 << keys.length); i++) {
            let name = "masked-";
            const maskedTx: any = { };
            keys.forEach((key, index) => {
                const mask = (1 << index);
                if ((i & mask) === mask) {
                    name += "1";
                    maskedTx[key] = tx[key];
                } else {
                    name += "0";
                }
            })

            // Invalid configuration
            if (!maskedTx.maxFeePerGas && maskedTx.maxPriorityFeePerGas) {
                continue;
            }

            output.push(genTransaction(name, privateKey, maskedTx));
        }
    }

    return output;
}
