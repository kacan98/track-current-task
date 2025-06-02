import fs from 'fs';

export const saveFileInFolder = (data: string, folderName: string, customFileNameWithoutExtension: string, fileExtension = 'md', makeFileNameUnique = true): string => {
    if (!fs.existsSync(folderName) && folderName !== '') {
        fs.mkdirSync(folderName);
    }

    const fileName = `${folderName ? folderName + '/' : ''}` + (makeFileNameUnique ? (getDateForFileName() + "_"): '') + customFileNameWithoutExtension + `.${fileExtension}`;
    fs.writeFileSync(fileName, data);
    return fileName;
}

const getDateForFileName = () => {
    const today = new Date();
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}-${pad(today.getHours())}h${pad(today.getMinutes())}m${pad(today.getSeconds())}s`;
};