
//import * as genAccounts from "./gen-address.js";
//import * as genCrypto from "./gen-crypto.js";
//import * as genWordlists from "./gen-wordlists.js";
//import * as genRlp from "./gen-rlp.js";
//import * as genMnemonics from "./gen-mnemonics.js";
//import * as genWallets from "./gen-wallets.js";
//import * as genTypedData from "./gen-eip712.js";
//import * as genHash from "./gen-hash.js";
import * as genNamehash from "./gen-namehash.js";
//import * as genTransactions from "./gen-transactions.js";

import { saveTests } from "./utils.js";

async function run(genFuncs: Array<{ name: string, func: () => Promise<Array<any>> }>): Promise<void> {
    for (const genFunc of genFuncs) {
    console.log(genFunc);
        const results = await genFunc.func();
        saveTests(genFunc.name, results);
        console.dir(results, { depth: null });
    }
}

(async function() {
    await run([
//        { name: "accounts", func: genAccounts.gen_accounts },
//        { name: "create", func: genAccounts.gen_create },
//        { name: "create2", func: genAccounts.gen_create2 },

//        { name: "hashes", func: genCrypto.gen_hashes },
//        { name: "pbkdf", func: genCrypto.gen_pbkdf },
//        { name: "hmac", func: genCrypto.gen_hmac },

//        { name: "wordlists", func: genWordlists.gen_wordlists },

//        { name: "rlp", func: genRlp.gen_rlp },
//        { name: "mnemonics", func: genMnemonics.gen_mnemonics },
//        { name: "wallets", func: genWallets.gen_wallets },
//        { name: "typed-data", func: genTypedData.gen_typedData },
        { name: "namehash", func: genNamehash.gen_namehash },
//        { name: "transactions", func: genTransactions.gen_transactions },
    ]);
})().catch((error) => {
    console.log(error);
});
