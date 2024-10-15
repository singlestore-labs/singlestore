export interface TextSplitterSplitOptions {
  chunkSize?: number;
  delimiter?: string;
}

export class TextSplitter {
  split(text: string, options: TextSplitterSplitOptions = {}): string[] {
    const { chunkSize = 1024, delimiter = /(?<=[.!?])[\s\n]+/ } = options;

    const chunks: string[] = [];
    let accChunk: string[] = [];
    let accChunkLength = 0;

    for (const chunk of text.split(delimiter)) {
      if (chunk.length > chunkSize) {
        let subChunks: string[] = [];

        if (delimiter === " ") {
          subChunks.push(chunk);
        } else {
          subChunks = this.split(chunk, { chunkSize, delimiter: " " });
        }

        if (accChunkLength > 0) {
          chunks.push(accChunk.join(" "));
          accChunk = [];
          accChunkLength = 0;
        }

        chunks.push(...subChunks);
      } else if (accChunkLength + chunk.length <= chunkSize) {
        accChunk.push(chunk);
        accChunkLength += chunk.length;
      } else {
        chunks.push(accChunk.join(" "));
        accChunk = [chunk];
        accChunkLength = chunk.length;
      }
    }

    if (accChunk.length > 0) {
      chunks.push(accChunk.join(" "));
    }

    return chunks;
  }
}
