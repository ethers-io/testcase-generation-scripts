import fs from "fs";
import { resolve } from "path";

//import hash from "@ensdomains/eth-ens-namehash";
import { ens_normalize } from "@adraffy/ens-normalize";

import { rootdir } from "./utils.js";

import sha3 from "js-sha3";

// This is copied from ensdomains/eth-ens-namehash, but with UTS46
// disabled since ens_normalize superceded it.
//
// See: https://github.com/ensdomains/eth-ens-namehash/blob/master/index.js

const hash = (function() {

    function namehash (inputName: string): string {
      // Reject empty names:
      let node = ''
      for (let i = 0; i < 32; i++) {
        node += '00'
      }

      let name = normalize(inputName)

      if (name) {
        let labels = name.split('.')

        for(let i = labels.length - 1; i >= 0; i--) {
          let labelSha = sha3.keccak256(labels[i])
          node = sha3.keccak256(new Buffer(node + labelSha, 'hex'))
        }
      }

      return '0x' + node
    }

    function normalize(name: string): string {
      //return name ? uts46.toUnicode(name, {useStd3ASCII: true, transitional: false}) : name
      return name; //.toLowerCase();;
    }

    return namehash;
})();



export interface TestCaseNamehash {
    name: string;
    ensName: string;
    namehash?: string;
    error?: string;
}

export async function gen_namehash(): Promise<Array<TestCaseNamehash>> {

    const output: Array<TestCaseNamehash> = [ ];

    output.push({
        name: "official-test-vector-0",
        ensName: "",
        error: "empty string",
        namehash: "0x0000000000000000000000000000000000000000000000000000000000000000"
    });

    output.push({
        name: "official-test-vector-1",
        ensName: "eth",
        namehash: "0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae",
    });

    output.push({
        name: "official-test-vector-2",
        ensName: "foo.eth",
        namehash: "0xde9b09fd7c5f901e23a3f19fecc54828e9c848539801e86591bd9801b019f84f",
    });

    const extraTests = [
        { name: "top-level", ensName: "eth" },
        { name: "second-level", ensName: "wallet.eth" },
        { name: "third-level", ensName: "vitalik.wallet.eth" },
        { name: "mixed case", ensName: "ViTalIk.WALlet.Eth" },
    ];

    for (const { name, ensName } of extraTests) {
        const namehash = hash(ensName.toLowerCase());
        output.push({ name, ensName, namehash });
    }

    const data = fs.readFileSync(resolve(rootdir, "../ens-normalize.js-official/validate/tests.json")).toString();

    // The first entry is metadata
    const tests = JSON.parse(data).slice(1);

    const textEncoder = new TextEncoder();

    for (const { name, error, comment } of tests) {
        const nameNorm = "0x" + Buffer.from(textEncoder.encode(name)).toString("hex");
        const test: TestCaseNamehash = { name: nameNorm, ensName: name };

        if (comment) { test.name += ` (${ comment.replace(/:/g, ";") })`; }

        if (error) {
            test.error = "error"
            if (comment) { test.error = comment; }
        } else {
            test.namehash = hash(ens_normalize(name));
        }
        output.push(test);
    }

    return output;
}
