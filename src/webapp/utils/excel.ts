import ExcelJS from "exceljs";

export type ExcelSheet = {
    name: string;
    header: string[];
    rows: string[][];
};

/**
 * Builds the workbook in the browser and downloads it. Empty text is left as an empty cell.
 * Excel limits sheet names to 31 characters and a few symbols.
 */
export async function downloadExcel(filename: string, sheets: ExcelSheet[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    for (const sheet of sheets) {
        const worksheet = workbook.addWorksheet(sanitizeSheetName(sheet.name));
        worksheet.addRow(sheet.header).font = { bold: true };
        sheet.rows.forEach(row => worksheet.addRow(row.map(value => value || null)));
        worksheet.columns.forEach(column => {
            column.width = 30;
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveBlob(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename
    );
}

export function sanitizeSheetName(name: string): string {
    return name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
}

/** Characters that are not allowed in file names. */
export function sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, "_");
}

function saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
