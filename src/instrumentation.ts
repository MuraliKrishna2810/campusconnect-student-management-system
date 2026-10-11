export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startCsvExportScheduler } = await import("@/lib/csv-export");
  startCsvExportScheduler();
}
