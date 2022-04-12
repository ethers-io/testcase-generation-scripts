import hash from "@ensdomains/eth-ens-namehash";

export interface TestCaseNamehash {
    name: string;
    ensName: string;
    namehash: string;
}

export async function gen_namehash(): Promise<Array<TestCaseNamehash>> {
    const output: Array<TestCaseNamehash> = [
        {
            name: "official-test-vector-0",
            ensName: "",
            namehash: "0x0000000000000000000000000000000000000000000000000000000000000000"
        },
        {
            name: "official-test-vector-1",
            ensName: "eth",
            namehash: "0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae",
        },
        {
            name: "official-test-vector-2",
            ensName: "foo.eth",
            namehash: "0xde9b09fd7c5f901e23a3f19fecc54828e9c848539801e86591bd9801b019f84f",
        }
    ];

    const tests = [
        { name: "top-level", ensName: "eth" },
        { name: "second-level", ensName: "wallet.eth" },
        { name: "third-level", ensName: "vitalik.wallet.eth" },
        { name: "mixed case", ensName: "ViTalIk.WALlet.Eth" },
    ];

    for (const { name, ensName } of tests) {
        const namehash = hash.hash(ensName);
        output.push({ name, ensName, namehash });
    }

    return output;
}

