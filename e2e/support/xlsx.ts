import ExcelJS from "exceljs";

export type Sheet = { name: string; headers: string[]; rows: Record<string, string>[] };

export async function readXlsx(file: string): Promise<Record<string, Sheet>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const result: Record<string, Sheet> = {};
    workbook.eachSheet(sheet => {
        const headers = ((sheet.getRow(1).values as unknown[]) ?? [])
            .slice(1)
            .map(v => String(v ?? ""));
        const rows: Record<string, string>[] = [];
        for (let i = 2; i <= sheet.rowCount; i++) {
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
                const value = sheet.getRow(i).getCell(index + 1).value;
                row[header] = value === null || value === undefined ? "" : String(value);
            });
            rows.push(row);
        }
        result[sheet.name] = { name: sheet.name, headers, rows };
    });
    return result;
}
