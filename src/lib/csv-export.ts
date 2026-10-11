import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { type RowDataPacket, Types } from "mysql2";
import { pool } from "@/db";

const exportDirectory = path.join(process.cwd(), "data", "exports");
const exportIntervalMs = 5_000;
let exportInProgress = false;

function escapeCsv(value: unknown, isDate = false): string {
  if (value === null || value === undefined) return "";
  let text: string;
  if (value instanceof Date && isDate) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    text = `${value.getFullYear()}-${month}-${day}`;
  } else if (value instanceof Date) {
    text = value.toISOString();
  } else if (Buffer.isBuffer(value)) {
    text = value.toString("base64");
  } else {
    text = String(value);
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function exportTablesToCsv(): Promise<void> {
  if (exportInProgress) return;
  exportInProgress = true;

  try {
    await mkdir(exportDirectory, { recursive: true });
    const [tables] = await pool.query<RowDataPacket[]>("SHOW TABLES");
    const exportedFiles = new Set<string>();

    for (const tableRow of tables) {
      const tableName = String(Object.values(tableRow)[0]);
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new Error(`Unexpected MySQL table name: ${tableName}`);
      }

      const [rows, fields] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM \`${tableName}\` ORDER BY \`id\``
      );
      const headers = fields.map((field) => field.name);
      const dateColumns = new Set(
        fields.filter((field) => field.type === Types.DATE).map((field) => field.name)
      );
      const csv = [
        headers.map((header) => escapeCsv(header)).join(","),
        ...rows.map((row) =>
          headers
            .map((header) => escapeCsv(row[header], dateColumns.has(header)))
            .join(",")
        ),
      ].join("\r\n");
      const fileName = `${tableName}.csv`;
      const targetPath = path.join(exportDirectory, fileName);
      const temporaryPath = `${targetPath}.tmp`;

      await writeFile(temporaryPath, `${csv}\r\n`, "utf8");
      await rename(temporaryPath, targetPath);
      exportedFiles.add(fileName);
    }

    const existingFiles = await readdir(exportDirectory);
    await Promise.all(
      existingFiles
        .filter((fileName) => fileName.endsWith(".csv") && !exportedFiles.has(fileName))
        .map((fileName) => rm(path.join(exportDirectory, fileName)))
    );
  } finally {
    exportInProgress = false;
  }
}

export function startCsvExportScheduler(): void {
  const runExport = () => {
    void exportTablesToCsv().catch((error: unknown) => {
      console.error("[csv-export] Failed to refresh table exports:", error);
    });
  };

  runExport();
  setInterval(runExport, exportIntervalMs);
}
