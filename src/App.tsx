import { useState, useEffect, useCallback, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'
import { Sun, Moon, Settings, Search, LayoutGrid, FileText } from 'lucide-react'

export default function App() {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('app-theme') as 'dark' | 'light') || 'dark'
  )
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [previewWidth, setPreviewWidth] = useState(450)
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0)
  const isResizingSidebar = useRef(false)
  const isResizingPreview = useRef(false)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        const newWidth = e.clientX
        if (newWidth > 150 && newWidth < 500) setSidebarWidth(newWidth)
      }
      if (isResizingPreview.current) {
        const newWidth = window.innerWidth - e.clientX
        if (newWidth > 200 && newWidth < 800) setPreviewWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      isResizingSidebar.current = false
      isResizingPreview.current = false
      document.body.style.cursor = 'default'
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleSave = useCallback(async (pathToSave?: string, contentToSave?: string) => {
    const targetPath = pathToSave || selectedFilePath
    const targetContent = contentToSave !== undefined ? contentToSave : content
    if (targetPath && window.electronAPI) {
      const success = await window.electronAPI.saveFile(targetPath, targetContent)
      if (success && targetPath === selectedFilePath) setIsDirty(false)
      return success
    }
    return false
  }, [selectedFilePath, content])

  const handleFileSelect = useCallback(async (path: string) => {
    if (!window.electronAPI) return

    // Save current file if dirty before switching
    if (isDirty && selectedFilePath) {
      await handleSave(selectedFilePath, content)
    }
    const fileContent = await window.electronAPI.readFile(path)
    if (fileContent !== null) {
      setSelectedFilePath(path)
      setContent(fileContent)
      setIsDirty(false)
    }
  }, [isDirty, selectedFilePath, content, handleSave])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDirty) handleSave()
    }, 1000)
    return () => clearTimeout(timer)
  }, [content, isDirty, handleSave])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('app-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const handleRenameFile = async (oldPath: string | null, newName: string) => {
    if (!window.electronAPI || !oldPath) return
    try {
      // Save current content to the OLD path before renaming
      if (isDirty) {
        await handleSave(oldPath, content)
      }

      const newPath = await window.electronAPI.renameFile(oldPath, newName)
      if (newPath) {
        setSelectedFilePath(newPath)
        setSidebarRefreshTrigger(prev => prev + 1)
      }
    } catch (error) {
      console.error('Failed to rename file:', error)
    }
  }

  const handleToggleCheckbox = (index: number, checked: boolean) => {
    console.log(`[App] Toggling checkbox at index ${index} to ${checked}`)
    const lines = content.split('\n')
    let currentIdx = -1
    const newLines = lines.map((line: string) => {
      // match any list item with a checkbox
      const match = line.match(/^(\s*)([-*+]\s|\d+\.\s)\[[ xX]\]\s/)
      if (match) {
        currentIdx++
        console.log(`[App] Found checkbox at currentIdx ${currentIdx}: "${line}"`)
        if (currentIdx === index) {
          const newLine = line.replace(/\[[ xX]\]/, checked ? '[x]' : '[ ]')
          console.log(`[App]   -> Replaced with: "${newLine}"`)
          return newLine
        }
      }
      return line
    })
    const newContent = newLines.join('\n')
    setContent(newContent)
    if (selectedFilePath) {
      window.electronAPI?.saveFile(selectedFilePath, newContent)
    }
  }

  return (
    <>
      {/* Global Top Menu Bar */}
      <header className="top-menu drag-handle">
        <div className="top-menu-group no-drag">
          <div className="menu-action">
            <LayoutGrid size={14} />
            <span>Workspace</span>
          </div>
          <div className="menu-action">
            <FileText size={14} />
            <span>Files</span>
          </div>
          <div className="menu-action">
            <Search size={14} />
            <span>Search</span>
          </div>
        </div>

        <div className="top-menu-group no-drag">
          <div className="menu-action" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          <div className="menu-action">
            <Settings size={14} />
          </div>
        </div>
      </header>

      <main className="app-container">
        <div style={{ width: sidebarWidth, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <Sidebar
            onFileSelect={handleFileSelect}
            selectedFilePath={selectedFilePath}
            refreshTrigger={sidebarRefreshTrigger}
          />
        </div>

        <div
          className="resizer"
          onMouseDown={(e) => {
            e.preventDefault()
            isResizingSidebar.current = true
            document.body.style.cursor = 'col-resize'
          }}
        />

        <div className="workspace">
          {selectedFilePath ? (
            <>
              <Editor
                content={content}
                onChange={(val) => {
                  setContent(val)
                  setIsDirty(true)
                }}
                filePath={selectedFilePath}
                onRename={(newName) => handleRenameFile(selectedFilePath, newName)}
                onCursorChange={(line, col) => setCursorPos({ line, col })}
              />

              <div
                className="resizer"
                onMouseDown={(e) => {
                  e.preventDefault()
                  isResizingPreview.current = true
                  document.body.style.cursor = 'col-resize'
                }}
              />

              <div style={{ width: previewWidth, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <Preview content={content} onToggleCheckbox={handleToggleCheckbox} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10">
              <div style={{ fontSize: '72px', marginBottom: '20px' }}>📁</div>
              <h2 className="sidebar-title" style={{ fontSize: '14px', letterSpacing: '0.4em' }}>Open Project</h2>
              <p style={{ marginTop: '8px', fontSize: '12px' }}>Select a file from the explorer to start writing</p>
            </div>
          )}
        </div>
      </main>

      {/* Reimagined Status Bar - Fixed Bottom */}
      <footer className="status-bar no-drag">
        <div className="status-group">
          {/* Removed as requested by user */}
        </div>

        <div className="status-group">
          <span>{content.trim().split(/\s+/).filter(Boolean).length} Words</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>{content.length} Characters</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>LN {cursorPos.line}, COL {cursorPos.col}</span>
        </div>
      </footer>
    </>
  )
}
