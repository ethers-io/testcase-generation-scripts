//import { privateToAddress, toChecksumAddress } from "ethereumjs-util";
import { toChecksumAddress } from "ethereumjs-util";

import { loadContent, loadContentFolder } from "./utils.js";

export interface TestCaseWallet {
    name: string;
    filename: string,
    type: string;
    address: string;
    password: string;
    content: string;
}

//    let address = hexlify(privateToAddress(buf(privateKey)));

export async function gen_wallets(): Promise<Array<TestCaseWallet>> {
    const output: Array<TestCaseWallet> = [ ];
    for (const filename of loadContentFolder("wallets")) {
        const [ name, _type, _address, _password ] = filename.split(".")[0].split("-");
        const type = (_type === "ks") ? "keystore": (_type === "cs") ? "crowdsale": "unknown";
        const address = toChecksumAddress("0x" + _address);
        const password = (_password.substring(0, 2) === "0x") ? _password: ("0x" + Buffer.from(_password).toString("hex"));
        const content = loadContent("wallets", filename).toString();
        output.push({
            name, filename, type, address, password, content
        });
    }
    return output;
}
