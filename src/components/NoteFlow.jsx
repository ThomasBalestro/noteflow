import { useState, useEffect, useRef, useCallback } from 'react'
import { marked } from 'marked'

// ─── Données d'exemple ────────────────────────────────────────────────────────

const SAMPLE_NOTES = [
  {
    id: 1,
    title: 'Bienvenue dans NoteFlow',
    content: `# Bienvenue dans NoteFlow ✦

Un éditeur de notes **Markdown** simple, local et élégant.

## Ce que vous pouvez faire

- Créer et organiser vos notes
- Écrire en **Markdown** avec aperçu en temps réel
- Ajouter des \`tags\` pour filtrer vos notes
- Rechercher dans vos titres

## Raccourcis Markdown

| Syntaxe | Rendu |
|---------|-------|
| \`**texte**\` | **gras** |
| \`*texte*\` | *italique* |
| \`# Titre\` | Grand titre |
| \`- item\` | Liste |

> *"La simplicité est la sophistication suprême."* — Léonard de Vinci

\`\`\`javascript
const hello = () => console.log("Hello, NoteFlow!");
\`\`\`
`,
    tags: ['guide', 'markdown'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    title: 'Idées de projet',
    content: `# Idées de projet 💡

## En cours
- [ ] Portfolio GitHub
- [ ] App de prise de notes ← *vous y êtes !*

## À explorer
- API REST avec Node.js
- Dashboard analytics
- CLI tool en Python

## Notes
Penser à ajouter des **tests unitaires** dès le début.
`,
    tags: ['dev', 'todo'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const TAG_COLORS = [
  { bg: '#E8F4F0', text: '#2D6A57' },
  { bg: '#F0EAF8', text: '#5B3D8A' },
  { bg: '#FFF0E6', text: '#B05A1A' },
  { bg: '#E6F0FF', text: '#1A4DB0' },
  { bg: '#FEF0F0', text: '#B01A1A' },
  { bg: '#F0F8E8', text: '#3D6A2D' },
]

const tagColorMap = {}
const getTagColor = (tag) => {
  if (!tagColorMap[tag]) {
    tagColorMap[tag] = TAG_COLORS[Object.keys(tagColorMap).length % TAG_COLORS.length]
  }
  return tagColorMap[tag]
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NoteFlow() {
  // Persistance localStorage
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('noteflow-notes')
      return saved ? JSON.parse(saved) : SAMPLE_NOTES
    } catch {
      return SAMPLE_NOTES
    }
  })

  const [selectedId, setSelectedId] = useState(() => {
    try {
      const saved = localStorage.getItem('noteflow-selected')
      return saved ? Number(saved) : (notes[0]?.id ?? null)
    } catch {
      return notes[0]?.id ?? null
    }
  })

  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [view, setView] = useState('split') // 'edit' | 'split' | 'preview'
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Sauvegarde automatique
  useEffect(() => {
    localStorage.setItem('noteflow-notes', JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    localStorage.setItem('noteflow-selected', String(selectedId))
  }, [selectedId])

  const selected = notes.find((n) => n.id === selectedId)
  const allTags = [...new Set(notes.flatMap((n) => n.tags))]

  const filtered = notes.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase())
    const matchTag = activeTag ? n.tags.includes(activeTag) : true
    return matchSearch && matchTag
  })

  // ─── Actions ────────────────────────────────────────────────────────────────

  const createNote = () => {
    const newNote = {
      id: Date.now(),
      title: 'Nouvelle note',
      content: '# Nouvelle note\n\nCommencez à écrire...',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setNotes((prev) => [newNote, ...prev])
    setSelectedId(newNote.id)
  }

  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (selectedId === id) {
      const remaining = notes.filter((n) => n.id !== id)
      setSelectedId(remaining[0]?.id ?? null)
    }
  }

  const updateNote = useCallback(
    (field, value) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedId
            ? { ...n, [field]: value, updatedAt: new Date().toISOString() }
            : n
        )
      )
    },
    [selectedId]
  )

  const addTag = (tag) => {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!clean || selected?.tags.includes(clean)) return
    updateNote('tags', [...(selected?.tags || []), clean])
    setTagInput('')
    setShowTagInput(false)
  }

  const removeTag = (tag) => {
    updateNote('tags', selected.tags.filter((t) => t !== tag))
  }

  const wordCount = selected?.content?.trim().split(/\s+/).filter(Boolean).length || 0

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-mark">N</div>
              <div className="logo-text">Note<span>Flow</span></div>
            </div>

            <div className="search-bar">
              <span className="search-icon">⌕</span>
              <input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {allTags.length > 0 && (
              <div className="tags-row">
                {allTags.map((t) => (
                  <button
                    key={t}
                    className={`tag-filter ${activeTag === t ? 'active' : ''}`}
                    onClick={() => setActiveTag(activeTag === t ? null : t)}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="new-note-btn" onClick={createNote}>
            <span>＋</span> Nouvelle note
          </button>

          <div className="note-list">
            {filtered.length === 0 && (
              <div className="empty-list">Aucune note trouvée</div>
            )}
            {filtered.map((note) => (
              <div
                key={note.id}
                className={`note-item ${note.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(note.id)}
              >
                <div className="note-item-title">{note.title || 'Sans titre'}</div>
                <div className="note-item-date">{formatDate(note.updatedAt)}</div>
                {note.tags.length > 0 && (
                  <div className="note-item-tags">
                    {note.tags.slice(0, 3).map((t) => {
                      const c = getTagColor(t)
                      return (
                        <span
                          key={t}
                          className="note-tag"
                          style={{ background: c.bg, color: c.text }}
                        >
                          #{t}
                        </span>
                      )
                    })}
                  </div>
                )}
                <button
                  className="note-delete"
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────────────── */}
        <main className="main">
          {selected ? (
            <>
              {/* Toolbar */}
              <div className="toolbar">
                <button className="toggle-sidebar" onClick={() => setSidebarOpen((v) => !v)}>
                  ☰
                </button>
                <input
                  className="title-input"
                  value={selected.title}
                  onChange={(e) => updateNote('title', e.target.value)}
                  placeholder="Titre de la note..."
                />
                <div className="view-switcher">
                  {['edit', 'split', 'preview'].map((v) => (
                    <button
                      key={v}
                      className={`view-btn ${view === v ? 'active' : ''}`}
                      onClick={() => setView(v)}
                    >
                      {v === 'edit' ? '✎ Éditer' : v === 'split' ? '⊟ Split' : '👁 Aperçu'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="tag-manager">
                <span className="tag-label">tags :</span>
                {selected.tags.map((t) => {
                  const c = getTagColor(t)
                  return (
                    <span
                      key={t}
                      className="note-tag-pill"
                      style={{ background: c.bg, color: c.text }}
                    >
                      #{t}
                      <button className="tag-remove" onClick={() => removeTag(t)}>✕</button>
                    </span>
                  )
                })}
                {showTagInput ? (
                  <input
                    className="tag-input-inline"
                    autoFocus
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addTag(tagInput)
                      if (e.key === 'Escape') { setShowTagInput(false); setTagInput('') }
                    }}
                    onBlur={() => { if (tagInput) addTag(tagInput); else setShowTagInput(false) }}
                    placeholder="nouveau-tag"
                  />
                ) : (
                  <button className="add-tag-btn" onClick={() => setShowTagInput(true)}>
                    + tag
                  </button>
                )}
              </div>

              {/* Editor area */}
              <div className="editor-area">
                {view !== 'preview' && (
                  <div className="editor-pane">
                    <textarea
                      className="md-editor"
                      value={selected.content}
                      onChange={(e) => updateNote('content', e.target.value)}
                      placeholder="Commencez à écrire en Markdown..."
                      spellCheck={false}
                    />
                  </div>
                )}
                {view !== 'edit' && (
                  <div className={`preview-pane ${view === 'preview' ? 'full' : ''}`}>
                    <div
                      className="md-preview"
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(selected.content || ''),
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="status-bar">
                <span><span className="status-dot" />Sauvegardé</span>
                <span>{wordCount} mots</span>
                <span>{selected.content.length} caractères</span>
                <span style={{ marginLeft: 'auto' }}>
                  Modifié le {formatDate(selected.updatedAt)}
                </span>
              </div>
            </>
          ) : (
            <div className="no-note">
              <div className="no-note-icon">📝</div>
              <p>Sélectionnez ou créez une note</p>
              <button className="new-note-btn" style={{ marginTop: 8 }} onClick={createNote}>
                + Nouvelle note
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --cream: #F7F3EC;
  --cream-dark: #EDE7DC;
  --ink: #1C1917;
  --ink-light: #57534E;
  --ink-muted: #A8A29E;
  --accent: #C45C26;
  --accent-light: #F5E6DC;
  --accent-hover: #A34A1E;
  --border: #D6CFC6;
  --white: #FDFAF6;
  --sidebar-w: 280px;
}

.app {
  display: flex;
  height: 100vh;
  background: var(--cream);
  font-family: 'Lora', serif;
  color: var(--ink);
  overflow: hidden;
}

/* ── Sidebar ─────────────────────────────── */
.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--white);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
  z-index: 10;
}
.sidebar.closed { margin-left: calc(-1 * var(--sidebar-w)); }

.sidebar-header { padding: 20px 20px 16px; border-bottom: 1px solid var(--border); }

.logo { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.logo-mark {
  width: 28px; height: 28px; background: var(--ink); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: var(--cream); font-family: 'Playfair Display', serif;
  font-size: 14px; font-style: italic;
}
.logo-text { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; }
.logo-text span { color: var(--accent); }

.search-bar {
  display: flex; align-items: center; gap: 8px;
  background: var(--cream); border: 1px solid var(--border);
  border-radius: 8px; padding: 8px 12px; margin-bottom: 12px;
}
.search-bar input {
  border: none; background: transparent;
  font-family: 'Lora', serif; font-size: 13px;
  color: var(--ink); width: 100%; outline: none;
}
.search-bar input::placeholder { color: var(--ink-muted); }
.search-icon { color: var(--ink-muted); font-size: 14px; }

.tags-row { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-filter {
  font-size: 11px; font-family: 'JetBrains Mono', monospace;
  padding: 3px 8px; border-radius: 20px; border: 1px solid var(--border);
  background: transparent; cursor: pointer; color: var(--ink-light); transition: all 0.15s;
}
.tag-filter:hover { border-color: var(--accent); color: var(--accent); }
.tag-filter.active { background: var(--ink); color: var(--cream); border-color: var(--ink); }

.new-note-btn {
  margin: 12px 20px 0; padding: 10px;
  background: var(--accent); color: white; border: none;
  border-radius: 8px; cursor: pointer; font-family: 'Lora', serif;
  font-size: 13px; font-weight: 500; transition: background 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.new-note-btn:hover { background: var(--accent-hover); }

.note-list { flex: 1; overflow-y: auto; padding: 8px 0; }
.note-list::-webkit-scrollbar { width: 4px; }
.note-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.note-item {
  padding: 12px 20px; cursor: pointer;
  border-left: 3px solid transparent; transition: all 0.15s; position: relative;
}
.note-item:hover { background: var(--cream); }
.note-item.active { background: var(--accent-light); border-left-color: var(--accent); }
.note-item-title {
  font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 600;
  color: var(--ink); margin-bottom: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 24px;
}
.note-item-date { font-size: 11px; color: var(--ink-muted); font-style: italic; }
.note-item-tags { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
.note-tag {
  font-size: 10px; font-family: 'JetBrains Mono', monospace;
  padding: 2px 6px; border-radius: 12px;
}
.note-delete {
  position: absolute; top: 10px; right: 12px;
  background: none; border: none; cursor: pointer;
  color: var(--ink-muted); font-size: 14px;
  opacity: 0; transition: opacity 0.15s; padding: 4px; border-radius: 4px;
}
.note-item:hover .note-delete { opacity: 1; }
.note-delete:hover { color: #B01A1A; background: #FEF0F0; }
.empty-list { text-align: center; padding: 40px 20px; color: var(--ink-muted); font-size: 13px; font-style: italic; }

/* ── Main ────────────────────────────────── */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.toolbar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 24px; background: var(--white);
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.toggle-sidebar {
  background: none; border: 1px solid var(--border);
  border-radius: 6px; padding: 6px 10px;
  cursor: pointer; font-size: 16px; color: var(--ink-light); transition: all 0.15s;
}
.toggle-sidebar:hover { background: var(--cream); color: var(--ink); }
.title-input {
  flex: 1; border: none; background: transparent;
  font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 600;
  color: var(--ink); outline: none;
}
.title-input::placeholder { color: var(--ink-muted); }

.view-switcher { display: flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.view-btn {
  padding: 6px 12px; background: none; border: none; cursor: pointer;
  font-size: 12px; font-family: 'Lora', serif; color: var(--ink-light);
  transition: all 0.15s; border-right: 1px solid var(--border);
}
.view-btn:last-child { border-right: none; }
.view-btn.active { background: var(--ink); color: var(--cream); }
.view-btn:not(.active):hover { background: var(--cream); }

.tag-manager {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 10px 24px; background: var(--cream);
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.tag-label { font-size: 11px; color: var(--ink-muted); font-style: italic; }
.note-tag-pill {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; font-family: 'JetBrains Mono', monospace;
  padding: 3px 8px; border-radius: 20px;
}
.tag-remove { background: none; border: none; cursor: pointer; font-size: 12px; line-height: 1; padding: 0; opacity: 0.6; color: inherit; }
.tag-remove:hover { opacity: 1; }
.add-tag-btn {
  font-size: 11px; padding: 3px 8px; background: none;
  border: 1px dashed var(--border); border-radius: 20px;
  cursor: pointer; color: var(--ink-muted); font-family: 'Lora', serif; transition: all 0.15s;
}
.add-tag-btn:hover { border-color: var(--accent); color: var(--accent); }
.tag-input-inline {
  font-size: 11px; font-family: 'JetBrains Mono', monospace;
  border: 1px solid var(--accent); border-radius: 20px;
  padding: 3px 10px; outline: none; color: var(--ink); background: var(--white); width: 100px;
}

.editor-area { flex: 1; display: flex; overflow: hidden; }
.editor-pane, .preview-pane { flex: 1; overflow-y: auto; padding: 32px 40px; }
.editor-pane::-webkit-scrollbar, .preview-pane::-webkit-scrollbar { width: 5px; }
.editor-pane::-webkit-scrollbar-thumb, .preview-pane::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.editor-pane { background: var(--white); border-right: 1px solid var(--border); }

textarea.md-editor {
  width: 100%; height: 100%; border: none; outline: none; resize: none;
  font-family: 'JetBrains Mono', monospace; font-size: 14px; line-height: 1.8;
  color: var(--ink); background: transparent;
}

.preview-pane { background: var(--cream); }
.preview-pane.full { background: var(--white); }

/* ── Markdown preview ────────────────────── */
.md-preview h1 { font-family: 'Playfair Display', serif; font-size: 2em; margin-bottom: 0.5em; line-height: 1.2; }
.md-preview h2 { font-family: 'Playfair Display', serif; font-size: 1.4em; margin: 1.4em 0 0.5em; }
.md-preview h3 { font-family: 'Playfair Display', serif; font-size: 1.1em; margin: 1.2em 0 0.4em; font-style: italic; }
.md-preview p { font-size: 15px; line-height: 1.8; margin-bottom: 1em; }
.md-preview a { color: var(--accent); text-decoration: underline; }
.md-preview strong { font-weight: 600; }
.md-preview em { font-style: italic; color: var(--ink-light); }
.md-preview ul, .md-preview ol { padding-left: 1.5em; margin-bottom: 1em; }
.md-preview li { margin-bottom: 0.3em; line-height: 1.7; font-size: 15px; }
.md-preview blockquote { border-left: 3px solid var(--accent); padding-left: 16px; margin: 1.5em 0; color: var(--ink-light); font-style: italic; }
.md-preview code { font-family: 'JetBrains Mono', monospace; font-size: 12px; background: var(--cream-dark); padding: 2px 6px; border-radius: 4px; color: var(--accent-hover); }
.md-preview pre { background: var(--ink); border-radius: 8px; padding: 16px; margin: 1em 0; overflow-x: auto; }
.md-preview pre code { background: none; color: #E8DCC8; padding: 0; font-size: 13px; }
.md-preview table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 14px; }
.md-preview th { background: var(--ink); color: var(--cream); padding: 8px 12px; font-family: 'Playfair Display', serif; font-weight: 600; text-align: left; }
.md-preview td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
.md-preview tr:hover td { background: var(--cream-dark); }
.md-preview hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }

/* ── Status bar ──────────────────────────── */
.status-bar {
  padding: 6px 24px; background: var(--cream-dark); border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 16px;
  font-size: 11px; color: var(--ink-muted); font-family: 'JetBrains Mono', monospace; flex-shrink: 0;
}
.status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #4CAF50; margin-right: 5px; }

.no-note { flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: var(--ink-muted); }
.no-note-icon { font-size: 48px; opacity: 0.3; }

/* ── Responsive mobile ───────────────────── */
@media (max-width: 768px) {
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0;
    box-shadow: 4px 0 20px rgba(0,0,0,0.1);
  }
  .view-switcher .view-btn:nth-child(2) { display: none; } /* Cache Split sur mobile */
  .editor-pane, .preview-pane { padding: 20px; }
  .toolbar { padding: 12px 16px; gap: 8px; }
  .title-input { font-size: 16px; }
  .tag-manager { padding: 8px 16px; }
  .status-bar { padding: 5px 16px; gap: 10px; }
}
`
