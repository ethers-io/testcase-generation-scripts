import bip39 from "bip39";

import { BIP32Factory } from "bip32";
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory(ecc);

import crypto from "crypto";

import { Random } from "./random.js";

function sha256(value: string): string {
    return "0x" + crypto.createHash("sha256").update(Buffer.from(value)).digest("hex");
}

export interface TestCaseMnemonicNode {
    path: string,
    chainCode: string;
    depth: number;
    index: number;
    parentFingerprint: string;
    fingerprint: string;
    publicKey: string;
    privateKey: string;
    xpriv: string;
    xpub: string;
}

export interface TestCaseMnemonic {
    name: string;
    phrase: string;
    phraseHash: string;
    password: string;
    locale: string;
    entropy: string;
    seed: string;
    nodes: Array<TestCaseMnemonicNode>;
};

const Locales: Record<string, string> = {
    cz: "czech",
    en: "english",
    ja: "japanese",
    es: "spanish",
    fr: "french",
    it: "italian",
    ko: "korean",
    pt: "portuguese",
    zh_cn: "chinese_simplified",
    zh_tw: "chinese_traditional",
};

function toHex(text: string): string {
    return "0x" + Buffer.from((new TextEncoder()).encode(text)).toString("hex");
}

function toHexInt(value: number): string {
    let hex = value.toString(16);
    while (hex.length < 8) { hex = "0" + hex; }
    return "0x" + hex;
}

function addNode(seed: string, path?: string): TestCaseMnemonicNode {
    let node = bip32.fromSeed(Buffer.from(seed.substring(2), "hex"));
    if (path) { node = node.derivePath(path); }
    return {
        path: (path || "m"),
        chainCode: ("0x" + node.chainCode.toString("hex")),
        depth: node.depth,
        index: node.index,
        parentFingerprint: toHexInt(node.parentFingerprint),
        fingerprint: ("0x" + node.fingerprint.toString("hex")),
        publicKey: ("0x" + node.publicKey.toString("hex")),
        privateKey: ("0x" + (node.privateKey as Buffer).toString("hex")),
        xpriv: node.toBase58(),
        xpub: node.neutered().toBase58(),
    };
}

function get_mnemonic(name: string, entropy: string, password: string, locale: string): TestCaseMnemonic {
    bip39.setDefaultWordlist(Locales[locale]);
    const phrase = bip39.entropyToMnemonic(entropy.substring(2));
    const phraseHash = sha256(phrase);
    const seed = "0x" + bip39.mnemonicToSeedSync(phrase, password).toString("hex");

    const nodes: Array<TestCaseMnemonicNode> = [ ];
    nodes.push(addNode(seed));
    nodes.push(addNode(seed, "m/0"));
    nodes.push(addNode(seed, "m/0'"));
    nodes.push(addNode(seed, "m/42/43'/44/45'"));
    nodes.push(addNode(seed, "m/42/43/44/45"));
    nodes.push(addNode(seed, "m/42/43'/44'/45"));

    return {
        name,
        locale,
        phrase: toHex(phrase), phraseHash,
        password: toHex(password),
        entropy, seed,
        nodes
    };
}

function createHex(value: number, size: number): string {
    const data = new Uint8Array(size);
    data.fill(value);
    return "0x" + Buffer.from(data).toString("hex");
}

export async function gen_mnemonics(): Promise<Array<TestCaseMnemonic>> {
    const output: Array<TestCaseMnemonic> = [ ];
    for (const locale in Locales) {
        for (let s = 16; s <= 32; s += 4) {
            const suffix = `-${ locale }.s${ s }`;
            output.push(get_mnemonic("zeros-nopass" + suffix, createHex(0, s), "", locale));
            output.push(get_mnemonic("ones-nopass" + suffix, createHex(0xff, s), "", locale));
            output.push(get_mnemonic("zeros-hello" + suffix, createHex(0, s), "Hello", locale));
            output.push(get_mnemonic("ones-world" + suffix, createHex(0xff, s), "World", locale));
            for (let i = 0; i < 4; i++) {
                const name = `random-${ locale }.s${ s }.${ i }`;
                const random = new Random("mnemonic-" + name);
                const entropy = random.hexString(s);
                const password = (i === 0) ? "": random.string(8, 16);
                output.push(get_mnemonic(name, entropy, password, locale));
            }
        }
    }
    return output;
}
