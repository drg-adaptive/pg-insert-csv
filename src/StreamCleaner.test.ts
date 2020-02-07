import { Readable } from "stream";
import StreamCleaner, { MATCH_NON_PRINTABLE } from "./StreamCleaner";

describe("StreamCleaner", () => {
  test("remove non-printable characters", async () => {
    const source = new Readable();

    const transform = new StreamCleaner(MATCH_NON_PRINTABLE);

    let result = new Promise(resolve => {
      source
        .pipe(transform)
        .on("data", (chunk: Buffer) => expect(chunk).toHaveLength(1))
        .on("end", resolve);
    });

    for (let i = 0; i <= 31; i++) {
      const chr = String.fromCharCode(i);
      source.push(chr + "A" + chr);
    }
    source.push(null);

    await result;
  });

  test("keep printable characters", async () => {
    const source = new Readable();

    const transform = new StreamCleaner(MATCH_NON_PRINTABLE);

    let result = new Promise(resolve => {
      source
        .pipe(transform)
        .on("data", (chunk: Buffer) => expect(chunk).toHaveLength(1))
        .on("end", resolve);
    });

    for (let i = 32; i <= 126; i++) {
      source.push(String.fromCharCode(i));
    }
    source.push(null);

    await result;
  });
});
