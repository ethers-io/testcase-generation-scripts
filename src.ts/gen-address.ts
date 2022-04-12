import { privateToAddress, toChecksumAddress } from "ethereumjs-util";
import ICAP from "ethereumjs-icap";
import { ethers } from "ethers";

import { Random } from "./random.js";
import { hexlify } from "./utils.js";


function buf(value: string): Buffer {
    const result = Buffer.from(value.substring(2), "hex");
    return result;
}

export type TestCaseAccount = {
    name: string;
    privateKey: string;
    address: string;
    icap: string;
};

export type TestCaseCreate = {
    sender: string;
    creates: Array<{
        name: string;
        nonce: number,
        address: string
    }>;
};

export type TestCaseCreate2 = {
    sender: string;
    creates: Array<{
        name: string;
        salt: string;
        initCode: string
        initCodeHash: string
        address: string;
    }>
};


function gen_account(name: string, privateKey: string): TestCaseAccount {
    let address = hexlify(privateToAddress(buf(privateKey)));
    const icap = ICAP.fromAddress(address, false, true);
    address = toChecksumAddress(address);
    return { name, privateKey, address, icap };
}

export async function gen_accounts(): Promise<Array<TestCaseAccount>> {
    const output: Array<TestCaseAccount> = [ ];

    output.push(gen_account("one", "0x0000000000000000000000000000000000000000000000000000000000000001"));
    output.push(gen_account("small", "0x0000000000000000000000000000000000006000000000000000000000000000"));
    output.push(gen_account("right-zero-bit", "0x0000000000000000000000000000000000000000000000000000000000000100"));

    // @TODO: Add one for icap with zeros nad addr with zeros at the top and bottom

    for (let i = 0; i < 256; i++) {
        const random = new Random(`gen_accounts-${ i }`)
        output.push(gen_account(`random-${ i }`, random.hexString(32)));
    }

    return output;
}

// Deploys random contracts to get their create address
export async function gen_create(): Promise<Array<TestCaseCreate>> {
    const output: Array<TestCaseCreate> = [ ];

    const provider = new ethers.providers.JsonRpcProvider("http:/\/localhost:8545");
    const signer = provider.getSigner();

    for (let i = 0; i < 16; i++) {
        const random = new Random(`gen_accounts-${ i }`)
        const wallet = new ethers.Wallet(random.hexString(32), provider);

        const fundTx = await signer.sendTransaction({
            to: wallet.address,
            value: ethers.utils.parseEther("1.0")
        });
        await fundTx.wait();

        const creates: Array<{ name: string, nonce: number, address: string}> = [ ];
        for (let nonce = 0; nonce < 256; nonce++) {
            const createTx = await wallet.sendTransaction({ nonce });
            const receipt = await createTx.wait();
            creates.push({ name: "placeholder", nonce, address: receipt.contractAddress });
        }
        random.shuffle(creates);
        creates.splice(10, creates.length - 10);

        output.push({
            sender: wallet.address,
            creates: creates.map((c, j) => {
                c.name = `random-${ i }.${ j }`;
                return c;
            })
        });

    }

    return output;
}

export async function gen_create2(): Promise<Array<TestCaseCreate2>> {
    const output: Array<TestCaseCreate2> = [ ];

    const provider = new ethers.providers.JsonRpcProvider("http:/\/localhost:8545");
    const signer = provider.getSigner();

    const abi = [
        "event Deployed(uint index, address addr, bytes32 initCodeHash, bytes initCode)",
        "constructor(bytes32[] memory salts, bytes32[] memory params)"
    ];
    const bytecode = "0x608060405234801561001057600080fd5b5060405161075538038061075583398181016040528101906100329190610232565b60005b825181101561016b5760008382815181106100535761005261058b565b5b602002602001015183838151811061006e5761006d61058b565b5b602002602001015160405161008290610173565b61008c9190610380565b8190604051809103906000f59050801580156100ac573d6000803e3d6000fd5b5090506000604051806020016100c190610173565b6020820181038252601f19601f820116604052508484815181106100e8576100e761058b565b5b6020026020010151604051602001610101929190610358565b60405160208183030381529060405290507fc8cb0cec1e845df878c456b08244f5a4f43f6224d733a855d0c17c995b52d1fb838383805190602001208460405161014e949392919061039b565b60405180910390a15050808061016390610509565b915050610035565b505050610625565b60e38061067283390190565b600061019261018d8461040c565b6103e7565b905080838252602082019050828560208602820111156101b5576101b46105ee565b5b60005b858110156101e557816101cb888261021d565b8452602084019350602083019250506001810190506101b8565b5050509392505050565b600082601f830112610204576102036105e9565b5b815161021484826020860161017f565b91505092915050565b60008151905061022c8161060e565b92915050565b60008060408385031215610249576102486105f8565b5b600083015167ffffffffffffffff811115610267576102666105f3565b5b610273858286016101ef565b925050602083015167ffffffffffffffff811115610294576102936105f3565b5b6102a0858286016101ef565b9150509250929050565b6102b38161045f565b82525050565b6102c281610471565b82525050565b6102d96102d482610471565b610552565b82525050565b60006102ea82610438565b6102f48185610443565b93506103048185602086016104a5565b61030d816105fd565b840191505092915050565b600061032382610438565b61032d8185610454565b935061033d8185602086016104a5565b80840191505092915050565b6103528161049b565b82525050565b60006103648285610318565b915061037082846102c8565b6020820191508190509392505050565b600060208201905061039560008301846102b9565b92915050565b60006080820190506103b06000830187610349565b6103bd60208301866102aa565b6103ca60408301856102b9565b81810360608301526103dc81846102df565b905095945050505050565b60006103f1610402565b90506103fd82826104d8565b919050565b6000604051905090565b600067ffffffffffffffff821115610427576104266105ba565b5b602082029050602081019050919050565b600081519050919050565b600082825260208201905092915050565b600081905092915050565b600061046a8261047b565b9050919050565b6000819050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565b60005b838110156104c35780820151818401526020810190506104a8565b838111156104d2576000848401525b50505050565b6104e1826105fd565b810181811067ffffffffffffffff82111715610500576104ff6105ba565b5b80604052505050565b60006105148261049b565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8214156105475761054661055c565b5b600182019050919050565b6000819050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b61061781610471565b811461062257600080fd5b50565b603f806106336000396000f3fe6080604052600080fdfea264697066735822122045af756ab97297ce287ff9a198ff94e00c697d57fd6fb06c02632bd3c1595b7b64736f6c634300080700336080604052348015600f57600080fd5b5060405160e338038060e38339818101604052810190602d9190604c565b80600081905550506097565b6000815190506046816083565b92915050565b600060208284031215605f57605e607e565b5b6000606b848285016039565b91505092915050565b6000819050919050565b600080fd5b608a816074565b8114609457600080fd5b50565b603f8060a46000396000f3fe6080604052600080fdfea2646970667358221220a32ca22663d59fb69eed5207435acdbbb7af0b9c8b4e7a096fddadb2ad231a5e64736f6c63430008070033";

    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    for (let i = 0; i < 16; i++) {
        const random = new Random(`gen_create2-${ i }`)

        const salts: Array<string> = [ ];
        const params: Array<string> = [ ];
        for (let j = 0; j < 8; j++) {
            salts.push(random.hexString(32));
            params.push(random.hexString(32));
        }

        const contract = await factory.deploy(salts, params);
        const receipt = await contract.deployTransaction.wait();

        output.push({
            sender: contract.address,
            creates: (<any>receipt).events.map((e: any, index: number) => ({
                name: `random-${ i }.${ index }`,
                salt: salts[e.args.index.toNumber()],
                initCode: e.args.initCode,
                initCodeHash: e.args.initCodeHash,
                address: e.args.addr
            }))
        });
    }

    return output;
}
