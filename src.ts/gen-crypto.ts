import crypto from "crypto";

import sha3 from "js-sha3";

import { Random } from "./random.js";


export interface TestCaseHash {
    name: string;
    data: string;
    sha256: string;
    sha512: string;
    ripemd160: string;
    keccak256: string;
}

export interface TestCasePbkdf {
    name: string;
    password: string;
    salt: string;
    dkLen: number;
    pbkdf2: {
        iterations: number;
        algorithm: string;
        key: string;
    },
    scrypt: {
        N: number;
        r: number;
        p: number;
        key: string;
    }
}

export interface TestCaseHmac {
    name: string;
    data: string;
    key: string;
    algorithm: "sha256" | "sha512";
    hmac: string;
}

function getHash(name: string, data: Uint8Array): TestCaseHash {
    return {
        name,
        data: ("0x" + Buffer.from(data).toString("hex")),
        sha256: ("0x" + crypto.createHash("sha256").update(data).digest("hex")),
        sha512: ("0x" + crypto.createHash("sha512").update(data).digest("hex")),
        ripemd160: ("0x" + crypto.createHash("ripemd160").update(data).digest("hex")),
        keccak256: ("0x" + sha3.keccak256(data))
    };
}

export async function gen_hashes(): Promise<Array<TestCaseHash>> {
    const output: Array<TestCaseHash> = [ ];
    output.push(getHash("empty", new Uint8Array([ ])));
    for (let i = 0; i < 256; i++) {
        const name = `random-${ i }`;
        const random = new Random(name);
        const data = random.bytes(1, 128);
        output.push(getHash(name, data));
    }
    return output;
}

function getPbkdf(name: string, password: Uint8Array, salt: Uint8Array, dkLen: number, iterations = 1024, options = { N: 1024, r: 8, p: 1 }): TestCasePbkdf {
    const algorithm = "sha256";
    const pbkdf2 = crypto.pbkdf2Sync(password, salt, iterations, dkLen, algorithm);

    const scrypt = crypto.scryptSync(password, salt, dkLen, options);

    return {
        name,
        password: ("0x" + Buffer.from(password).toString("hex")),
        salt: ("0x" + Buffer.from(salt).toString("hex")),
        dkLen,
        pbkdf2: {
            algorithm, iterations,
            key: ("0x" + pbkdf2.toString("hex"))
        },
        scrypt: {
            ...options,
            key: ("0x" + scrypt.toString("hex"))
        }
    };
}

export async function gen_pbkdf(): Promise<Array<TestCasePbkdf>> {
    const output: Array<TestCasePbkdf> = [ ];

    const empty = new Uint8Array([ ]);
    const short = Buffer.from("short");
    const long = Buffer.from("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex", "utf8");

    {
        output.push(getPbkdf("pw=null,salt=null", empty, empty, 32));
        output.push(getPbkdf("pw=null,salt=short", empty, short, 32));
        output.push(getPbkdf("pw=null,salt=long", empty, long, 32));

        output.push(getPbkdf("pw=short,salt=null", short, empty, 32));
        output.push(getPbkdf("pw=short,salt=short", short, short, 32));
        output.push(getPbkdf("pw=short,salt=long", short, long, 32));

        output.push(getPbkdf("pw=long,salt=null", long, empty, 32));
        output.push(getPbkdf("pw=long,salt=short", long, short, 32));
        output.push(getPbkdf("pw=long,salt=long", long, long, 32));
    }

    for (let i = 0; i < 256; i++) {
        const name = `random-${ i }`;
        const random = new Random(name);
        const password = random.bytes(1, 16);
        const salt = random.bytes(1, 128);

        random.push("pbkdf2");
        const iterations = random.int(256, 2048);
        random.pop();

        random.push("scrpyt");
        const options = {
            N: (1 << random.int(10, 12)),
            r: (1 << random.int(0, 3)),
            p: (1 << random.int(0, 3))
        };
        random.pop();

        output.push(getPbkdf(name, password, salt, random.int(1, 64), iterations, options));
    }
    console.log(output);

    return output;
}

function getHmac(name: string, data: Uint8Array, key: Uint8Array, algorithm: "sha256" | "sha512"): TestCaseHmac {
    const hmac = crypto.createHmac(algorithm, key).update(data).digest();
    return {
        name,
        data: ("0x" + Buffer.from(data).toString("hex")),
        key: ("0x" + Buffer.from(key).toString("hex")),
        algorithm,
        hmac: ("0x" + Buffer.from(hmac).toString("hex"))
    };
}

export async function gen_hmac(): Promise<Array<TestCaseHmac>> {
    const output: Array<TestCaseHmac> = [ ];

    for (let i = 0; i < 128; i++) {
        const name = `ranodom-${ i }`;
        const random = new Random("hmac_" + name);
        const data = random.bytes(1, 256);
        const key = random.bytes(32);
        const algorithm = random.choice([ "sha256", "sha512" ]);
        output.push(getHmac(name, data, key, algorithm));
    }

    return output;
}
