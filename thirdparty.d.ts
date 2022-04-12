
// Place Third-Party non-TypeScript-enabled definitions here

declare module "ethereumjs-icap" {
    export function fromAddress(address: string, print?: boolean, nostd?: boolean): string;
}

declare module "@ensdomains/eth-ens-namehash" {
    export function hash(value: string): string;
}
