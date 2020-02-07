# Postgres Insert CSV

[![Build Status](https://travis-ci.org/drg-adaptive/pg-insert-csv.svg?branch=master)](https://travis-ci.org/drg-adaptive/pg-insert-csv)
[![Maintainability](https://api.codeclimate.com/v1/badges/fbabb0d394cabc87e845/maintainability)](https://codeclimate.com/github/drg-adaptive/pg-insert-csv/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/fbabb0d394cabc87e845/test_coverage)](https://codeclimate.com/github/drg-adaptive/pg-insert-csv/test_coverage)
[![npm version](https://badge.fury.io/js/pg-insert-csv.svg)](https://badge.fury.io/js/pg-insert-csv)

Iterate over rows in a csv file and easily insert them into a postgres database.

**Note**
This will break up insert commands to limit the maximum number of bytes per statement. This is to allow usage with the Aurora Data API. To remove this limitation, set the
`maxChars` setting to `NaN`.

## Usage

First, create an instance:

```typescript
import { CsvInsert } from "pg-insert-csv";

const insert = CsvInsert((statement: string) => pg.runSql(statement), {
  numericColumns: ["total_orders"],
  maxChars: NaN
});
```

Now, open a read stream to a CSV file, and pass it into the new instance:

```typescript
const reader = fs.createReadStream("some/file/path.csv");

await insert(reader, "some_table");
```

### Progress Callback

If you want to display the current progress outside of the default `std.err` output
you can specify a callback that accepts the current progress and table name.

```typescript
const insert = CsvInsert((statement: string) => pg.runSql(statement), {
  progressCallback: (progress: number, tableName: string) =>
    console.info(`Current progress: ${progress.toFixed(2)}%`)
});
```

### Column Transformers

If a specific column needs to be modified before insert, you can do that by
defining column transformers.

```typescript
const insert = CsvInsert((statement: string) => pg.runSql(statement), {
  columnTransformers: {
    some_column: (value: string) => value.toUpperCase()
  }
});
```

### Remove Non Printable Characters

Sometimes non-printable characters can get added to a file when its edited using
an application like Excel. To avoid running into problems, you can set the `filterInput`
argument to either `true` or a regular expression to select the characters to be removed.

The default selector is `/[^\000-\031]+/gi`, this should remove all non-printable
characters.

```typescript
const insert = CsvInsert((statement: string) => pg.runSql(statement), {
  filterInput: true
});
```
