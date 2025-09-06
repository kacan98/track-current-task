/**
 * POST-BUILD EXECUTABLE SCRIPT
 * 
 * PURPOSE: Copy the built executable to Windows Startup folder and optionally start it
 * 
 * CRITICAL REQUIREMENTS:
 * 1. MUST kill existing processes before copying (Windows locks running executables)
 * 2. MUST wait for file locks to release (Windows is slow to release file handles)
 * 3. MUST NOT auto-start by default (prevents infinite loops during development)
 * 4. MUST handle paths with spaces (Windows Start Menu has spaces)
 * 5. MUST exit cleanly even if starting fails (don't hang the build)
 * 
 * COMMON PITFALLS TO AVOID:
 * - DON'T use exec() for starting the exe - it hangs waiting for the process to exit
 * - DON'T use 'start' command without proper quoting - spaces break it
 * - DON'T skip the file lock wait - causes "EBUSY: resource busy" errors
 * - DON'T auto-start without safeguards - causes infinite spawn loops
 * - DON'T use shell:true with spawn for paths - causes quote parsing issues
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const os = require('os');

async function postBuild() {
    console.log('🚀 Post-build: Copying executable and managing service...');
    
    // REQUIREMENT: Only run on Windows (startup folder is Windows-specific)
    if (process.platform !== 'win32') {
        console.log('⚠️  Skipping Windows-specific post-build steps on non-Windows platform');
        return;
    }
    
    const executableName = 'background-tracker-win.exe';
    const sourcePath = path.join(__dirname, '..', '..', '..', 'dist', 'background-tracker-executables', executableName);
    
    // REQUIREMENT: Verify source exists (pkg must have succeeded)
    if (!fs.existsSync(sourcePath)) {
        console.error(`❌ Source executable not found: ${sourcePath}`);
        console.error('Make sure the build completed successfully.');
        return;
    }
    
    // CRITICAL: Path has spaces in "Start Menu" - must handle carefully!
    const startupFolder = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
    
    // REQUIREMENT: Verify Windows startup folder exists
    if (!fs.existsSync(startupFolder)) {
        console.error(`❌ Startup folder does not exist: ${startupFolder}`);
        return;
    }
    
    const targetPath = path.join(startupFolder, executableName);
    
    try {
        // Step 1: CRITICAL - Kill running processes or file copy will fail with EBUSY
        console.log('🔍 Checking for running processes...');
        const processWasStopped = await stopExistingProcess(executableName);
        
        // Step 2: Copy with retry logic (Windows can be slow to release file locks)
        if (fs.existsSync(sourcePath)) {
            console.log('📋 Copying executable to startup folder...');
            
            // Try to copy with retries if file is locked
            let copied = false;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (!copied && attempts < maxAttempts) {
                attempts++;
                try {
                    // IMPORTANT: Delete old file first (can't overwrite locked files)
                    if (fs.existsSync(targetPath)) {
                        try {
                            fs.unlinkSync(targetPath);
                            console.log('🗑️  Removed old executable from startup folder');
                        } catch (unlinkError) {
                            console.log(`⚠️  Could not remove old file (attempt ${attempts}/${maxAttempts}): ${unlinkError.message}`);
                            if (attempts < maxAttempts) {
                                console.log('⏳ Waiting 2 seconds before retry...');
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                continue; // Retry the whole loop
                            }
                        }
                    }
                    
                    fs.copyFileSync(sourcePath, targetPath);
                    console.log(`✅ Copied to: ${targetPath}`);
                    copied = true;
                } catch (copyError) {
                    console.log(`⚠️  Copy failed (attempt ${attempts}/${maxAttempts}): ${copyError.message}`);
                    if (attempts < maxAttempts) {
                        console.log('⏳ Waiting 2 seconds before retry...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        console.error('❌ Failed to copy after all attempts');
                        return;
                    }
                }
            }
            
            if (!copied) {
                console.log(`❌ Could not copy file after ${maxAttempts} attempts`);
                return;
            }
        } else {
            console.log(`❌ Source file not found: ${sourcePath}`);
            return;
        }
        
        // Step 3: CRITICAL - Wait for Windows to fully release the process (only if we stopped one)
        if (processWasStopped) {
            console.log('⏳ Waiting for previous process to fully terminate...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Step 4: Open the folder to show where the executable is
        console.log('✅ Executable copied to startup folder:');
        console.log(`📁 ${targetPath}`);
        
        // Open Windows Explorer to the startup folder
        try {
            exec(`explorer.exe "${startupFolder}"`, (error) => {
                // Don't log anything here - the operation is async and happens after we finish
                // The folder usually opens successfully even if this callback shows an error
            });
            console.log('📂 Opening startup folder in Windows Explorer...');
        } catch (error) {
            console.log('⚠️  Could not open folder automatically');
        }
        
        console.log('🎉 Post-build complete!');
        
    } catch (error) {
        console.error('❌ Post-build error:', error.message);
    }
}

/**
 * CRITICAL FUNCTION: Stop all running instances of the executable
 * 
 * WHY: Windows locks running executables - can't copy/replace them while running
 * 
 * REQUIREMENTS:
 * - MUST force kill (/F flag) or process might not stop
 * - MUST wait for file locks to release after killing
 * - MUST handle "process not found" gracefully (it's OK if not running)
 * 
 * GOTCHAS:
 * - Windows is SLOW to release file locks - we wait 3+ seconds total
 * - taskkill might return error even on success
 * - Need to escape quotes in exe name to prevent command injection
 */
function stopExistingProcess(executableName) {
    return new Promise((resolve) => {
        // First, try to kill the process by name
        console.log(`🔍 Looking for ${executableName} processes...`);
        
        // SAFETY: Remove quotes to prevent command injection
        const safeExeName = executableName.replace(/["']/g, '');
        exec(`taskkill /F /IM "${safeExeName}" 2>nul`, (error, stdout, stderr) => {
            let processWasStopped = false;
            
            if (error) {
                // Error code 128 means process not found, which is okay
                if (error.code === 128 || stderr.includes('not found')) {
                    console.log('No existing process found');
                    resolve(false); // Return false - no process was stopped
                    return;
                } else {
                    console.log('Note: Process might not be running or already stopped');
                }
            } else {
                console.log('✅ Existing process(es) stopped');
                processWasStopped = true;
            }
            
            // Only wait for file locks if we actually stopped a process
            if (processWasStopped) {
                console.log('⏳ Waiting for file locks to release...');
                setTimeout(() => {
                    // Belt-and-suspenders: Try to kill again in case it respawned
                    const safeExeName = executableName.replace(/["']/g, '');
                    exec(`taskkill /F /IM "${safeExeName}" 2>nul`, () => {
                        // Don't care about result - just making sure
                        setTimeout(() => resolve(true), 2000); // Return true - process was stopped
                    });
                }, 1000);
            } else {
                resolve(false); // Return false - no process was stopped
            }
        });
    });
}

/**
 * START NEW PROCESS FUNCTION
 * 
 * PURPOSE: Launch the executable in a detached, independent process
 * 
 * CRITICAL REQUIREMENTS:
 * - MUST NOT hang the build script waiting for the exe to exit
 * - MUST handle paths with spaces (Windows Start Menu)
 * - MUST create truly independent process that survives parent exit
 * 
 * APPROACH HISTORY (for future reference):
 * - exec() with start command: HANGS waiting for process
 * - spawn with shell:true: BREAKS on spaces in path
 * - spawn with cmd /c start: COMPLEX quoting issues
 * - spawn with shell:false: WORKS! Direct execution, no parsing issues
 * 
 * DON'T CHANGE TO:
 * - exec() - will hang
 * - shell:true - will break on spaces
 * - Removing detached:true - process will die with parent
 * - Removing unref() - parent won't be able to exit
 */
function startNewProcess(executablePath) {
    return new Promise((resolve) => {
        console.log('🚀 Starting process in new window...');
        console.log(`📁 Executable path: ${executablePath}`);
        
        // REQUIREMENT: Verify file exists (better error message than spawn error)
        if (!fs.existsSync(executablePath)) {
            console.error('❌ Executable not found at path!');
            resolve();
            return;
        }
        
        try {
            // CRITICAL: Use spawn with shell:false for direct execution
            // This avoids ALL the quote/space parsing issues
            const child = spawn(executablePath, [], {
                detached: true,     // Run independently of parent
                stdio: 'ignore',    // Don't wait for I/O
                shell: false        // CRITICAL: Direct execution, no shell parsing
            });
            
            child.unref(); // CRITICAL: Let parent exit without waiting
            
            // Optional: Verify the process actually started
            // Note: This is just for logging - we resolve either way
            setTimeout(() => {
                exec(`tasklist /FI "IMAGENAME eq git-activity-logger-win.exe" 2>nul`, (checkError, checkStdout) => {
                    if (!checkError && checkStdout.includes('git-activity-logger-win.exe')) {
                        console.log('✅ Process verified as running!');
                    } else {
                        console.log('⚠️  Process started but could not verify');
                    }
                    resolve(); // ALWAYS resolve - don't hang the build
                });
            }, 2000);
            
        } catch (error) {
            console.error('❌ Failed to start process:', error.message);
            resolve();
        }
    });
}

// Run the post-build process
// Exit cleanly even if errors occur (don't break the build)
postBuild().catch(console.error);