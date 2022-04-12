import rlp from "rlp";

const nullBuffer = Buffer.from('');
const shortBuffer = Buffer.from('Hello World');
const longBuffer = Buffer.from('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas aliquet dolor nulla, nec tincidunt massa mollis at. In mollis blandit dui, id elementum eros iaculis ut. Phasellus lobortis, ipsum quis fermentum mollis, eros nisl rutrum dui, ut luctus leo turpis ut augue. Fusce odio turpis, pharetra at venenatis in, convallis quis nibh. Duis auctor, augue sit amet venenatis vulputate, nisl nibh feugiat mauris, id molestie augue dui sed justo. Suspendisse ipsum mauris, sagittis nec laoreet non, egestas vel nibh. Pellentesque aliquet accumsan velit in dapibus. Aenean eget augue arcu. Ut mollis leo mi, eu luctus eros facilisis eu. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse efficitur, justo a volutpat tempor, nibh ligula finibus turpis, eu facilisis tortor velit nec velit. Duis nec tempor lectus, non convallis sem.');

const singleLow = Buffer.from([0x02]);
const singleLessMed = Buffer.from([0x7e]);
const singleMed = Buffer.from([0x7f]);
const singleMoreMed = Buffer.from([0x80]);
const singleHigh = Buffer.from([0xff]);

export type NestedHexString = string | Array<string | NestedHexString>;

export interface TestCaseRlp {
    name: string;
    encoded: string;
    decoded: NestedHexString;
}

type NestedBuffer = Buffer | Array<Buffer | NestedBuffer>;

function repeated(text: string, count: number): string {
    let result = '';
    for (let i = 0; i < count; i++) { result += text; }
    return result;
}

function toNestedHex(value: NestedBuffer): NestedHexString {
    if (Array.isArray(value)) {
        const result: NestedHexString = [];
        value.forEach((value) => {
            result.push(toNestedHex(value));
        });
        return result;
    } else if (Buffer.isBuffer(value)) {
        return ("0x" + value.toString("hex"));
    }
    throw new Error('invalid object - '  + value);
}

export async function gen_rlp(): Promise<Array<TestCaseRlp>> {
    const output: Array<TestCaseRlp> = [ ];

    const tests: Record<string, NestedBuffer> = {
        nullString: nullBuffer,
        emptyArray: [],
        arrayWithNullString: [nullBuffer],
        arrayWithNullString3: [nullBuffer, nullBuffer, nullBuffer],
        threeSet: [ [], [[]], [[[]]] ],
        arrayShort2: [shortBuffer, shortBuffer],
        arrayLong2: [shortBuffer, shortBuffer],
        arrayShortLong: [shortBuffer, longBuffer],
        arrayInside: [shortBuffer, [shortBuffer, longBuffer, [shortBuffer, [shortBuffer]]], shortBuffer],
        singleLow: singleLow,
        singleLessMed: singleLessMed,
        singleMed: singleMed,
        singleMoreMed: singleMoreMed,
        singleHigh: singleHigh,
        assortedSingle1: [singleLow, singleMed, singleMoreMed, singleHigh, [singleLessMed, singleLow]],
        assortedSingle2: [[singleLow, singleLow], [singleHigh, singleHigh, singleHigh]],
        assorted: [[longBuffer], [singleMoreMed], singleLow, [singleLessMed], [[shortBuffer], [singleHigh]]],
    };

    [1, 2, 3, 4, 7, 8, 9, 15, 16, 17, 31, 32, 33, 53, 54, 55, 56, 57, 58, 100, 1000, 2049].forEach((i) => {
        tests['zeros_' + i] = Buffer.from(repeated('00', i), 'hex');
        tests['ones_' + i] = Buffer.from(repeated('01', i), 'hex');
    });

    const names = Object.keys(tests);
    names.sort();
    for (const name of names) {
        const test = tests[name];
        output.push({
            name,
            decoded: toNestedHex(test),
            encoded: '0x' + Buffer.from(rlp.encode(test)).toString('hex')
        });
    }

    return output;
}
