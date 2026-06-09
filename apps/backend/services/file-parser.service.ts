import Papa from "papaparse";
import * as xlsx from "xlsx";
import fs from "fs";
import path from "path";

export class FileParserService {
  /**
   * Parses a CSV or Excel file and returns an array of typed objects.
   * @param filePath The absolute path to the uploaded file
   * @returns Array of objects representing the rows
   */
  static async parseSpreadsheet<T = any>(filePath: string): Promise<T[]> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".csv") {
      return this.parseCSV<T>(filePath);
    } else if (ext === ".xlsx" || ext === ".xls") {
      return this.parseExcel<T>(filePath);
    } else {
      throw new Error("Unsupported file extension. Please provide .csv, .xls, or .xlsx");
    }
  }

  private static parseCSV<T>(filePath: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath);
      
      Papa.parse(fileStream, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as T[]);
        },
        error: (error: any) => {
          reject(new Error(`CSV Parsing Error: ${error.message}`));
        },
      });
    });
  }

  private static parseExcel<T>(filePath: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      try {
       
        const workbook = xlsx.readFile(filePath);
        
       
        const sheetName = workbook.SheetNames[0];
        

        if (!sheetName) {
          throw new Error("The uploaded Excel file contains no sheets.");
        }
        
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            throw new Error("Could not read the worksheet from the Excel file.");
        }

        const jsonData = xlsx.utils.sheet_to_json<T>(worksheet, {
          defval: "",
        });

        resolve(jsonData);
      } catch (error: any) {
        reject(new Error(`Excel Parsing Error: ${error.message}`));
      }
    });
  }
}