const fs = require('fs');
const path = require('path');

const executablesPath = path.join(__dirname, '..', '..', '..', 'dist', 'background-tracker-executables');

if (fs.existsSync(executablesPath)) {
    fs.rmSync(executablesPath, { recursive: true, force: true });
    console.log('✅ Cleaned old executables');
} else {
    console.log('📁 No old executables to clean');
}