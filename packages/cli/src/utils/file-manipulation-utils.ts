import fs from 'fs';
import path from 'path';
import { resolvePathFromAppData } from '@shared/path-utils';

export const saveFileInFolder = (data: string, folderName: string, customFileNameWithoutExtension: string, fileExtension = 'md', makeFileNameUnique = true): string => {
    // Make folder path relative to app data directory
    const absoluteFolderPath = resolvePathFromAppData(folderName);
    
    if (!fs.existsSync(absoluteFolderPath) && folderName !== '') {
        fs.mkdirSync(absoluteFolderPath, { recursive: true });
    }

    const fileName = path.join(absoluteFolderPath, (makeFileNameUnique ? (getDateForFileName() + "_"): '') + customFileNameWithoutExtension + `.${fileExtension}`);
    fs.writeFileSync(fileName, data);
    return fileName;
}

const getDateForFileName = () => {
    const today = new Date();
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}-${pad(today.getHours())}h${pad(today.getMinutes())}m${pad(today.getSeconds())}s`;
};