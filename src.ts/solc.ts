
import solc from "solc";

function findImports(path: string): { contents: string } | { error: string } {
    return { error: "File not found" }
}

export function compile(source: string): string {
    const input = {
        language: "Solidity",
        sources: { "test.sol": { content: source } },
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          outputSelection: {
            "*": {
              "*": [ "*" ]
            }
          }
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input), { "import": findImports }));
    //console.log(output);

    if ("errors" in output) {
        for (const error of output.errors) {
            if (error.severity !== "warning") {
                console.log(error.formattedMessage);
                throw new Error("Compile error");
            } else {
                console.log(error);
            }
        }
    }

    return "0x" + output.contracts["test.sol"].Test.evm.bytecode.object;
}
