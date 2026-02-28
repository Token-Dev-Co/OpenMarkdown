import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkIns from 'remark-ins'
import rehypeRaw from 'rehype-raw'
import { Eye } from 'lucide-react'

interface PreviewProps {
    content: string
    onToggleCheckbox?: (index: number, checked: boolean) => void
}

export function Preview({ content, onToggleCheckbox }: PreviewProps) {
    return (
        <section className="preview-pane">
            <header className="preview-header">
                <div className="preview-label">
                    <Eye size={14} style={{ opacity: 0.6 }} />
                    <span>Real-time Preview</span>
                </div>
            </header>

            <div className="preview-body">
                <div className="prose">
                    {content ? (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkIns]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                                a: ({ node, ...props }) => {
                                    return (
                                        <a
                                            {...props}
                                            href={props.href}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (props.href && window.electronAPI && window.electronAPI.openExternal) {
                                                    window.electronAPI.openExternal(props.href);
                                                }
                                            }}
                                        >
                                            {props.children}
                                        </a>
                                    )
                                },
                                input: ({ node, ...props }) => {
                                    if (props.type === 'checkbox') {
                                        return (
                                            <input
                                                type="checkbox"
                                                checked={props.checked}
                                                onChange={(e) => {
                                                    const allCheckboxes = Array.from(document.querySelectorAll('.preview-pane input[type="checkbox"]'));
                                                    const index = allCheckboxes.indexOf(e.target as HTMLInputElement);
                                                    if (index !== -1 && onToggleCheckbox) {
                                                        onToggleCheckbox(index, e.target.checked)
                                                    }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        )
                                    }
                                    return <input {...props} />
                                }
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    ) : (
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.05,
                            marginTop: '100px',
                            textAlign: 'center'
                        }}>
                            <Eye size={64} style={{ marginBottom: '24px' }} />
                            <h3 style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em' }}>Awaiting Sync</h3>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
