import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const rootdir = path.resolve(__dirname, "..");

export function hexlify(data: Uint8Array): string {
    const result = [ "0x" ];

    for (const value of data) {
        let v = value.toString(16);
        while (v.length < 2) { v = "0" + v; }
        result.push(v);
    }

    return result.join("");
}

export function saveTests(tag: string, data: any) {
   let filename = path.resolve(__dirname, '../testcases', tag + '.json.gz');

   fs.writeFileSync(filename, zlib.gzipSync(JSON.stringify(data, undefined, ' ') + '\n'));

   console.log('Save testcase: ' + filename);
}

export function loadTests<T = any>(tag: string): T {
   let filename = path.resolve(__dirname, '../testcases', tag + '.json.gz');
   return JSON.parse(zlib.gunzipSync(fs.readFileSync(filename)).toString());
}

//export function loadData(filename: string): Buffer {
//   return fs.readFileSync(path.resolve(__dirname, filename));
//}

export function loadContentFolder(folder: string): Array<string> {
   return fs.readdirSync(path.resolve(__dirname, "../content", folder));
}

export function loadContent(folder: string, filename: string): Buffer {
   return fs.readFileSync(path.resolve(__dirname, "../content", folder, filename));
}
