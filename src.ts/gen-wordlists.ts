
import { loadContent, loadContentFolder } from "./utils.js";

export interface TestCaseWordlist {
    name: string;
    filename: string,
    locale: string;
    content: string;
}

export async function gen_wordlists(): Promise<Array<TestCaseWordlist>> {
    const output: Array<TestCaseWordlist> = [ ];
    for (const filename of loadContentFolder("wordlists")) {
        const locale = filename.split(".")[0].split("-").pop() as string;
        const content = loadContent("wordlists", filename).toString();
        output.push({
            name: `wordlist-${ locale }`,
            filename, locale, content
        });
    }
    return output;
}
