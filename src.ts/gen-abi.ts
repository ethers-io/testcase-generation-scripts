import { ethers } from "ethers";

import { compile } from "./solc.js";
import { Random } from "./random.js";

export interface TestCaseAbi {
    name: string;
    type: string;
    value: any;
    verbose: any;
    bytecode: string;
    source: string;
    encoded: string;
}

type GenValue = {
    type: string;
    returns: string;
    dynamic: boolean,
    getBytecode: (body: Array<string>, header: Record<string, string>, name: string, value: any) => void;
    getValue: () => { verbose: any, value: any };
};

function getType(type: string, header?: Record<string, string>): string {
    const param = ethers.utils.ParamType.from(type);
    if (param.baseType === "array") {
        const suffix = "[" + (param.arrayLength >= 0 ? String(param.arrayLength): "") + "]";
        return getType(param.arrayChildren.format(), header) + suffix;
    } else if (param.baseType === "tuple") {
        const subtypes = param.components.map((c) => getType(c.format())).join(",");
        const type = "S_" + ethers.utils.id(subtypes).substring(2, 10);
        if (header) {
            const struct = [ ]
            struct.push(`  struct ${ getType(type) } {`);
            for (let i = 0; i < param.components.length; i++) {
                struct.push(`    ${ getType(param.components[i].format(), header) } s_${ i };`);
            }
            struct.push("  }");
            struct.push("");

            header[type] = struct.join("\n");
        }
        return type;
    }
    return param.type;
    /*
    if (type[0] === "(" / * fix:) * /) {
        const match = type.match(/^(.*?)((\[[0-9]*\])*)$/);
        if (match == null) { throw new Error(); }
        return "S_" + ethers.utils.id(match[1]).substring(2, 10) + match[2];
    }
    return type;
    */
}


function genValue(random: Random, onlyStatic: boolean): GenValue {
    switch (random.int(0, onlyStatic ? 5: 6)) {
        // address
        case 0:
            return {
                type: "address",
                returns: "address",
                dynamic: false,
                getBytecode: (body: Array<string>, header: Record<string, string>, name: string, value: any) => {
                    body.push(`address ${ name } = ${ value };`);
                },
                getValue: () => {
                    const value = ethers.utils.getAddress(random.hexString(20));
                    return { verbose: { type: "address", value }, value };
                }
            };

        // u?int(XX)?
        case 1: {
            const signed = random.choice([ true, false ]);
            let type = `${ signed ? "": "u" }int`;
            let size = random.int(1, 32) * 8;
            if (random.int(0, 12) === 0) {
                size = 256;
            } else {
                type += String(size);
            }

            return {
                type,
                returns: type,
                dynamic: false,
                getBytecode: (body: Array<string>, header: Record<string, string>, name: string, value: any) => {
                    body.push(`${ type } ${ name } = ${ value };`);
                },
                getValue: () => {
                    const bytes = random.bytes(size / 8);
                    let value: string = BigInt("0x" + Buffer.from(bytes).toString("hex")).toString();
                    if (signed && bytes[0] & 0x80) {
                        bytes[0] &= 0x7f;
                        value = (-BigInt("0x" + Buffer.from(bytes).toString("hex"))).toString();
                    }
                    return { verbose: { type: "number", value }, value };
                }
            }
        }

        // bytesXX
        case 2: {
            const size = random.int(1, 32);
            const type = `bytes${ size }`;
            return {
                type,
                returns: type,
                dynamic: false,
                getBytecode: (body: Array<string>, header: Record<string, string>, name: string, value: any) => {
                    // Solidity does not like bytes20 since they look like an address
                    if (size === 20) { value = ethers.utils.getAddress(value); }
                    body.push(`${ type } ${ name } = ${ type }(${ value });`);
                },
                getValue: () => {
                    const value = random.hexString(size);
                    return { verbose: { type: "hexstring", value }, value };
                }
            };
        }

        // bool
        case 3:
            return {
                type: "bool",
                returns: "bool",
                dynamic: false,
                getBytecode: (body: Array<string>, header: Record<string, string>, name: string, value: any) => {
                    body.push(`bool ${ name } = ${ value };`);
                },
                getValue: () => {
                    const value = random.choice([ false, true ]);
                    return { verbose: { type: "boolean", value }, value };
                }
            };

        // array (dynamic iff onlyStatic)
        case 4: {
            const child = genValue(random, onlyStatic);
            const size = random.int(onlyStatic ? 1: 0, 4);
            const suffix = ((size === 0) ? "[]": `[${ size }]`);
            const type = (child.type + suffix);
            return {
                type,
                returns: `${ getType(type) } memory`,
                dynamic: (size === 0 || child.dynamic),
                getBytecode: (body: Array<string>, header: Record<string, string>, name: string, value: any) => {
                    getType(type, header);
                    if (size === 0) {
                        body.push(`${ getType(type) } memory ${ name } = new ${ getType(type) }(${ value.length });`);
                        for (let i = 0; i < value.length; i++) {
                            const childName = `${ name }_${ i }`;
                            body.push("{");
                            child.getBytecode(body, header, childName, value[i]);
                            body.push(`${ name }[${ i }] = ${ childName };`);
                            body.push("}");
                        }
                    } else {
                        body.push(`${ getType(type) } memory ${ name };`);
                        for (let i = 0; i < size; i++) {
                            const childName = `${ name }_${ i }`;
                            body.push("{");
                            child.getBytecode(body, header, childName, value[i]);
                            body.push(`${ name }[${ i }] = ${ childName };`);
                            body.push("}");
                        }
                    }
                },
                getValue: () => {
                    const result = { verbose: { type: "array", value: <Array<any>>[ ] }, value: <Array<any>>[ ] };
                    const length = (size === 0) ? random.int(0, 4): size;
                    for (let i = 0; i < length; i++) {
                        const { verbose, value } = child.getValue();
                        result.verbose.value.push(verbose);
                        result.value.push(value);
                    }
                    return result;
                }
            }
        }

        // tuple
        case 5: {
            const comps: Array<GenValue> = [ ];
            const compCount = random.int(1, 5);
            for (let i = 0; i < compCount; i++) {
                comps.push(genValue(random, onlyStatic));
            }
            const type = `(${ comps.map((c) => c.type).join(",") })`;
            return {
                type,
                returns: `${ getType(type) } memory`,
                dynamic: (comps.filter((c) => c.dynamic).length !== 0),
                getBytecode: (body: Array<string>, header: Record<string, string>, name: string, value: any) => {
                    getType(type, header);
                    body.push(`${ getType(type) } memory ${ name };`);
                    for (let i = 0; i < comps.length; i++) {
                        const childName = `${ name }_${ i }`;
                        body.push("{");
                        comps[i].getBytecode(body, header, childName, value[i]);
                        body.push(`${ name }.s_${ i } = ${ childName };`);
                        body.push("}");
                    }
                },
                getValue: () => {
                    const result = { verbose: { type: "object", value: <Array<any>>[ ] }, value: <Array<any>>[ ] };
                    for (const comp of comps) {
                        const { verbose, value } = comp.getValue();
                        result.verbose.value.push(verbose);
                        result.value.push(value);
                    }
                    return result;
                }
            };
        }

        // string (dynamic)
        case 6:
            return {
                type: "string",
                returns: "string memory",
                dynamic: true,
                getBytecode: (body: Array<string>, header: Record<string, string>, name: string, value: any) => {
                    body.push(`string memory ${ name } = unicode${ JSON.stringify(value) };`);
                },
                getValue: () => {
                    const value = random.string(0, 63);
                    return { verbose: { type: "string", value }, value };
                }
            };

        // bytes (dynamic)
        case 7:
            return {
                type: "bytes",
                returns: "bytes memory",
                dynamic: true,
                getBytecode: (body: Array<string>, header: Record<string, string>, name: string, value: any) => {
                    body.push(`bytes memory ${ name } = hex"${ value.substring(2) }";`);
                },
                getValue: () => {
                    const value = random.hexString(0, 63);
                    return { verbose: { type: "hexstring", value }, value };
                }
            };

    }

    throw new Error("internal");
}

export async function getResult(bytecode: string): Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider();
    const signer = provider.getSigner();
    const tx = await signer.sendTransaction({ data: bytecode });
    const receipt = await tx.wait();
    return await provider.call({ to: receipt.contractAddress, data: "0xf8a8fd6d" });
}

const _Space = "               ";
function pad(length: number): string {
    let result = _Space;
    while (result.length < length) { result += result; }
    return result.substring(0, length);
}

export async function gen_abi(): Promise<Array<TestCaseAbi>> {
    const result: Array<TestCaseAbi> = [ ];
    const done: Set<string> = new Set();
    let i = -1;
    while (result.length < 1024) {
        i++;
        //if (i > 890) { break; }
        //if (i !== 890) { continue; }

        //console.log(`================ ${ i }`);
        const name = `place-holder-${ i }`
        const seed = `random-${ i }`;
        const random = new Random(seed);
        const { returns, type, getBytecode, getValue } = genValue(random, false);

        // Keep examples interesting
        if (done.has(type)) {
            console.log("skipping", type, result.length);
            continue;
        }
        done.add(type);

        const { verbose, value } = getValue();

        const body: Array<string> = [ ], header: Record<string, string> = { };
        getBytecode(body, header, "r", value);

        const code = [ ];
        code.push("// SPDX-License-Identifier: MIT-License");
        code.push("pragma solidity ^0.8.13;");
        code.push("contract Test {");
        for (const name in header) { code.push(header[name]); }
        code.push(`  function test () public pure returns (${ returns }) {`);
        let indent = 4;
        body.forEach((line) => {
            if (line[0] === "}") { indent -= 2; }
            code.push(pad(indent) + line);
            if (line[line.length - 1] === "{") { indent += 2; }
        });
        code.push("    return r;");
        code.push("  }");
        code.push("}");
        const source = code.join("\n");
        //console.log({ name, type, value });
        //console.log("CODE", code.join("\n"));

        const bytecode = compile(source);
        //console.log(bytecode);

        let encoded;
        try {
            encoded = await getResult(bytecode);
            //console.log("ENC", encoded);
        } catch (error) {
            if (JSON.stringify(error).indexOf("max code size exceeded") >= 0) {
                console.log("SKIP", error);
                continue;
            }
            throw error;
        }

        result.push({
            name, type, value, verbose, bytecode, source, encoded
        });
    }

    result.sort((a, b) => {
        function complex(v: string) {
            return v.length - v.replace(/,|\]/g, "").length
        }
        const ca = complex(a.type), cb = complex(b.type);
        if (ca !== cb) { return ca - cb; }
        return a.type.localeCompare(b.type);
    });
    result.forEach((t) => { t.name = `random-${ t.type }`; });

    //console.log(result.length);
    console.log(result.map((t) => t.type).join("\n"));
    return result;
}
