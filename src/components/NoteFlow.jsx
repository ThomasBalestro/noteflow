import { useState, useEffect, useCallback, useRef } from 'react'
import { marked } from 'marked'

// ─── Données d'exemple ────────────────────────────────────────────────────────

const SAMPLE_NOTES = [
  {
    id: 1,
    title: 'Bienvenue dans NoteFlow',
    content: `# Bienvenue dans NoteFlow ✦

Un éditeur de notes **Markdown** simple, local et élégant.

## Fonctionnalités

- Écriture en **Markdown** avec aperçu temps réel
- Thème **clair / sombre**
- **Export** en fichier .md
- **Barre d'outils** Markdown
- **Constructeur de tableaux**
- Notes réorganisables par glisser-déposer

## Raccourcis Markdown

| Syntaxe | Rendu |
|---------|-------|
| \`**texte**\` | **gras** |
| \`*texte*\` | *italique* |
| \`# Titre\` | Grand titre |
| \`- item\` | Liste |

> *"La simplicité est la sophistication suprême."* — Léonard de Vinci
`,
    tags: ['guide'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    title: 'Idées de projet',
    content: `# Idées de projet 💡

## En cours
- [ ] Portfolio GitHub
- [ ] NoteFlow sur le Play Store

## À explorer
- API REST avec Node.js
- Dashboard analytics

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
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

const TAG_COLORS = [
  { bg: '#E8F4F0', text: '#2D6A57', bgDark: '#1a3330', textDark: '#6fcfb5' },
  { bg: '#F0EAF8', text: '#5B3D8A', bgDark: '#2a1f40', textDark: '#b58fe8' },
  { bg: '#FFF0E6', text: '#B05A1A', bgDark: '#3a2010', textDark: '#f0a060' },
  { bg: '#E6F0FF', text: '#1A4DB0', bgDark: '#0f2040', textDark: '#6090f0' },
  { bg: '#FEF0F0', text: '#B01A1A', bgDark: '#3a0f0f', textDark: '#f06060' },
  { bg: '#F0F8E8', text: '#3D6A2D', bgDark: '#1a2f10', textDark: '#90d060' },
]
const tagColorMap = {}
const getTagColor = (tag, dark) => {
  if (!tagColorMap[tag]) tagColorMap[tag] = TAG_COLORS[Object.keys(tagColorMap).length % TAG_COLORS.length]
  const c = tagColorMap[tag]
  return dark ? { bg: c.bgDark, text: c.textDark } : { bg: c.bg, text: c.text }
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

const insertText = (textarea, before, after = '', placeholder = '') => {
  if (!textarea) return ''
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.substring(start, end) || placeholder
  const newText = textarea.value.substring(0, start) + before + selected + after + textarea.value.substring(end)
  const newCursor = start + before.length + selected.length
  setTimeout(() => { textarea.focus(); textarea.setSelectionRange(newCursor, newCursor) }, 0)
  return newText
}

const exportNote = (note) => {
  const blob = new Blob([note.content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const steps = [
    { icon: '📝', title: 'Bienvenue dans NoteFlow', desc: 'Votre espace de notes Markdown, simple, rapide et entièrement local.' },
    { icon: '✨', title: 'Écrivez en Markdown', desc: "Utilisez la barre d'outils ou tapez directement en Markdown. L'aperçu se met à jour en temps réel." },
    { icon: '🏷️', title: 'Organisez avec des tags', desc: 'Ajoutez des tags à vos notes et filtrez-les en un clic. Réorganisez par glisser-déposer.' },
    { icon: '🌙', title: 'Thème clair ou sombre', desc: 'Basculez entre les thèmes selon vos préférences, à tout moment.' },
  ]
  const cur = steps[step]
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-icon">{cur.icon}</div>
        <h2 className="onboarding-title">{cur.title}</h2>
        <p className="onboarding-desc">{cur.desc}</p>
        <div className="onboarding-dots">
          {steps.map((_, i) => <div key={i} className={`onboarding-dot ${i === step ? 'active' : ''}`} />)}
        </div>
        <div className="onboarding-actions">
          {step < steps.length - 1 ? (
            <>
              <button className="onboarding-skip" onClick={onDone}>Passer</button>
              <button className="onboarding-next" onClick={() => setStep(step + 1)}>Suivant →</button>
            </>
          ) : (
            <button className="onboarding-next full" onClick={onDone}>Commencer ✦</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TABLE BUILDER ────────────────────────────────────────────────────────────

function TableBuilder({ onInsert, onClose }) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [headers, setHeaders] = useState(['Colonne 1', 'Colonne 2', 'Colonne 3'])

  const updateHeader = (i, val) => { const h = [...headers]; h[i] = val; setHeaders(h) }
  const updateCols = (n) => {
    const newN = Math.max(1, Math.min(8, n)); setCols(newN)
    setHeaders((prev) => { const h = [...prev]; while (h.length < newN) h.push(`Colonne ${h.length + 1}`); return h.slice(0, newN) })
  }
  const generate = () => {
    const h = headers.map((hh) => hh || 'Col').join(' | ')
    const sep = headers.map(() => '-------').join(' | ')
    const rowLines = Array(rows).fill(0).map((_, r) => headers.map((_, c) => `Cellule ${r+1}-${c+1}`).join(' | '))
    onInsert(`| ${h} |\n| ${sep} |\n${rowLines.map((r) => `| ${r} |`).join('\n')}\n`)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Constructeur de tableau</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="table-controls">
          {[['Lignes', rows, (n) => setRows(Math.max(1, Math.min(10, n)))], ['Colonnes', cols, updateCols]].map(([label, val, set]) => (
            <div key={label} className="table-control-group">
              <label>{label}</label>
              <div className="table-counter">
                <button onClick={() => set(val - 1)}>−</button>
                <span>{val}</span>
                <button onClick={() => set(val + 1)}>＋</button>
              </div>
            </div>
          ))}
        </div>
        <div className="table-headers">
          <label>En-têtes</label>
          <div className="table-header-inputs">
            {headers.map((h, i) => <input key={i} className="table-header-input" value={h} onChange={(e) => updateHeader(i, e.target.value)} placeholder={`Col ${i+1}`} />)}
          </div>
        </div>
        <div className="table-preview">
          <label>Aperçu</label>
          <div className="table-preview-wrap">
            <table>
              <thead><tr>{headers.map((h, i) => <th key={i}>{h || `Col ${i+1}`}</th>)}</tr></thead>
              <tbody>{Array(rows).fill(0).map((_, r) => <tr key={r}>{headers.map((_, c) => <td key={c}>{r+1}-{c+1}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
        <button className="table-insert-btn" onClick={generate}>Insérer le tableau</button>
      </div>
    </div>
  )
}

// ─── MARKDOWN TOOLBAR ─────────────────────────────────────────────────────────

function MarkdownToolbar({ textareaRef, onUpdate, onTableOpen }) {
  const apply = (before, after = '', placeholder = '') => {
    const ta = textareaRef.current
    if (!ta) return
    onUpdate(insertText(ta, before, after, placeholder))
  }
  const tools = [
    { label: 'G', title: 'Gras', action: () => apply('**', '**', 'texte') },
    { label: 'I', title: 'Italique', action: () => apply('*', '*', 'texte'), italic: true },
    { label: 'H1', title: 'Titre 1', action: () => apply('# ', '', 'Titre') },
    { label: 'H2', title: 'Titre 2', action: () => apply('## ', '', 'Titre') },
    { label: '—', title: 'Séparateur', action: () => apply('\n---\n') },
    { label: '• Liste', title: 'Liste', action: () => apply('\n- ', '', 'élément') },
    { label: '1. Liste', title: 'Liste numérotée', action: () => apply('\n1. ', '', 'élément') },
    { label: '[ ]', title: 'Tâche', action: () => apply('\n- [ ] ', '', 'tâche') },
    { label: '`Code`', title: 'Code inline', action: () => apply('`', '`', 'code'), mono: true },
    { label: '```', title: 'Bloc de code', action: () => apply('\n```\n', '\n```\n', 'code'), mono: true },
    { label: '❝', title: 'Citation', action: () => apply('\n> ', '', 'citation') },
    { label: '🔗', title: 'Lien', action: () => apply('[', '](url)', 'texte') },
    { label: '⊞ Tableau', title: 'Tableau', action: onTableOpen, special: true },
  ]
  return (
    <div className="md-toolbar">
      {tools.map((t, i) => (
        <button key={i} className={`md-tool-btn${t.italic ? ' italic' : ''}${t.mono ? ' mono' : ''}${t.special ? ' special' : ''}`}
          title={t.title} onClick={t.action} type="button">{t.label}</button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function NoteFlow() {
  const isMobile = useIsMobile()
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('noteflow-dark') === 'true' } catch { return false } })
  const [showOnboarding, setShowOnboarding] = useState(() => { try { return !localStorage.getItem('noteflow-onboarded') } catch { return true } })
  const [notes, setNotes] = useState(() => { try { const s = localStorage.getItem('noteflow-notes'); return s ? JSON.parse(s) : SAMPLE_NOTES } catch { return SAMPLE_NOTES } })
  const [selectedId, setSelectedId] = useState(() => { try { const s = localStorage.getItem('noteflow-selected'); return s ? Number(s) : SAMPLE_NOTES[0]?.id ?? null } catch { return SAMPLE_NOTES[0]?.id ?? null } })
  const [mobileScreen, setMobileScreen] = useState('list')
  const [desktopView, setDesktopView] = useState('split')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [showTableBuilder, setShowTableBuilder] = useState(false)
  const [dragOver, setDragOver] = useState(null)
  const textareaRef = useRef(null)
  const dragItem = useRef(null)

  useEffect(() => { localStorage.setItem('noteflow-notes', JSON.stringify(notes)) }, [notes])
  useEffect(() => { localStorage.setItem('noteflow-selected', String(selectedId)) }, [selectedId])
  useEffect(() => { localStorage.setItem('noteflow-dark', dark) }, [dark])

  const finishOnboarding = () => { localStorage.setItem('noteflow-onboarded', 'true'); setShowOnboarding(false) }

  const selected = notes.find((n) => n.id === selectedId)
  const allTags = [...new Set(notes.flatMap((n) => n.tags))]
  const filtered = notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()) && (activeTag ? n.tags.includes(activeTag) : true))

  const createNote = () => {
    const n = { id: Date.now(), title: 'Nouvelle note', content: '# Nouvelle note\n\nCommencez à écrire...', tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    setNotes((prev) => [n, ...prev]); setSelectedId(n.id)
    if (isMobile) setMobileScreen('edit')
  }
  const selectNote = (id) => { setSelectedId(id); if (isMobile) setMobileScreen('edit') }
  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    const remaining = notes.filter((n) => n.id !== id)
    setSelectedId(remaining[0]?.id ?? null)
    if (isMobile) setMobileScreen('list')
  }
  const updateNote = useCallback((field, value) => {
    setNotes((prev) => prev.map((n) => n.id === selectedId ? { ...n, [field]: value, updatedAt: new Date().toISOString() } : n))
  }, [selectedId])
  const addTag = (tag) => {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!clean || selected?.tags.includes(clean)) return
    updateNote('tags', [...(selected?.tags || []), clean]); setTagInput(''); setShowTagInput(false)
  }
  const removeTag = (tag) => updateNote('tags', selected.tags.filter((t) => t !== tag))
  const wordCount = selected?.content?.trim().split(/\s+/).filter(Boolean).length || 0

  const onDragStart = (id) => { dragItem.current = id }
  const onDragOver = (e, id) => { e.preventDefault(); setDragOver(id) }
  const onDrop = (targetId) => {
    if (!dragItem.current || dragItem.current === targetId) { setDragOver(null); return }
    setNotes((prev) => {
      const arr = [...prev]
      const fi = arr.findIndex((n) => n.id === dragItem.current)
      const ti = arr.findIndex((n) => n.id === targetId)
      const [moved] = arr.splice(fi, 1); arr.splice(ti, 0, moved); return arr
    })
    setDragOver(null); dragItem.current = null
  }
  const insertTable = (md) => {
    const ta = textareaRef.current
    if (!ta) { updateNote('content', (selected?.content || '') + '\n' + md) }
    else { const s = ta.selectionStart; updateNote('content', selected.content.substring(0, s) + '\n' + md + selected.content.substring(s)) }
    setShowTableBuilder(false)
  }

  const sp = { notes, filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, updateNote, addTag, removeTag, tagInput, setTagInput, showTagInput, setShowTagInput, wordCount, setShowTableBuilder, insertTable, textareaRef, dragOver, onDragStart, onDragOver, onDrop }

  return (
    <>
      <style>{getCSS(dark)}</style>
      {showOnboarding && <Onboarding onDone={finishOnboarding} />}
      {showTableBuilder && <TableBuilder onInsert={insertTable} onClose={() => setShowTableBuilder(false)} />}
      {isMobile
        ? <MobileLayout {...sp} mobileScreen={mobileScreen} setMobileScreen={setMobileScreen} />
        : <DesktopLayout {...sp} desktopView={desktopView} setDesktopView={setDesktopView} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      }
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

function MobileLayout({ filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, updateNote, addTag, removeTag, tagInput, setTagInput, showTagInput, setShowTagInput, wordCount, setShowTableBuilder, textareaRef, mobileScreen, setMobileScreen, dragOver, onDragStart, onDragOver, onDrop }) {
  return (
    <div className="mobile-app">
      {mobileScreen === 'list' && (
        <div className="mobile-screen">
          <div className="mobile-header">
            <div className="logo"><div className="logo-mark">N</div><div className="logo-text">Note<span>Flow</span></div></div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="mobile-icon-btn" onClick={() => setDark(d => !d)}>{dark ? '☀️' : '🌙'}</button>
              <button className="mobile-icon-btn accent" onClick={createNote}>＋</button>
            </div>
          </div>
          <div className="mobile-search-wrap">
            <div className="search-bar"><span className="search-icon">⌕</span><input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            {allTags.length > 0 && <div className="tags-row">{allTags.map(t => <button key={t} className={`tag-filter ${activeTag===t?'active':''}`} onClick={() => setActiveTag(activeTag===t?null:t)}>#{t}</button>)}</div>}
          </div>
          <div className="mobile-note-list">
            {filtered.length === 0 && <div className="empty-list">Aucune note trouvée</div>}
            {filtered.map(note => (
              <div key={note.id} className={`mobile-note-item${dragOver===note.id?' drag-over':''}`} onClick={() => selectNote(note.id)} draggable onDragStart={() => onDragStart(note.id)} onDragOver={e => onDragOver(e, note.id)} onDrop={() => onDrop(note.id)}>
                <div className="drag-handle">⠿</div>
                <div className="mobile-note-main">
                  <div className="note-item-title">{note.title||'Sans titre'}</div>
                  <div className="note-item-date">{formatDate(note.updatedAt)}</div>
                  {note.tags.length > 0 && <div className="note-item-tags">{note.tags.slice(0,3).map(t => { const c=getTagColor(t,dark); return <span key={t} className="note-tag" style={{background:c.bg,color:c.text}}>#{t}</span> })}</div>}
                </div>
                <button className="mobile-delete-btn" onClick={e => { e.stopPropagation(); deleteNote(note.id) }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(mobileScreen==='edit'||mobileScreen==='preview') && selected && (
        <div className="mobile-screen">
          <div className="mobile-header">
            <button className="mobile-icon-btn" onClick={() => setMobileScreen('list')}>←</button>
            <input className="mobile-title-input" value={selected.title} onChange={e => updateNote('title', e.target.value)} placeholder="Titre..." />
            <div style={{display:'flex',gap:6}}>
              <button className="mobile-icon-btn small" onClick={() => exportNote(selected)}>⬇</button>
              <button className="mobile-icon-btn small" onClick={() => setDark(d => !d)}>{dark?'☀️':'🌙'}</button>
              <button className="mobile-icon-btn small" onClick={() => setMobileScreen(mobileScreen==='edit'?'preview':'edit')}>{mobileScreen==='edit'?'👁':'✎'}</button>
            </div>
          </div>
          {mobileScreen==='edit' && <MarkdownToolbar textareaRef={textareaRef} onUpdate={v => updateNote('content', v)} onTableOpen={() => setShowTableBuilder(true)} />}
          <div className="mobile-tags">
            {selected.tags.map(t => { const c=getTagColor(t,dark); return <span key={t} className="note-tag-pill" style={{background:c.bg,color:c.text}}>#{t}<button className="tag-remove" onClick={() => removeTag(t)}>✕</button></span> })}
            {showTagInput ? <input className="tag-input-inline" autoFocus value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter') addTag(tagInput); if(e.key==='Escape'){setShowTagInput(false);setTagInput('')} }} onBlur={() => { if(tagInput) addTag(tagInput); else setShowTagInput(false) }} placeholder="tag" /> : <button className="add-tag-btn" onClick={() => setShowTagInput(true)}>+ tag</button>}
          </div>
          <div className="mobile-content">
            {mobileScreen==='edit' ? <textarea ref={textareaRef} className="mobile-editor" value={selected.content} onChange={e => updateNote('content', e.target.value)} placeholder="Écrivez en Markdown..." spellCheck={false} /> : <div className="mobile-preview md-preview" dangerouslySetInnerHTML={{__html: marked.parse(selected.content||'')}} />}
          </div>
          <div className="mobile-status"><span><span className="status-dot" />Sauvegardé</span><span>{wordCount} mots · {selected.content.length} car.</span></div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESKTOP LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

function DesktopLayout({ filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, updateNote, addTag, removeTag, tagInput, setTagInput, showTagInput, setShowTagInput, wordCount, setShowTableBuilder, textareaRef, desktopView, setDesktopView, sidebarOpen, setSidebarOpen, dragOver, onDragStart, onDragOver, onDrop }) {
  return (
    <div className="app">
      <aside className={`sidebar${sidebarOpen?' closed':''}`}>
        <div className="sidebar-header">
          <div className="logo-row">
            <div className="logo"><div className="logo-mark">N</div><div className="logo-text">Note<span>Flow</span></div></div>
            <button className="theme-toggle" onClick={() => setDark(d => !d)}>{dark?'☀️':'🌙'}</button>
          </div>
          <div className="search-bar"><span className="search-icon">⌕</span><input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          {allTags.length > 0 && <div className="tags-row">{allTags.map(t => <button key={t} className={`tag-filter${activeTag===t?' active':''}`} onClick={() => setActiveTag(activeTag===t?null:t)}>#{t}</button>)}</div>}
        </div>
        <button className="new-note-btn" onClick={createNote}><span>＋</span> Nouvelle note</button>
        <div className="note-list">
          {filtered.length===0 && <div className="empty-list">Aucune note trouvée</div>}
          {filtered.map(note => (
            <div key={note.id} className={`note-item${note.id===selected?.id?' active':''}${dragOver===note.id?' drag-over':''}`} onClick={() => selectNote(note.id)} draggable onDragStart={() => onDragStart(note.id)} onDragOver={e => onDragOver(e, note.id)} onDrop={() => onDrop(note.id)}>
              <div className="drag-handle">⠿</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="note-item-title">{note.title||'Sans titre'}</div>
                <div className="note-item-date">{formatDate(note.updatedAt)}</div>
                {note.tags.length>0 && <div className="note-item-tags">{note.tags.slice(0,3).map(t => { const c=getTagColor(t,dark); return <span key={t} className="note-tag" style={{background:c.bg,color:c.text}}>#{t}</span> })}</div>}
              </div>
              <button className="note-delete" onClick={e => { e.stopPropagation(); deleteNote(note.id) }}>✕</button>
            </div>
          ))}
        </div>
      </aside>

      <main className="main">
        {selected ? (
          <>
            <div className="toolbar">
              <button className="toggle-sidebar" onClick={() => setSidebarOpen(v => !v)}>☰</button>
              <input className="title-input" value={selected.title} onChange={e => updateNote('title', e.target.value)} placeholder="Titre de la note..." />
              <button className="export-btn" onClick={() => exportNote(selected)}>⬇ Export</button>
              <div className="view-switcher">
                {['edit','split','preview'].map(v => <button key={v} className={`view-btn${desktopView===v?' active':''}`} onClick={() => setDesktopView(v)}>{v==='edit'?'✎ Éditer':v==='split'?'⊟ Split':'👁 Aperçu'}</button>)}
              </div>
            </div>
            {desktopView!=='preview' && <MarkdownToolbar textareaRef={textareaRef} onUpdate={v => updateNote('content', v)} onTableOpen={() => setShowTableBuilder(true)} />}
            <div className="tag-manager">
              <span className="tag-label">tags :</span>
              {selected.tags.map(t => { const c=getTagColor(t,dark); return <span key={t} className="note-tag-pill" style={{background:c.bg,color:c.text}}>#{t}<button className="tag-remove" onClick={() => removeTag(t)}>✕</button></span> })}
              {showTagInput ? <input className="tag-input-inline" autoFocus value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter') addTag(tagInput); if(e.key==='Escape'){setShowTagInput(false);setTagInput('')} }} onBlur={() => { if(tagInput) addTag(tagInput); else setShowTagInput(false) }} placeholder="nouveau-tag" /> : <button className="add-tag-btn" onClick={() => setShowTagInput(true)}>+ tag</button>}
            </div>
            <div className="editor-area">
              {desktopView!=='preview' && <div className="editor-pane"><textarea ref={textareaRef} className="md-editor" value={selected.content} onChange={e => updateNote('content', e.target.value)} placeholder="Commencez à écrire en Markdown..." spellCheck={false} /></div>}
              {desktopView!=='edit' && <div className={`preview-pane${desktopView==='preview'?' full':''}`}><div className="md-preview" dangerouslySetInnerHTML={{__html: marked.parse(selected.content||'')}} /></div>}
            </div>
            <div className="status-bar">
              <span><span className="status-dot" />Sauvegardé</span>
              <span>{wordCount} mots</span><span>{selected.content.length} caractères</span>
              <span style={{marginLeft:'auto'}}>Modifié le {formatDate(selected.updatedAt)}</span>
            </div>
          </>
        ) : (
          <div className="no-note"><div className="no-note-icon">📝</div><p>Sélectionnez ou créez une note</p><button className="new-note-btn" style={{marginTop:8}} onClick={createNote}>+ Nouvelle note</button></div>
        )}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════

const getCSS = (dark) => `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;width:100%}
:root{
  --cream:${dark?'#1a1714':'#F7F3EC'};
  --cream-dark:${dark?'#141210':'#EDE7DC'};
  --ink:${dark?'#EDE7DC':'#1C1917'};
  --ink-light:${dark?'#A8A29E':'#57534E'};
  --ink-muted:${dark?'#6B6560':'#A8A29E'};
  --accent:#C45C26;
  --accent-light:${dark?'#3a1f10':'#F5E6DC'};
  --accent-hover:#A34A1E;
  --border:${dark?'#2e2a26':'#D6CFC6'};
  --white:${dark?'#211e1b':'#FDFAF6'};
}
.onboarding-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.onboarding-card{background:var(--white);border-radius:20px;padding:40px 32px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.onboarding-icon{font-size:52px;margin-bottom:20px}
.onboarding-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--ink);margin-bottom:12px}
.onboarding-desc{font-family:'Lora',serif;font-size:15px;color:var(--ink-light);line-height:1.7;margin-bottom:28px}
.onboarding-dots{display:flex;justify-content:center;gap:8px;margin-bottom:28px}
.onboarding-dot{width:8px;height:8px;border-radius:50%;background:var(--border);transition:all .2s}
.onboarding-dot.active{background:var(--accent);width:24px;border-radius:4px}
.onboarding-actions{display:flex;gap:12px;justify-content:center}
.onboarding-skip{padding:10px 20px;border:1px solid var(--border);border-radius:8px;background:none;cursor:pointer;color:var(--ink-muted);font-family:'Lora',serif;font-size:14px}
.onboarding-next{padding:10px 24px;background:var(--accent);color:white;border:none;border-radius:8px;cursor:pointer;font-family:'Lora',serif;font-size:14px;font-weight:500}
.onboarding-next.full{width:100%;padding:12px;font-size:16px}
.onboarding-next:hover{background:var(--accent-hover)}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px}
.modal-card{background:var(--white);border-radius:16px;padding:24px;max-width:480px;width:100%;box-shadow:0 16px 48px rgba(0,0,0,0.25)}
.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.modal-header h3{font-family:'Playfair Display',serif;font-size:18px;color:var(--ink)}
.modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--ink-muted);padding:4px 8px;border-radius:6px}
.modal-close:hover{background:var(--cream)}
.table-controls{display:flex;gap:20px;margin-bottom:20px}
.table-control-group{flex:1}
.table-control-group label,.table-headers label,.table-preview label{display:block;font-size:12px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;margin-bottom:8px}
.table-counter{display:flex;align-items:center;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.table-counter button{padding:8px 14px;background:var(--cream);border:none;cursor:pointer;font-size:16px;color:var(--ink);font-weight:500}
.table-counter button:hover{background:var(--accent-light)}
.table-counter span{flex:1;text-align:center;font-family:'JetBrains Mono',monospace;font-size:16px;color:var(--ink);padding:8px;border-left:1px solid var(--border);border-right:1px solid var(--border)}
.table-headers{margin-bottom:20px}
.table-header-inputs{display:flex;gap:8px;flex-wrap:wrap}
.table-header-input{flex:1;min-width:80px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--cream);color:var(--ink);font-family:'Lora',serif;font-size:13px;outline:none}
.table-header-input:focus{border-color:var(--accent)}
.table-preview{margin-bottom:20px}
.table-preview-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:8px}
.table-preview-wrap table{width:100%;border-collapse:collapse;font-size:12px}
.table-preview-wrap th{background:var(--ink);color:var(--cream);padding:6px 10px;font-family:'Playfair Display',serif;text-align:left}
.table-preview-wrap td{padding:5px 10px;border-bottom:1px solid var(--border);color:var(--ink-light);font-family:'JetBrains Mono',monospace}
.table-insert-btn{width:100%;padding:12px;background:var(--accent);color:white;border:none;border-radius:8px;cursor:pointer;font-family:'Lora',serif;font-size:14px;font-weight:500}
.table-insert-btn:hover{background:var(--accent-hover)}
.md-toolbar{display:flex;flex-wrap:wrap;gap:4px;padding:8px 12px;background:var(--cream-dark);border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}
.md-tool-btn{padding:4px 8px;background:var(--white);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:11px;font-family:'Lora',serif;color:var(--ink-light);transition:all .1s;white-space:nowrap;min-height:28px}
.md-tool-btn:hover{background:var(--accent-light);border-color:var(--accent);color:var(--accent)}
.md-tool-btn:active{transform:scale(.95)}
.md-tool-btn.italic{font-style:italic}
.md-tool-btn.mono{font-family:'JetBrains Mono',monospace}
.md-tool-btn.special{background:var(--accent-light);border-color:var(--accent);color:var(--accent);font-weight:500}
.md-preview h1{font-family:'Playfair Display',serif;font-size:1.8em;margin-bottom:.5em;line-height:1.2;color:var(--ink)}
.md-preview h2{font-family:'Playfair Display',serif;font-size:1.3em;margin:1.4em 0 .5em;color:var(--ink)}
.md-preview h3{font-family:'Playfair Display',serif;font-size:1.1em;margin:1.2em 0 .4em;font-style:italic;color:var(--ink)}
.md-preview p{font-size:15px;line-height:1.8;margin-bottom:1em;color:var(--ink)}
.md-preview a{color:var(--accent);text-decoration:underline}
.md-preview strong{font-weight:600}
.md-preview em{font-style:italic;color:var(--ink-light)}
.md-preview ul,.md-preview ol{padding-left:1.5em;margin-bottom:1em}
.md-preview li{margin-bottom:.3em;line-height:1.7;font-size:15px;color:var(--ink)}
.md-preview blockquote{border-left:3px solid var(--accent);padding-left:16px;margin:1.5em 0;color:var(--ink-light);font-style:italic}
.md-preview code{font-family:'JetBrains Mono',monospace;font-size:12px;background:var(--cream-dark);padding:2px 6px;border-radius:4px;color:var(--accent-hover)}
.md-preview pre{background:var(--ink);border-radius:8px;padding:16px;margin:1em 0;overflow-x:auto}
.md-preview pre code{background:none;color:#E8DCC8;padding:0;font-size:13px}
.md-preview table{width:100%;border-collapse:collapse;margin:1em 0;font-size:14px}
.md-preview th{background:var(--ink);color:var(--cream);padding:8px 12px;font-family:'Playfair Display',serif;font-weight:600;text-align:left}
.md-preview td{padding:8px 12px;border-bottom:1px solid var(--border);color:var(--ink)}
.md-preview tr:hover td{background:var(--cream-dark)}
.md-preview hr{border:none;border-top:1px solid var(--border);margin:2em 0}
.note-tag-pill{display:flex;align-items:center;gap:4px;font-size:11px;font-family:'JetBrains Mono',monospace;padding:3px 8px;border-radius:20px}
.tag-remove{background:none;border:none;cursor:pointer;font-size:12px;padding:0;opacity:.6;color:inherit}
.tag-remove:hover{opacity:1}
.add-tag-btn{font-size:11px;padding:3px 8px;background:none;border:1px dashed var(--border);border-radius:20px;cursor:pointer;color:var(--ink-muted);font-family:'Lora',serif}
.add-tag-btn:hover{border-color:var(--accent);color:var(--accent)}
.tag-input-inline{font-size:11px;font-family:'JetBrains Mono',monospace;border:1px solid var(--accent);border-radius:20px;padding:3px 10px;outline:none;color:var(--ink);background:var(--white);width:100px}
.status-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#4CAF50;margin-right:5px}
.note-item-title{font-family:'Playfair Display',serif;font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.note-item-date{font-size:11px;color:var(--ink-muted);font-style:italic}
.note-item-tags{display:flex;gap:4px;margin-top:6px;flex-wrap:wrap}
.note-tag{font-size:10px;font-family:'JetBrains Mono',monospace;padding:2px 6px;border-radius:12px}
.search-bar{display:flex;align-items:center;gap:8px;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-bottom:12px}
.search-bar input{border:none;background:transparent;font-family:'Lora',serif;font-size:13px;color:var(--ink);width:100%;outline:none}
.search-bar input::placeholder{color:var(--ink-muted)}
.search-icon{color:var(--ink-muted);font-size:14px}
.tags-row{display:flex;flex-wrap:wrap;gap:6px}
.tag-filter{font-size:11px;font-family:'JetBrains Mono',monospace;padding:3px 8px;border-radius:20px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--ink-light);transition:all .15s}
.tag-filter:hover{border-color:var(--accent);color:var(--accent)}
.tag-filter.active{background:var(--ink);color:var(--cream);border-color:var(--ink)}
.empty-list{text-align:center;padding:40px 20px;color:var(--ink-muted);font-size:13px;font-style:italic}
.logo{display:flex;align-items:center;gap:8px}
.logo-mark{width:28px;height:28px;background:var(--ink);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--cream);font-family:'Playfair Display',serif;font-size:14px;font-style:italic}
.logo-text{font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:var(--ink)}
.logo-text span{color:var(--accent)}
.drag-handle{color:var(--ink-muted);cursor:grab;font-size:16px;padding:0 4px;flex-shrink:0;opacity:.3;user-select:none}
.drag-handle:hover{opacity:1}
.drag-over{border-top:2px solid var(--accent)!important}
.mobile-app{height:100dvh;background:var(--cream);font-family:'Lora',serif;color:var(--ink);display:flex;flex-direction:column;overflow:hidden}
.mobile-screen{display:flex;flex-direction:column;height:100%}
.mobile-header{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0;min-height:60px}
.mobile-icon-btn{min-width:40px;min-height:40px;border:1px solid var(--border);border-radius:10px;background:var(--cream);cursor:pointer;font-size:16px;color:var(--ink-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.mobile-icon-btn.small{min-width:36px;min-height:36px;font-size:14px}
.mobile-icon-btn:active{transform:scale(.92)}
.mobile-icon-btn.accent{background:var(--accent);color:white;border-color:var(--accent);font-size:20px}
.mobile-title-input{flex:1;border:none;background:transparent;font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:var(--ink);outline:none;min-width:0}
.mobile-search-wrap{padding:12px 16px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0}
.mobile-note-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.mobile-note-item{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);background:var(--white);cursor:pointer;gap:10px;transition:background .1s}
.mobile-note-item:active{background:var(--accent-light)}
.mobile-note-main{flex:1;min-width:0}
.mobile-delete-btn{min-width:36px;min-height:36px;border:none;background:none;cursor:pointer;color:var(--ink-muted);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mobile-delete-btn:active{background:#FEF0F0;color:#B01A1A}
.mobile-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 16px;background:var(--cream);border-bottom:1px solid var(--border);flex-shrink:0}
.mobile-content{flex:1;overflow:hidden;display:flex}
.mobile-editor{flex:1;width:100%;border:none;outline:none;resize:none;font-family:'JetBrains Mono',monospace;font-size:14px;line-height:1.8;color:var(--ink);background:var(--white);padding:16px}
.mobile-preview{flex:1;overflow-y:auto;padding:16px;background:var(--cream);-webkit-overflow-scrolling:touch}
.mobile-status{display:flex;justify-content:space-between;padding:6px 16px;background:var(--cream-dark);border-top:1px solid var(--border);font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;flex-shrink:0}
.app{display:flex;height:100vh;background:var(--cream);font-family:'Lora',serif;color:var(--ink);overflow:hidden}
.sidebar{width:280px;min-width:280px;background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;transition:margin-left .3s ease}
.sidebar.closed{margin-left:-280px}
.sidebar-header{padding:20px 20px 16px;border-bottom:1px solid var(--border)}
.logo-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.theme-toggle{background:none;border:1px solid var(--border);border-radius:8px;padding:4px 8px;cursor:pointer;font-size:16px}
.theme-toggle:hover{background:var(--cream)}
.new-note-btn{margin:12px 20px 0;padding:10px;background:var(--accent);color:white;border:none;border-radius:8px;cursor:pointer;font-family:'Lora',serif;font-size:13px;font-weight:500;transition:background .15s;display:flex;align-items:center;justify-content:center;gap:6px}
.new-note-btn:hover{background:var(--accent-hover)}
.note-list{flex:1;overflow-y:auto;padding:8px 0}
.note-list::-webkit-scrollbar{width:4px}
.note-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
.note-item{padding:12px 12px 12px 8px;cursor:pointer;border-left:3px solid transparent;transition:all .15s;position:relative;display:flex;align-items:flex-start;gap:4px}
.note-item:hover{background:var(--cream)}
.note-item.active{background:var(--accent-light);border-left-color:var(--accent)}
.note-delete{background:none;border:none;cursor:pointer;color:var(--ink-muted);font-size:13px;opacity:0;transition:opacity .15s;padding:4px;border-radius:4px;flex-shrink:0}
.note-item:hover .note-delete{opacity:1}
.note-delete:hover{color:#B01A1A;background:#FEF0F0}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.toolbar{display:flex;align-items:center;gap:10px;padding:12px 20px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0}
.toggle-sidebar{background:none;border:1px solid var(--border);border-radius:6px;padding:6px 10px;cursor:pointer;font-size:16px;color:var(--ink-light);transition:all .15s}
.toggle-sidebar:hover{background:var(--cream)}
.title-input{flex:1;border:none;background:transparent;font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:var(--ink);outline:none}
.export-btn{padding:6px 12px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:12px;color:var(--ink-light);font-family:'Lora',serif;white-space:nowrap;transition:all .15s}
.export-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light)}
.view-switcher{display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;flex-shrink:0}
.view-btn{padding:6px 12px;background:none;border:none;cursor:pointer;font-size:12px;font-family:'Lora',serif;color:var(--ink-light);transition:all .15s;border-right:1px solid var(--border);white-space:nowrap}
.view-btn:last-child{border-right:none}
.view-btn.active{background:var(--ink);color:var(--cream)}
.view-btn:not(.active):hover{background:var(--cream)}
.tag-manager{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 20px;background:var(--cream);border-bottom:1px solid var(--border);flex-shrink:0}
.tag-label{font-size:11px;color:var(--ink-muted);font-style:italic}
.editor-area{flex:1;display:flex;overflow:hidden}
.editor-pane,.preview-pane{flex:1;overflow-y:auto;padding:28px 36px}
.editor-pane{background:var(--white);border-right:1px solid var(--border)}
.preview-pane{background:var(--cream)}
.preview-pane.full{background:var(--white)}
textarea.md-editor{width:100%;height:100%;border:none;outline:none;resize:none;font-family:'JetBrains Mono',monospace;font-size:14px;line-height:1.8;color:var(--ink);background:transparent}
.status-bar{padding:5px 20px;background:var(--cream-dark);border-top:1px solid var(--border);display:flex;align-items:center;gap:16px;font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;flex-shrink:0}
.no-note{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:var(--ink-muted)}
.no-note-icon{font-size:48px;opacity:.3}
`
