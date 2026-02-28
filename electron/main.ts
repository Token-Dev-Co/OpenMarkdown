import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hiddenInset',
        vibrancy: 'sidebar', // Apple-specific vibrancy
        visualEffectState: 'active',
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
        },
    })

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(createWindow)

// IPC Handlers
ipcMain.handle('open-external', async (_, url: string) => {
    await shell.openExternal(url)
})
ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
        properties: ['openDirectory']
    })
    if (canceled) return null
    return filePaths[0]
})

ipcMain.handle('get-files', async (_, dirPath: string) => {
    try {
        const files = await fs.readdir(dirPath)
        const mdFiles = files.filter(f => f.endsWith('.md'))
        const filesWithStats = await Promise.all(mdFiles.map(async f => {
            const stats = await fs.stat(path.join(dirPath, f))
            return {
                name: f,
                path: path.join(dirPath, f),
                updatedAt: stats.mtimeMs
            }
        }))
        return filesWithStats
    } catch (error) {
        console.error('Failed to get files:', error)
        return []
    }
})

ipcMain.handle('read-file', async (_, filePath: string) => {
    try {
        return await fs.readFile(filePath, 'utf-8')
    } catch (error) {
        console.error('Failed to read file:', error)
        return ''
    }
})

ipcMain.handle('save-file', async (_, filePath: string, content: string) => {
    try {
        await fs.writeFile(filePath, content, 'utf-8')
        return true
    } catch (error) {
        console.error('Failed to save file:', error)
        return false
    }
})

ipcMain.handle('create-file', async (_, dirPath: string, fileName: string) => {
    try {
        const fullPath = path.join(dirPath, fileName.endsWith('.md') ? fileName : `${fileName}.md`)
        await fs.writeFile(fullPath, '', 'utf-8')
        return fullPath
    } catch (error) {
        console.error('Failed to create file:', error)
        return null
    }
})
ipcMain.handle('rename-file', async (_, oldPath: string, newName: string) => {
    try {
        const dir = path.dirname(oldPath)
        const newPath = path.join(dir, newName.endsWith('.md') ? newName : `${newName}.md`)
        await fs.rename(oldPath, newPath)
        return newPath
    } catch (error) {
        console.error('Failed to rename file:', error)
        return null
    }
})

ipcMain.handle('delete-file', async (_, filePath: string) => {
    try {
        await fs.unlink(filePath)
        return true
    } catch (error) {
        console.error('Failed to delete file:', error)
        return false
    }
})
