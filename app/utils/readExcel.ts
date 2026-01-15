import * as XLSX from 'xlsx';

export interface ImportedParticipant {
    id: string;
    name: string;
    department: string;
}

export const readExcel = async (file: File): Promise<ImportedParticipant[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Import as array of arrays

                // Simple heuristic to find headers
                const rows = jsonData as any[][];
                if (rows.length === 0) {
                    resolve([]);
                    return;
                }

                // Assume first row is header if it contains string "Name" or "Department"
                // Otherwise assume it's data
                let headerRowIndex = 0;
                const headerRow = rows[0].map((cell: any) => String(cell).toLowerCase());

                let nameIdx = headerRow.findIndex(h => h.includes('name') || h.includes('姓名'));
                let deptIdx = headerRow.findIndex(h => h.includes('dept') || h.includes('department') || h.includes('部門') || h.includes('單位'));
                let idIdx = headerRow.findIndex(h => h.includes('id') || h.includes('工號'));

                // Fallback: If no headers found, assume Col 0 = ID/Name, Col 1 = Name/Dept
                if (nameIdx === -1) {
                    // Try to guess based on content or just hardcode: Col 0 = Name, Col 1 = Dept
                    nameIdx = 0;
                    if (rows[0].length > 1) deptIdx = 1;
                    // If we are guessing, include the first row as data
                    headerRowIndex = -1;
                }

                const participants: ImportedParticipant[] = [];

                for (let i = headerRowIndex + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0) continue;

                    const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';
                    if (!name) continue;

                    const dept = deptIdx !== -1 && row[deptIdx] ? String(row[deptIdx]).trim() : 'Unknown';
                    const id = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : crypto.randomUUID();

                    participants.push({
                        id,
                        name,
                        department: dept
                    });
                }

                resolve(participants);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
    });
};
