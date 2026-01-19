import * as XLSX from 'xlsx';

export interface ImportedParticipant {
    id: string;
    name: string;
    department: string;
    employeeId: string;
}

export interface ImportedPrize {
    name: string;
    count: number;
}

export interface ImportResult {
    participants: ImportedParticipant[];
    prizes: ImportedPrize[];
}

export const readExcel = async (file: File): Promise<ImportResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                // 1. Parse Participants (First Sheet or named "Participants"/"名單")
                let partSheetName = workbook.SheetNames.find(n => n.includes('Participant') || n.includes('名單')) || workbook.SheetNames[0];
                const partRows = XLSX.utils.sheet_to_json(workbook.Sheets[partSheetName], { header: 1 }) as any[][];

                const participants: ImportedParticipant[] = [];
                if (partRows.length > 0) {
                    // Header Detection
                    const headerRow = partRows[0].map((cell: any) => String(cell).toLowerCase());
                    let nameIdx = headerRow.findIndex(h => h.includes('name') || h.includes('姓名'));
                    let deptIdx = headerRow.findIndex(h => h.includes('dept') || h.includes('department') || h.includes('部門') || h.includes('單位'));
                    let idIdx = headerRow.findIndex(h => h.includes('id') || h.includes('員編') || h.includes('員工編號') || h.includes('employee'));

                    let startRow = 1;
                    // Fallback if no header
                    if (nameIdx === -1) {
                        nameIdx = 0;
                        if (partRows[0].length > 1) deptIdx = 1;
                        startRow = 0;
                    }

                    for (let i = startRow; i < partRows.length; i++) {
                        const row = partRows[i];
                        if (!row || row.length === 0) continue;
                        const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';
                        if (!name) continue;
                        const dept = deptIdx !== -1 && row[deptIdx] ? String(row[deptIdx]).trim() : 'Unknown';
                        const empId = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : `UNK${Math.floor(Math.random() * 10000)}`;
                        participants.push({ id: crypto.randomUUID(), name, department: dept, employeeId: empId });
                    }
                }

                // 2. Parse Prizes (Named "Prizes"/"獎項")
                const prizes: ImportedPrize[] = [];
                const prizeSheetName = workbook.SheetNames.find(n => n.includes('Prize') || n.includes('獎項'));
                if (prizeSheetName) {
                    const prizeRows = XLSX.utils.sheet_to_json(workbook.Sheets[prizeSheetName], { header: 1 }) as any[][];
                    if (prizeRows.length > 0) {
                        const pHeader = prizeRows[0].map((cell: any) => String(cell).toLowerCase());
                        let pNameIdx = pHeader.findIndex(h => h.includes('name') || h.includes('名稱') || h.includes('獎項'));
                        let pCountIdx = pHeader.findIndex(h => h.includes('count') || h.includes('名額') || h.includes('數量'));

                        let pStart = 1;
                        if (pNameIdx === -1) { pNameIdx = 0; pCountIdx = 1; pStart = 0; }

                        for (let i = pStart; i < prizeRows.length; i++) {
                            const row = prizeRows[i];
                            if (!row || row.length === 0) continue;
                            const name = row[pNameIdx] ? String(row[pNameIdx]).trim() : '';
                            if (!name) continue;
                            const count = (pCountIdx !== -1 && row[pCountIdx]) ? parseInt(String(row[pCountIdx])) : 1;
                            prizes.push({ name, count: isNaN(count) ? 1 : count });
                        }
                    }
                }

                resolve({ participants, prizes });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
    });
};
