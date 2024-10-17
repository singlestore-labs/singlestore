import type { AnyAI, TextSplitterSplitOptions } from "@singlestore/ai";
import type { AnyDatabase, ColumnName, TableName } from "@singlestore/client";

export type UploadFileExt = "txt" | "csv" | "pdf";

interface TableParams {
  name?: TableName;
  contentColumnName?: ColumnName;
  vColumnName?: ColumnName;
}

export interface UploadFileValues<TAI extends AnyAI> {
  buffer: Buffer;
  name: string;
  ext: UploadFileExt;
  tableParams?: TableParams;
  textSplitterOptions?: TextSplitterSplitOptions;
  embeddingParams?: Parameters<TAI["embeddings"]["create"]>[1];
}

export class FileManager<TAI extends AnyAI> {
  constructor(
    private _database: AnyDatabase,
    private _ai: TAI,
  ) {}

  private _createTable(name: TableName, { dimensions }: { dimensions: number }) {
    return this._database.table.create({
      name,
      columns: {
        id: { type: "bigint", autoIncrement: true, primaryKey: true },
        name: { type: "varchar(256)" },
        content: { type: "text" },
        v_content: { type: `vector(${dimensions})` },
        createdAt: { type: "DATETIME(6)", default: "CURRENT_TIMESTAMP(6)" },
      },
    });
  }

  private async _readPDF(buffer: Buffer): Promise<string> {
    // @ts-expect-error - required
    const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
    return (await pdf(buffer)).text;
  }

  private async _readCSV(buffer: Buffer): Promise<string[]> {
    const csvParser = (await import("csv-parser")).default;

    return new Promise((resolve, reject) => {
      const data: string[] = [];
      const parser = csvParser();

      parser.on("data", (row) => {
        const text = Object.entries(row)
          .map(([key, value]) => `\\${key}: ${value}`)
          .join("");

        data.push(text);
      });

      parser.on("end", () => {
        resolve(data);
      });

      parser.on("error", (error) => {
        reject(error);
      });

      parser.write(buffer);
      parser.end();
    });
  }

  private _readBuffer(buffer: Buffer, ext: UploadFileExt): Promise<string | string[]> {
    return new Promise((resolve, reject) => {
      try {
        if (ext === "pdf") {
          this._readPDF(buffer)
            .then((text) => resolve(text))
            .catch(reject);
        } else if (ext === "csv") {
          this._readCSV(buffer)
            .then((text) => resolve(text))
            .catch(reject);
        } else if (ext === "txt") {
          resolve(buffer.toString("utf-8"));
        } else {
          reject("Unsupported file type");
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async upload({ buffer, name, ext, tableParams, textSplitterOptions, embeddingParams }: UploadFileValues<TAI>) {
    const { name: tableName = "vectors", contentColumnName = "content", vColumnName = "v_content" } = tableParams ?? {};
    const { chunkSize, delimiter } = textSplitterOptions ?? {};

    const bufferContent = await this._readBuffer(buffer, ext);

    let chunks: string[] = [];
    if (Array.isArray(bufferContent)) {
      chunks = bufferContent;
    } else {
      chunks = this._ai.textSplitter.split(bufferContent, { chunkSize, delimiter });
    }

    const table = await this._createTable(tableName, {
      dimensions: embeddingParams && "dimensions" in embeddingParams ? (embeddingParams.dimensions as number) : 1536,
    });

    const processChunks = async (chunks: string[]) => {
      const embeddings = await this._ai.embeddings.create(chunks, embeddingParams);

      const values = chunks.map((chunk, i) => {
        const createdAt = new Date().toISOString().replace("T", " ").substring(0, 23);
        return {
          name,
          [contentColumnName]: chunk,
          [vColumnName]: JSON.stringify(embeddings[i]),
          createdAt,
        };
      });

      return table.insert(values);
    };

    const limit = 1000;
    if (chunks.length > limit) {
      for (let i = 0; i < chunks.length; i += limit) {
        await processChunks(chunks.slice(i, i + limit));
      }
    } else {
      await processChunks(chunks);
    }
  }

  async delete(name: string, tableName: TableName = "vectors") {
    return this._database.table.use(tableName).delete({ name });
  }
}
