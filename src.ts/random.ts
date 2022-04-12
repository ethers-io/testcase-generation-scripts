
import { createHash } from "crypto";

import { hexlify } from "./utils.js";

function hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

const Letters = "Moo ".split("");
Letters.push(String.fromCodePoint(233));
Letters.push(String.fromCodePoint(128640));

export class Random {
    #state: Array<string>;
    #nextId: number;

    constructor(seed: string = "") {
        this.#state = [ seed ];
        this.#nextId = 1;
    }

    pop(): void {
        if (this.#state.length === 1) { throw new RangeError("state stack empty"); }
        this.#state.pop();
    }

    push(stir?: string): void {
        const state = (this.#state.pop() as string);
        this.#state.push(state);
        this.#state.push(state);
        if (stir != null) { this.stir(stir); }
    }

    stir(stir: string): void {
        const state = hash(stir + hash(this.#state.pop() as string));
        this.#state.push(state);
    }

    nextUniqueName(prefix = "param"): string {
        return `${ prefix }${ this.#nextId++ }`;
    }

    choice(options: Array<any>): any {
        return options[this.int(0, options.length - 1)];
    }

    #random(inclusive?: boolean): number {
        const state = hash(this.#state.pop() as string);
        this.#state.push(state);

        return parseInt(state.substring(0, 12), 16) / (0x1000000000000 - (inclusive ? 1: 0));
    }

    // Returns a random value between [0, 1)
    random(): number {
        return this.#random(false);
    }

    // Returns a random float value between [ minValue, maxValue ]
    float(minValue: number = 0, maxValue: number = 100): number {
        return minValue + (maxValue - minValue) * this.#random(true);
    }

    // Returns a random integer value between [ minValue, maxValue ]
    int(minValue: number = 0, maxValue: number = 100): number {
        return Math.floor(minValue + (maxValue - minValue + 1) * this.random());
    }

    hexString(minLength: number = 32, maxLength?: number): string {
        return hexlify(this.bytes(minLength, maxLength));
    }

    bytes(minLength: number = 32, maxLength?: number): Uint8Array {
        const length = (maxLength == null) ? minLength: this.int(minLength, maxLength);
        const result = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = this.int(0, 255);
        }
        return result;
    }

    string(minLength: number, maxLength?: number): string {
        const length = (maxLength == null) ? minLength: this.int(minLength, maxLength);
        let result = Letters.join("");
        for (let i = Letters.length; i < length; i++) {
            result += this.choice(Letters);
        }
        return result;
    }

    shuffle(array: Array<any>): Array<any> {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            const tmp = array[i];
            array[i] = array[j];
            array[j] = tmp;
        }

        return array;
    }
}

/*
const random = new Random("f");
const w = random.string(8)
console.log(w, w.length, (new TextEncoder()).encode(w));
//for (let i = 0; i < 100; i++) {
//    console.log(random.hexString(1, 3));
//}
*/
