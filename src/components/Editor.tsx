import { useRef, useState, useEffect } from 'react'
import {
    Bold, Italic, Link, Code, Heading1, Heading2, Heading3, List,
    CheckSquare, ListOrdered, Underline as UnderlineIcon, Strikethrough,
    FileEdit
} from 'lucide-react'

interface EditorProps {
    content: string
    onChange: (value: string) => void
    filePath: string
    onRename: (newName: string) => void
    onCursorChange?: (line: number, col: number) => void
}

export function Editor({ content, onChange, filePath, onRename, onCursorChange }: EditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [isEditingName, setIsEditingName] = useState(false)
    const [editName, setEditName] = useState('')
    const fileName = filePath.split('/').pop() || 'Untitled.md'
    const displayName = fileName.replace(/\.md$/, '')

    useEffect(() => {
        setEditName(displayName)
    }, [displayName])

    const handleRenameSubmit = () => {
        if (editName && editName !== displayName) {
            onRename(editName)
        }
        setIsEditingName(false)
    }

    const insertText = (before: string, after: string = '') => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = content.substring(start, end)

        const newText =
            content.substring(0, start) +
            before + selectedText + after +
            content.substring(end)

        onChange(newText)

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(
                start + before.length,
                end + before.length
            )
        }, 0)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            const textarea = textareaRef.current
            if (!textarea) return

            const start = textarea.selectionStart
            const textBeforeCursor = content.substring(0, start)
            const lines = textBeforeCursor.split('\n')
            const currentLine = lines[lines.length - 1]

            // Patterns to match: "1. ", "- ", "* ", "- [ ] ", "- [x] "
            const listMatch = currentLine.match(/^(\s*)([-*]\s+\[[ xX]\]\s+|[-*]\s+|\d+\.\s+)/)

            if (listMatch) {
                e.preventDefault()
                const fullPrefix = listMatch[0]
                const indent = listMatch[1]
                const symbol = listMatch[2]

                // If line is just the prefix, clear it (exit list)
                if (currentLine.trim() === symbol.trim()) {
                    const newText = content.substring(0, start - currentLine.length) + '\n' + content.substring(start)
                    onChange(newText)

                    setTimeout(() => {
                        const cursorPosition = start - currentLine.length + 1
                        textarea.focus()
                        textarea.setSelectionRange(cursorPosition, cursorPosition)
                    }, 0)
                    return
                }

                let nextPrefix = fullPrefix
                const numMatch = symbol.match(/^(\d+)\.\s+/)

                if (numMatch) {
                    const nextNum = parseInt(numMatch[1]) + 1
                    nextPrefix = `${indent}${nextNum}. `
                } else if (symbol.match(/^[-*]\s+\[[ xX]\]\s+/)) {
                    // if it's a checkbox, always continue with unchecked
                    nextPrefix = `${indent}- [ ] `
                }

                const newText = content.substring(0, start) + '\n' + nextPrefix + content.substring(start)
                onChange(newText)

                setTimeout(() => {
                    const cursorPosition = start + 1 + nextPrefix.length
                    textarea.focus()
                    textarea.setSelectionRange(cursorPosition, cursorPosition)
                }, 0)
            }
        }
    }

    const handleCursorUpdate = () => {
        if (!onCursorChange || !textareaRef.current) return
        const textarea = textareaRef.current
        const val = textarea.value
        const pos = textarea.selectionStart

        const linesBeforeCursor = val.substring(0, pos).split('\n')
        const currentLine = linesBeforeCursor.length
        const currentCol = linesBeforeCursor[linesBeforeCursor.length - 1].length + 1

        onCursorChange(currentLine, currentCol)
    }

    return (
        <main className="editor-pane">
            <header className="editor-header drag-handle">
                <div className="file-info no-drag">
                    {isEditingName ? (
                        <input
                            autoFocus
                            className="filename-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                        />
                    ) : (
                        <div className="filename-display" onClick={() => setIsEditingName(true)}>
                            <FileEdit size={12} className="edit-hint-icon" />
                            {displayName}
                        </div>
                    )}
                </div>

                <div className="toolbar-group no-drag">
                    <button onClick={() => insertText('**', '**')} className="toolbar-btn" title="Bold"><Bold size={14} /></button>
                    <button onClick={() => insertText('_', '_')} className="toolbar-btn" title="Italic"><Italic size={14} /></button>
                    <button onClick={() => insertText('<u>', '</u>')} className="toolbar-btn" title="Underline"><UnderlineIcon size={14} /></button>
                    <button onClick={() => insertText('~~', '~~')} className="toolbar-btn" title="Strikethrough"><Strikethrough size={14} /></button>

                    <div className="toolbar-separator" />

                    <button onClick={() => insertText('# ', '')} className="toolbar-btn" title="H1"><Heading1 size={14} /></button>
                    <button onClick={() => insertText('## ', '')} className="toolbar-btn" title="H2"><Heading2 size={14} /></button>
                    <button onClick={() => insertText('### ', '')} className="toolbar-btn" title="H3"><Heading3 size={14} /></button>

                    <div className="toolbar-separator" />

                    <button onClick={() => insertText('- ', '')} className="toolbar-btn" title="List"><List size={14} /></button>
                    <button onClick={() => insertText('1. ', '')} className="toolbar-btn" title="Numbered List"><ListOrdered size={14} /></button>
                    <button onClick={() => insertText('- [ ] ', '')} className="toolbar-btn" title="Checkbox"><CheckSquare size={14} /></button>

                    <div className="toolbar-separator" />

                    <button onClick={() => insertText('[', '](url)')} className="toolbar-btn" title="Link"><Link size={14} /></button>
                    <button onClick={() => insertText('`', '`')} className="toolbar-btn" title="Code"><Code size={14} /></button>
                </div>
            </header>

            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                    onChange(e.target.value)
                    handleCursorUpdate()
                }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleCursorUpdate}
                onClick={handleCursorUpdate}
                placeholder="Transform your thoughts into markdown..."
                className="editor-textarea no-drag"
                spellCheck={false}
            />
        </main>
    )
}
