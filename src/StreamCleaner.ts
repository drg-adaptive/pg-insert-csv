import { Transform, TransformCallback } from "stream";

export const MATCH_NON_PRINTABLE = /[\u0000-\u0031]+/g;

export default class StreamCleaner extends Transform {
  constructor(private readonly pattern: RegExp) {
    super();
  }
  _transform(chunk: any, encoding: string, cb: TransformCallback) {
    const result = chunk.toString().replace(this.pattern, "");
    this.push(result);
    cb();
  }
}
