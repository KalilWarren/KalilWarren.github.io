/* ── Type declarations for CDN-loaded libraries ── */

interface PyodideInterface {
  loadPackage(names: string[]): Promise<void>;
  runPython(code: string): unknown;
}

declare function loadPyodide(options?: { indexURL?: string }): Promise<PyodideInterface>;

declare const XLSX: {
  utils: {
    aoa_to_sheet(data: (string | number | null | undefined)[][]): XLSXWorksheet;
    book_new(): XLSXWorkbook;
    book_append_sheet(wb: XLSXWorkbook, ws: XLSXWorksheet, name: string): void;
  };
  writeFile(wb: XLSXWorkbook, filename: string): void;
};

interface XLSXWorksheet {
  '!cols'?: { wch: number }[];
  [key: string]: unknown;
}

interface XLSXWorkbook {
  [key: string]: unknown;
}
