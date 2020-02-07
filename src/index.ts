import { ReadStream } from "fs";
import neatCsv from "neat-csv";
import { Readable } from "stream";
import StreamCleaner, { MATCH_NON_PRINTABLE } from "StreamCleaner";

export { MATCH_NON_PRINTABLE } from "StreamCleaner";

interface ParserArgs {
  booleanColumns?: Array<string>;
  numericColumns?: Array<string>;
  maxChars?: number;
  escapeChar?: string;
  progressCallback?: ProgressCallback;
  columnTransformers?: ColumnTransformers;
  filterInput?: boolean | RegExp;
}

interface MapValuesArgs {
  header: string;
  value: any;
}

type ColumnTransformers = { [key: string]: (value: string) => string };

type StatementExecutor = (statement: string) => Promise<any>;

const PG_IDENTIFIER_MAX_LENGTH = 63;
const validPGIdentifierPattern = /^\s*[_A-Za-z][\w$]{0,62}\s*$/i;
const escapePGIdentifier = (idLabel: string): string => {
  idLabel = idLabel.trim();
  if (validPGIdentifierPattern.test(idLabel)) {
    return idLabel;
  } else if (idLabel.length > PG_IDENTIFIER_MAX_LENGTH) {
    console.log(`Truncating an identifier that exceeds postgres identifier size of ${PG_IDENTIFIER_MAX_LENGTH}: ${idLabel}`);
    return escapePGIdentifier(idLabel.substr(0, PG_IDENTIFIER_MAX_LENGTH));
  }

  console.log(`Invalid label, escaping: "${idLabel}"`);
  return `"${idLabel.replace(MATCH_NON_PRINTABLE, "")}"`;
};

const sqlizePGData = (data: string): string => {
  return `'${data.replace(/'/g, "''")
    .replace(/\\/g, "\\\\")}'`;
};

function createValueMapper(
  booleanColumns: Array<string>,
  numericColumns: Array<string>,
  columnTransformers: ColumnTransformers,
) {
  return (args: MapValuesArgs) => {
    let value = args.value;

    if (columnTransformers[args.header]) {
      value = columnTransformers[args.header](value);
    }

    if (numericColumns?.indexOf(args.header) >= 0) {
      return value;
    }
    if (booleanColumns?.indexOf(args.header) >= 0) {
      switch (value) {
        case "1":
        case "true":
        case "TRUE":
          return true;
        case "0":
        case "false":
        case "FALSE":
          return false;
      }
    }

    return value === "NULL" ? "NULL" : sqlizePGData(value);
  };
}

function createExecutor(
  uploader: StatementExecutor,
  progressCallback: ProgressCallback,
  tableName: string,
  totalRows: number,
) {
  return async (statement: string, rowCount: number) => {
    try {
      await uploader(statement);
      progressCallback((rowCount / totalRows) * 100, tableName);
    } catch (ex) {
      console.error(`Error executing ${statement}`);
      throw new Error(ex.message);
    }
  };
}

type ProgressCallback = (progress: number, tableName: string) => void;

const DefaultProgressCallback: ProgressCallback = (
  progress: number,
  tableName: string,
) =>
  console.error(`${progress.toFixed(2)}% of records uploaded to ${tableName}`);

function createNewValuesStatement(
  columns: string[],
  entry: any,
): string | undefined {
  const columnData = columns
    .map(key => entry[key])
    .map(value => (value === undefined ? "NULL" : value));

  if (!columnData.find(x => x !== "NULL")) {
    return;
  }

  return `(${columnData.join(",")})`;
}

const createInsertStatement = (table_name: string, columns: string[]) =>
  `INSERT INTO ${escapePGIdentifier(table_name)} (${columns
    .map(column_name => escapePGIdentifier(column_name))
    .join(",")}) VALUES `;

export const CsvInsert = function (
  uploader: StatementExecutor,
  settings?: ParserArgs,
) {
  const columnTransformers = settings?.columnTransformers ?? {};
  const mapValues = createValueMapper(
    settings?.booleanColumns ?? [],
    settings?.numericColumns ?? [],
    columnTransformers,
  );
  const progressCallback =
    settings?.progressCallback ?? DefaultProgressCallback;
  const MAX_CHARS = settings?.maxChars ?? 64000;
  const escapeChar = settings?.escapeChar ?? "\\";

  return async (readStream: ReadStream, table_name: string) => {
    let sourceStream: Readable = readStream;

    if (settings.filterInput) {
      const filter =
        settings.filterInput === true
          ? MATCH_NON_PRINTABLE
          : settings.filterInput;
      sourceStream = sourceStream.pipe(new StreamCleaner(filter));
    }

    const data = await neatCsv(sourceStream, {
      mapValues,
      escape: escapeChar,
    });

    const columns = Object.keys(data[0]);
    let insertStart = createInsertStatement(table_name, columns);
    let statement = "";

    let idx = 0;

    const executeStatement = createExecutor(
      uploader,
      progressCallback,
      table_name,
      data.length,
    );

    for (const entry of data) {
      idx++;

      const newStatement = createNewValuesStatement(columns, entry);

      if (!newStatement) continue;

      if (
        !isNaN(MAX_CHARS) &&
        statement.length + newStatement.length > MAX_CHARS
      ) {
        await executeStatement(statement, idx);
        statement = "";
      }

      if (statement.length === 0) {
        statement = `${insertStart}\n${newStatement}`;
      } else {
        statement += `,\n${newStatement}`;
      }
    }

    if (statement.length > insertStart.length) {
      await executeStatement(statement, idx);
    }
  };
};
