export interface ElectronAPI {
    openExternal: (url: string) => Promise<void>;
    selectDirectory: () => Promise<string | null>;
    getFiles: (dirPath: string) => Promise<{ name: string; path: string; updatedAt: number }[]>;
    readFile: (filePath: string) => Promise<string>;
    saveFile: (filePath: string, content: string) => Promise<boolean>;
    createFile: (dirPath: string, fileName: string) => Promise<string | null>;
    renameFile: (oldPath: string, newName: string) => Promise<string | null>;
    deleteFile: (filePath: string) => Promise<boolean>;
    onMainMessage: (callback: (message: string) => void) => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
