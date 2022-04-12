import { TypedDataUtils } from "eth-sig-util";

import { Random } from "./random.js";


interface AbiType {
    name: string;
    type: string;

    struct?: string;
    components?: Array<AbiType>;

    create(): any;
}

export interface TestCaseTypedDataDomain {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
    salt?: string;
}

export interface TestCaseTypedDataType {
    name: string;
    type: string;
}

export interface TestCaseTypedData {
    name: string;

    domain: TestCaseTypedDataDomain;
    primaryType: string;
    types: Record<string, Array<TestCaseTypedDataType>>
    data: any;

    encoded: string;
    digest: string;

    privateKey?: string;
    signature?: string;
}

function fill(testcase: TestCaseTypedData): TestCaseTypedData {
    const domainType: Array<TestCaseTypedDataType> = [];

    if (testcase.domain.name != null) {
        domainType.push({ name: "name", type: "string" });
    }
    if (testcase.domain.version != null) {
        domainType.push({ name: "version", type: "string" });
    }
    if (testcase.domain.chainId != null) {
        domainType.push({ name: "chainId", type: "uint256" });
    }
    if (testcase.domain.verifyingContract != null) {
        domainType.push({ name: "verifyingContract", type: "address" });
    }
    if (testcase.domain.salt != null) {
        domainType.push({ name: "salt", type: "bytes32" });
    }

    const typesWithDomain: Record<string, Array<TestCaseTypedDataType>> = {
        EIP712Domain: domainType
    };
    for (const key in testcase.types) { typesWithDomain[key] = testcase.types[key]; }


    testcase.encoded = "0x" + TypedDataUtils.encodeData(testcase.primaryType, testcase.data, testcase.types).toString("hex");
    testcase.digest = "0x" + TypedDataUtils.sign({
        types: <any>typesWithDomain,
        domain: testcase.domain,
        primaryType: testcase.primaryType,
        message: testcase.data
    }, true).toString("hex");

    return testcase;
}

function randomType(random: Random, dynamicOrType?: boolean | string): AbiType {
    if (dynamicOrType == null) { dynamicOrType = true; }

    let type: number | string = "";
    let dynamic = true;
    if (typeof(dynamicOrType) === "boolean") {
        dynamic = dynamicOrType;
        type = random.int(0, dynamic ? 7: 5);
    } else {
        type = dynamicOrType;
    }

    const name = random.nextUniqueName();

    switch (type) {

        // Static

        // address
        case 0: case "address":
            return { name, type: "address", create: () => {
                return random.hexString(20);
            } };

        // bool
        case 1: case "bool":
            return { name, type: "bool", create: () => {
                return random.choice([ false, true ]);
            } };

        // intXX and uintXX
        case 2: case "number": {
            const signed = random.choice([ false, true ]);
            const width = random.int(1, 32);
            return { name, type: `${ signed ? "": "u" }int${ width * 8 }`, create: () => {
                const bytes = random.bytes(width);
                let value = BigInt("0x" + Buffer.from(bytes).toString("hex"));
                if (signed && (bytes[0] & 0x80)) {
                    bytes[0] &= ~0x80;
                    value = -BigInt("0x" + Buffer.from(bytes).toString("hex"));
                }
                return value.toString();
            } };
        }

        // bytesXX
        case 3: case "bytesX": {
            const width = random.int(1, 32);
            return { name, type: `bytes${ width }`, create: () => {
                return random.hexString(width);
            } };
        }

        // Static or dynamic nested types

        // Array
        case 4: case "array": {
            const baseType = randomType(random, dynamic);

            let length: null | number = random.int(0, 3);
            if (length == 0) { length = null; }
            const lengthString = ((length == null) ? "": String(length))

            let struct = undefined;
            let components = undefined;
            if (baseType.struct) {
                struct = `${ baseType.struct }[${ lengthString }]`;
                components = baseType.components;
            }

            return { name, components, struct, type: `${ baseType.type }[${ lengthString }]`, create: () => {
                let l = length;
                if (l == null) { l = random.int(0, 3); }

                const result = [ ];
                for (let i = 0; i < l; i++) {
                    result.push(baseType.create());
                }
                return result;
            } };
        }

        // Tuple
        case 5: case "tuple": {
            const components: Array<AbiType> = [ ];
            const length = random.int(1, 4);
            for (let i = 0; i < length; i++) {
                components.push(randomType(random, dynamic));
            }
            const struct = random.nextUniqueName("Struct");
            const type = `tuple(${ components.map(c => c.type).join(",") })`
            return { name, struct, type, components, create: () => {
                const result: Record<string, any> = { };
                components.forEach((type) => {
                    result[type.name] = type.create();
                });
                return result;
            } };
        }

        // Dynamic

        // string
        case 6: case "string":
            return { name, type: "string", create: () => {
                return random.string(0, 64);
            } };

        // bytes
        case 7: case "bytes":
            return { name, type: "bytes", create: () => {
                return random.hexString(0, 64);
            } };
    }

    throw new Error("should not be reached");
}

function randomTypedData(name: string, random: Random): TestCaseTypedData {
    const type = randomType(random, "tuple");

    const types: Record<string, Array<TestCaseTypedDataType>> = { };
    function spelunk(type: AbiType): void {
        if (type.struct) {
            types[type.struct.split("[")[0]] = (type.components as Array<any>).map((t) => {
                spelunk(t);
                return { name: t.name, type: (t.struct || t.type) };
            });;
        }
    }
    spelunk(type);

    const primaryType = type.struct as string;
    const data = type.create();

    const domain: any = { };
    if (random.choice([ false, true])) {
        domain.name = random.string(1, 64);
    }
    if (random.choice([ false, true])) {
        domain.version = [
            random.int(0, 49),
            random.int(0, 49),
            random.int(0, 49),
        ].join(".");
    }
    if (random.choice([ false, true])) {
        domain.chainId = random.int(0, 1337);
    }
    if (random.choice([ false, true])) {
        domain.verifyingContract = random.hexString(20);
    }
    if (random.choice([ false, true])) {
        domain.salt = random.hexString(32);
    }

    return fill({
        name,
        domain,
//        type: type.type,
        primaryType, types, data,

        encoded: "", digest: ""
    });
}

export async function gen_typedData(): Promise<Array<TestCaseTypedData>> {
    const tests: Array<TestCaseTypedData> = [ ];

    for (let i = 0; i < 128; i++) {
        const name = `random-${ i }`;
        const random = new Random(name);
        tests.push(randomTypedData(name, random));
    }

    //tests.sort((a, b) => (a.type.length - b.type.length));
    //tests.forEach((t, i) => { t.name = `random-${ i }`; });

    tests.push({
        name: "EIP712 example",
        domain: {
            name: 'Ether Mail',
            version: '1',
            chainId: 1,
            verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
        },
        primaryType: "Mail",
        types: {
            Person: [
                { name: 'name', type: 'string' },
                { name: 'wallet', type: 'address' }
            ],
            Mail: [
                { name: 'from', type: 'Person' },
                { name: 'to', type: 'Person' },
                { name: 'contents', type: 'string' }
            ]
        },
        data: {
            from: {
                name: 'Cow',
                wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
            },
            to: {
                name: 'Bob',
                wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
            },
            contents: 'Hello, Bob!'
        },
        encoded: "0xa0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8cd54f074a4af31b4411ff6a60c9719dbd559c221c8ac3492d9d872b041d703d1b5aadf3154a261abdd9086fc627b61efca26ae5702701d05cd2305f7c52a2fc8",
        digest: "0xbe609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2",
        privateKey: "0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4",
        signature: "0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c"
    });

    return tests;
}
