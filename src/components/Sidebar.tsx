import { useState, useEffect, useCallback, useRef } from 'react'
import { FolderOpen, FileText, Plus, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react'

interface FileInfo {
    name: string
    path: string
    updatedAt: number
}

interface SidebarProps {
    onFileSelect: (filePath: string) => void
    selectedFilePath: string | null
    refreshTrigger?: number
}

export function Sidebar({ onFileSelect, selectedFilePath, refreshTrigger }: SidebarProps) {
    const [directory, setDirectory] = useState<string | null>(localStorage.getItem('last-directory'))
    const [files, setFiles] = useState<FileInfo[]>([])
    const [search, setSearch] = useState('')
    const [menuOpen, setMenuOpen] = useState<string | null>(null)
    const [modalData, setModalData] = useState<{ type: 'rename' | 'delete', file: FileInfo } | null>(null)
    const [modalInput, setModalInput] = useState('')
    const modalInputRef = useRef<HTMLInputElement>(null)

    const loadFiles = useCallback(async (dirPath: string) => {
        if (!window.electronAPI) return
        const fileList = await window.electronAPI.getFiles(dirPath)
        setFiles(fileList)
    }, [])

    const handleSelectDirectory = async () => {
        if (!window.electronAPI) return
        const dirPath = await window.electronAPI.selectDirectory()
        if (dirPath) {
            setDirectory(dirPath)
            localStorage.setItem('last-directory', dirPath)
        }
    }

    const handleCreateFile = async () => {
        if (!directory || !window.electronAPI) return
        const fileName = `note-${Date.now()}.md`
        const newPath = await window.electronAPI.createFile(directory, fileName)
        if (newPath) {
            await loadFiles(directory)
            onFileSelect(newPath)
            // Open modal to rename the newly created file immediately
            const stats = { name: fileName, path: newPath, updatedAt: Date.now() }
            setModalData({ type: 'rename', file: stats })
            setModalInput(fileName.replace('.md', ''))
        }
    }

    const handleFileAction = async () => {
        if (!modalData || !window.electronAPI || !directory) return

        if (modalData.type === 'rename') {
            if (!modalInput.trim() || modalInput === modalData.file.name.replace('.md', '')) {
                setModalData(null)
                return
            }
            // If renaming active file, notify App to save or handle it here
            // But App's handleRenameFile already does this.
            // Sidebar's handleFileAction should ideally use App's logic or coordinate.
            const success = await window.electronAPI.renameFile(modalData.file.path, modalInput.trim())
            if (success) {
                await loadFiles(directory)
                if (selectedFilePath === modalData.file.path) {
                    onFileSelect(success)
                }
            }
        } else if (modalData.type === 'delete') {
            const success = await window.electronAPI.deleteFile(modalData.file.path)
            if (success) {
                await loadFiles(directory)
                if (selectedFilePath === modalData.file.path) onFileSelect('')
            }
        }
        setModalData(null)
    }

    useEffect(() => { if (directory) loadFiles(directory) }, [directory, loadFiles, refreshTrigger])

    useEffect(() => {
        if (modalData?.type === 'rename' && modalInputRef.current) {
            modalInputRef.current.focus()
            modalInputRef.current.select()
        }
    }, [modalData])

    const filteredFiles = files.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => b.updatedAt - a.updatedAt)

    return (
        <aside className="sidebar no-drag" onClick={() => setMenuOpen(null)}>
            <header className="sidebar-header">
                <span className="sidebar-title">Explorer</span>
                <div className="toolbar-group">
                    <button onClick={handleCreateFile} className="toolbar-btn" title="New Note"><Plus size={14} /></button>
                    <button onClick={handleSelectDirectory} className="toolbar-btn" title="Open Directory"><FolderOpen size={14} /></button>
                </div>
            </header>

            <div className="sidebar-content">
                {directory ? (
                    <>
                        <div className="px-2 mb-4" style={{ padding: '0 8px 16px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Filter items..."
                                    value={search}
                                    style={{ paddingLeft: '32px' }}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="file-list">
                            {filteredFiles.map((file) => (
                                <div key={file.path} style={{ position: 'relative' }}>
                                    <div
                                        onClick={() => onFileSelect(file.path)}
                                        className={`file-item ${selectedFilePath === file.path ? 'active' : ''}`}
                                    >
                                        <FileText size={14} style={{ opacity: selectedFilePath === file.path ? 0.9 : 0.4 }} />
                                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {file.name.replace('.md', '')}
                                        </span>
                                        <div
                                            className="toolbar-btn no-drag"
                                            style={{ padding: '4px', opacity: 0.4 }}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setMenuOpen(menuOpen === file.path ? null : file.path)
                                            }}
                                        >
                                            <MoreVertical size={12} />
                                        </div>
                                    </div>

                                    {menuOpen === file.path && (
                                        <div className="dropdown-menu" style={{ top: '32px', right: '8px' }}>
                                            <div className="dropdown-item" onClick={(e) => {
                                                e.stopPropagation()
                                                setModalData({ type: 'rename', file })
                                                setModalInput(file.name.replace('.md', ''))
                                                setMenuOpen(null)
                                            }}>
                                                <Edit2 size={12} /> Rename
                                            </div>
                                            <div className="dropdown-item danger" onClick={(e) => {
                                                e.stopPropagation()
                                                setModalData({ type: 'delete', file })
                                                setMenuOpen(null)
                                            }}>
                                                <Trash2 size={12} /> Delete
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        textAlign: 'center',
                        height: '100%',
                        opacity: 0.3
                    }}>
                        <FolderOpen size={32} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Project Isolated</p>
                    </div>
                )}
            </div>

            {/* Management Modal */}
            {modalData && (
                <div className="modal-overlay" onClick={() => setModalData(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {modalData.type === 'rename' ? 'Rename File' : 'Delete File'}
                            </h3>
                            <p className="modal-subtitle">
                                {modalData.type === 'rename'
                                    ? `Changing name for ${modalData.file.name}`
                                    : `Are you sure you want to remove ${modalData.file.name}?`
                                }
                            </p>
                        </div>

                        {modalData.type === 'rename' && (
                            <input
                                ref={modalInputRef}
                                className="search-input"
                                style={{ fontSize: '14px', padding: '10px 14px' }}
                                value={modalInput}
                                onChange={e => setModalInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleFileAction()}
                            />
                        )}

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalData(null)}>Cancel</button>
                            <button
                                className={`btn ${modalData.type === 'delete' ? 'btn-danger' : 'btn-primary-action'}`}
                                onClick={handleFileAction}
                            >
                                {modalData.type === 'rename' ? 'Save Changes' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    )
}
