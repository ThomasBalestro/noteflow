import { useState, useEffect, useCallback, useRef } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

const uid = () => Math.random().toString(36).slice(2, 9)

const BLOCK_TYPES = [
  { type: 'paragraph', icon: '¶',  label: 'Texte' },
  { type: 'heading1',  icon: 'H1', label: 'Titre 1' },
  { type: 'heading2',  icon: 'H2', label: 'Titre 2' },
  { type: 'bullet',    icon: '•',  label: 'Liste' },
  { type: 'numbered',  icon: '1.', label: 'Numérotée' },
  { type: 'checkbox',  icon: '☐',  label: 'Tâche' },
  { type: 'quote',     icon: '❝',  label: 'Citation' },
  { type: 'table',     icon: '▦',  label: 'Tableau' },
  { type: 'divider',   icon: '—',  label: 'Séparateur' },
]

const createBlock = (type) => {
  const base = { id: uid(), type, fontSize: 'md', bgColor: null }
  if (type === 'checkbox') return { ...base, content: '', checked: false }
  if (type === 'divider')  return { id: uid(), type }
  if (type === 'table')    return { ...base, cells: [
    [{ content: 'Colonne 1', bg: '#1C1917', color: '#F7F3EC' }, { content: 'Colonne 2', bg: '#1C1917', color: '#F7F3EC' }],
    [{ content: '', bg: null, color: null }, { content: '', bg: null, color: null }],
    [{ content: '', bg: null, color: null }, { content: '', bg: null, color: null }],
  ]}
  return { ...base, content: '' }
}

const migrateNote = (note) => {
  if (note.blocks) return note
  const lines = (note.content || '').split('\n')
  const blocks = []
  for (const line of lines) {
    if (!line.trim()) continue
    if (line.startsWith('# '))      blocks.push({ ...createBlock('heading1'), content: line.slice(2) })
    else if (line.startsWith('## ')) blocks.push({ ...createBlock('heading2'), content: line.slice(3) })
    else if (line.startsWith('- [ ] ')) blocks.push({ ...createBlock('checkbox'), content: line.slice(6), checked: false })
    else if (line.startsWith('- [x] ')) blocks.push({ ...createBlock('checkbox'), content: line.slice(6), checked: true })
    else if (line.startsWith('- '))  blocks.push({ ...createBlock('bullet'), content: line.slice(2) })
    else if (line.startsWith('> '))  blocks.push({ ...createBlock('quote'), content: line.slice(2) })
    else if (line === '---')         blocks.push(createBlock('divider'))
    else                             blocks.push({ ...createBlock('paragraph'), content: line })
  }
  if (!blocks.length) blocks.push(createBlock('paragraph'))
  const { content, ...rest } = note
  return { ...rest, blocks }
}

const noteToText = (note) => (note.blocks || []).map(b => {
  if (b.type === 'divider') return '---'
  if (b.type === 'table') return b.cells.map(r => r.map(c => c.content).join('\t')).join('\n')
  if (b.type === 'checkbox') return `[${b.checked ? 'x' : ' '}] ${b.content}`
  return b.content || ''
}).join('\n')

const exportNote = (note) => {
  const blob = new Blob([noteToText(note)], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt` })
  a.click(); URL.revokeObjectURL(url)
}

const shareNote = async (note) => {
  const text = `${note.title}\n\n${noteToText(note)}`
  if (navigator.share) { try { await navigator.share({ title: note.title, text }) } catch {} }
  else { await navigator.clipboard.writeText(text); alert('Note copiée !') }
}

const printNote = (note) => {
  const w = window.open('', '_blank')
  const html = (note.blocks || []).map(b => {
    if (b.type === 'heading1') return `<h1>${b.content}</h1>`
    if (b.type === 'heading2') return `<h2>${b.content}</h2>`
    if (b.type === 'bullet') return `<li>${b.content}</li>`
    if (b.type === 'quote') return `<blockquote>${b.content}</blockquote>`
    if (b.type === 'divider') return `<hr>`
    if (b.type === 'checkbox') return `<p>${b.checked ? '☑' : '☐'} ${b.content}</p>`
    if (b.type === 'table') return `<table border="1">${b.cells.map(r => `<tr>${r.map(c => `<td style="background:${c.bg||'none'};color:${c.color||'inherit'};padding:6px 10px">${c.content}</td>`).join('')}</tr>`).join('')}</table>`
    return `<p>${b.content}</p>`
  }).join('\n')
  w.document.write(`<!DOCTYPE html><html><head><title>${note.title}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 20px}h1,h2{font-family:'Playfair Display',serif}table{border-collapse:collapse;width:100%}blockquote{border-left:3px solid #C45C26;padding-left:16px;color:#57534E;font-style:italic}@media print{body{margin:0}}</style></head><body><h1>${note.title}</h1>${html}<script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
  w.document.close()
}

const formatDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })
const useIsMobile = () => {
  const [v, setV] = useState(() => window.innerWidth < 768)
  useEffect(() => { const fn = () => setV(window.innerWidth < 768); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn) }, [])
  return v
}

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const BLOCK_BG_COLORS = [
  { id: null,     label: 'Aucune',   light: null,      dark: null },
  { id: 'red',    label: 'Rouge',    light: '#fee2e2', dark: '#3a0f0f' },
  { id: 'orange', label: 'Orange',   light: '#ffedd5', dark: '#3a1f00' },
  { id: 'yellow', label: 'Jaune',    light: '#fef9c3', dark: '#2e2500' },
  { id: 'green',  label: 'Vert',     light: '#dcfce7', dark: '#0a2010' },
  { id: 'blue',   label: 'Bleu',     light: '#dbeafe', dark: '#0a1a2d' },
  { id: 'purple', label: 'Violet',   light: '#f3e8ff', dark: '#1a0a2d' },
  { id: 'gray',   label: 'Gris',     light: '#f3f4f6', dark: '#1f1f1f' },
]

const CELL_COLORS = [
  { label:'Aucune',  bg:null,      color:null },
  { label:'En-tête', bg:'#1C1917', color:'#F7F3EC' },
  { label:'Rouge',   bg:'#fee2e2', color:'#991b1b' },
  { label:'Orange',  bg:'#ffedd5', color:'#9a3412' },
  { label:'Jaune',   bg:'#fef9c3', color:'#713f12' },
  { label:'Vert',    bg:'#dcfce7', color:'#166534' },
  { label:'Bleu',    bg:'#dbeafe', color:'#1e40af' },
  { label:'Violet',  bg:'#f3e8ff', color:'#6b21a8' },
  { label:'Gris',    bg:'#f3f4f6', color:'#374151' },
]

const NOTE_COLORS = [
  { id: null, light: null, dark: null },
  { id: 'red', light: '#FFF5F5', dark: '#2d0f0f' },
  { id: 'orange', light: '#FFF8F0', dark: '#2d1a00' },
  { id: 'yellow', light: '#FFFEF0', dark: '#2d2800' },
  { id: 'green', light: '#F0FFF4', dark: '#0a2010' },
  { id: 'blue', light: '#F0F7FF', dark: '#0a1a2d' },
  { id: 'purple', light: '#F8F0FF', dark: '#1a0a2d' },
]

const getNoteColor = (id, dark) => {
  const c = NOTE_COLORS.find(c => c.id === id) || NOTE_COLORS[0]
  return dark ? c.dark : c.light
}
const getBlockBg = (id, dark) => {
  const c = BLOCK_BG_COLORS.find(c => c.id === id) || BLOCK_BG_COLORS[0]
  return dark ? c.dark : c.light
}

const TAG_PALETTE = [
  { bg:'#E8F4F0',text:'#2D6A57',bgD:'#1a3330',textD:'#6fcfb5' },
  { bg:'#F0EAF8',text:'#5B3D8A',bgD:'#2a1f40',textD:'#b58fe8' },
  { bg:'#FFF0E6',text:'#B05A1A',bgD:'#3a2010',textD:'#f0a060' },
  { bg:'#E6F0FF',text:'#1A4DB0',bgD:'#0f2040',textD:'#6090f0' },
  { bg:'#FEF0F0',text:'#B01A1A',bgD:'#3a0f0f',textD:'#f06060' },
]
const tagMap = {}
const getTagColor = (tag, dark) => {
  if (!tagMap[tag]) tagMap[tag] = TAG_PALETTE[Object.keys(tagMap).length % TAG_PALETTE.length]
  const c = tagMap[tag]; return dark ? { bg: c.bgD, text: c.textD } : { bg: c.bg, text: c.text }
}

// ─── Note de bienvenue ────────────────────────────────────────────────────────

const WELCOME_NOTE = {
  id: 1, title: 'Bienvenue dans NoteFlow ✦', pinned: true, color: null, tags: ['guide'],
  createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(),
  blocks: [
    { id:'w1', type:'heading1', content:'Bienvenue dans NoteFlow ✦', fontSize:'md', bgColor:null },
    { id:'w2', type:'paragraph', content:'NoteFlow est votre éditeur de notes simple et local. Cliquez pour écrire, pas besoin d\'apprendre quoi que ce soit.', fontSize:'md', bgColor:null },
    { id:'w3', type:'heading2', content:'✎ Comment écrire', fontSize:'md', bgColor:null },
    { id:'w4', type:'bullet', content:'Cliquez n\'importe où pour écrire', fontSize:'md', bgColor:null },
    { id:'w5', type:'bullet', content:'Appuyez sur Entrée pour créer un nouveau bloc', fontSize:'md', bgColor:null },
    { id:'w6', type:'bullet', content:'Cliquez sur ⊕ pour choisir le type de bloc', fontSize:'md', bgColor:null },
    { id:'w7', type:'bullet', content:'Glissez ⠿ pour réorganiser les blocs', fontSize:'md', bgColor:null },
    { id:'w8', type:'heading2', content:'☐ Cases à cocher interactives', fontSize:'md', bgColor:null },
    { id:'w9', type:'checkbox', content:'Cliquez directement sur cette case pour la cocher !', checked:false, fontSize:'md', bgColor:null },
    { id:'w10', type:'checkbox', content:'Tâche déjà terminée', checked:true, fontSize:'md', bgColor:null },
    { id:'w11', type:'heading2', content:'🖱️ Menu contextuel', fontSize:'md', bgColor:'yellow' },
    { id:'w12', type:'paragraph', content:'Clic droit (ordinateur) ou appui long (téléphone) sur un bloc → menu pour changer le type, la taille, la couleur, ou supprimer.', fontSize:'md', bgColor:'yellow' },
    { id:'w13', type:'heading2', content:'📊 Tableau interactif', fontSize:'md', bgColor:null },
    { id:'w14', type:'table', fontSize:'md', bgColor:null, cells: [
      [{ content:'Fonctionnalité', bg:'#1C1917', color:'#F7F3EC' },{ content:'Comment faire', bg:'#1C1917', color:'#F7F3EC' }],
      [{ content:'Écrire dans une cellule', bg:null, color:null },{ content:'Cliquez sur la cellule', bg:null, color:null }],
      [{ content:'Colorier une cellule', bg:'#dcfce7', color:'#166534' },{ content:'Cliquez sur 🎨 au survol', bg:null, color:null }],
      [{ content:'Ajouter une ligne', bg:null, color:null },{ content:'Bouton ＋ en bas', bg:null, color:null }],
    ]},
    { id:'w15', type:'divider' },
    { id:'w16', type:'quote', content:'La simplicité est la sophistication suprême. — Léonard de Vinci', fontSize:'md', bgColor:null },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENU CONTEXTUEL
// ═══════════════════════════════════════════════════════════════════════════════

function ContextMenu({ menu, block, dark, onChangeType, onChangeFontSize, onChangeBgColor, onMoveUp, onMoveDown, onDuplicate, onDelete, onClose }) {
  const ref = useRef()

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Adjust position to stay on screen
  const style = { position: 'fixed', zIndex: 1000 }
  if (menu.x + 240 > window.innerWidth) style.right = window.innerWidth - menu.x
  else style.left = menu.x
  if (menu.y + 400 > window.innerHeight) style.bottom = window.innerHeight - menu.y
  else style.top = menu.y

  const currentType = block?.type || 'paragraph'
  const currentFontSize = block?.fontSize || 'md'
  const currentBgColor = block?.bgColor || null

  return (
    <div ref={ref} className="ctx-menu" style={style}>
      {block?.type !== 'divider' && block?.type !== 'table' && (
        <>
          <div className="ctx-section-title">Type de bloc</div>
          <div className="ctx-type-grid">
            {BLOCK_TYPES.filter(t => t.type !== 'table' && t.type !== 'divider').map(t => (
              <button key={t.type} className={`ctx-type-btn${currentType === t.type ? ' active' : ''}`} onClick={() => { onChangeType(t.type); onClose() }}>
                <span className="ctx-type-icon">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <div className="ctx-divider" />
          <div className="ctx-section-title">Taille du texte</div>
          <div className="ctx-row">
            {[['sm','S','Petite'],['md','M','Normale'],['lg','L','Grande']].map(([v,l,t]) => (
              <button key={v} className={`ctx-size-btn${currentFontSize === v ? ' active' : ''}`} onClick={() => { onChangeFontSize(v); onClose() }} title={t}>{l}</button>
            ))}
          </div>
          <div className="ctx-divider" />
          <div className="ctx-section-title">Couleur de fond</div>
          <div className="ctx-color-row">
            {BLOCK_BG_COLORS.map(c => (
              <button key={c.id ?? 'none'} className={`ctx-color-dot${currentBgColor === c.id ? ' selected' : ''}`}
                style={{ background: (dark ? c.dark : c.light) || (dark ? '#2e2a26' : '#EDE7DC') }}
                title={c.label} onClick={() => { onChangeBgColor(c.id); onClose() }} />
            ))}
          </div>
          <div className="ctx-divider" />
        </>
      )}
      <button className="ctx-item" onClick={() => { onMoveUp(); onClose() }}>↑ Déplacer vers le haut</button>
      <button className="ctx-item" onClick={() => { onMoveDown(); onClose() }}>↓ Déplacer vers le bas</button>
      <button className="ctx-item" onClick={() => { onDuplicate(); onClose() }}>⧉ Dupliquer</button>
      <div className="ctx-divider" />
      <button className="ctx-item danger" onClick={() => { onDelete(); onClose() }}>🗑 Supprimer le bloc</button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENU D'AJOUT DE BLOC
// ═══════════════════════════════════════════════════════════════════════════════

function AddBlockMenu({ onAdd, onClose, position }) {
  const ref = useRef()
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [onClose])

  const style = { position: 'fixed', zIndex: 999 }
  if (position) {
    style.left = Math.min(position.x, window.innerWidth - 220)
    style.top = Math.min(position.y, window.innerHeight - 360)
  }

  return (
    <div ref={ref} className="add-menu" style={style}>
      <div className="add-menu-title">Ajouter un bloc</div>
      {BLOCK_TYPES.map(t => (
        <button key={t.type} className="add-menu-item" onClick={() => { onAdd(t.type); onClose() }}>
          <span className="add-menu-icon">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCS
// ═══════════════════════════════════════════════════════════════════════════════

function TextBlock({ block, onChange, onKeyDown, onFocus, setRef }) {
  const ref = useRef()

  useEffect(() => {
    if (ref.current && ref.current.textContent !== block.content) {
      ref.current.textContent = block.content
    }
  }, [block.id])

  const cls = { heading1:'block-h1', heading2:'block-h2', paragraph:'block-p', bullet:'block-bullet', numbered:'block-numbered', quote:'block-quote' }[block.type] || 'block-p'
  const Tag = { heading1:'h1', heading2:'h2' }[block.type] || 'div'
  const ph = { heading1:'Titre principal...', heading2:'Titre secondaire...', paragraph:'Écrivez quelque chose...', bullet:'Élément de liste...', numbered:'Élément numéroté...', quote:'Citation...' }[block.type] || ''
  const fsClass = { sm:'fs-sm', md:'', lg:'fs-lg' }[block.fontSize || 'md'] || ''

  return (
    <Tag
      ref={el => { ref.current = el; if (setRef) setRef(el) }}
      contentEditable suppressContentEditableWarning
      className={`block ${cls} ${fsClass}`}
      onInput={() => onChange(block.id, { content: ref.current?.textContent || '' })}
      onKeyDown={onKeyDown} onFocus={onFocus}
      data-placeholder={ph}
    />
  )
}

function CheckboxBlock({ block, onChange, onKeyDown, onFocus }) {
  const ref = useRef()
  useEffect(() => {
    if (ref.current && ref.current.textContent !== block.content) ref.current.textContent = block.content
  }, [block.id])
  const fsClass = { sm:'fs-sm', md:'', lg:'fs-lg' }[block.fontSize || 'md'] || ''
  return (
    <div className={`block block-checkbox${block.checked ? ' checked' : ''}`} onFocus={onFocus}>
      <button className="checkbox-btn" onClick={() => onChange(block.id, { checked: !block.checked })} type="button">
        {block.checked ? '✓' : ''}
      </button>
      <div ref={el => { ref.current = el }} contentEditable suppressContentEditableWarning
        className={`checkbox-text${block.checked ? ' striked' : ''} ${fsClass}`}
        onInput={() => onChange(block.id, { content: ref.current?.textContent || '' })}
        onKeyDown={onKeyDown} data-placeholder="Tâche..." />
    </div>
  )
}

function TableBlock({ block, onChange, dark }) {
  const [colorPicker, setColorPicker] = useState(null)

  const updateCell = (r, c, field, value) => {
    const cells = block.cells.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? { ...cell, [field]: value } : cell))
    onChange(block.id, { cells })
  }

  const addRow = () => onChange(block.id, { cells: [...block.cells, Array(block.cells[0]?.length || 2).fill(0).map(() => ({ content:'', bg:null, color:null }))] })
  const addCol = () => onChange(block.id, { cells: block.cells.map(row => [...row, { content:'', bg:null, color:null }]) })
  const delRow = (r) => { if (block.cells.length > 1) onChange(block.id, { cells: block.cells.filter((_,i) => i !== r) }) }
  const delCol = (c) => { if ((block.cells[0]?.length || 0) > 1) onChange(block.id, { cells: block.cells.map(row => row.filter((_,i) => i !== c)) }) }

  return (
    <div className="block-table-wrap">
      {colorPicker && (
        <div className="cell-color-picker" onClick={() => setColorPicker(null)}>
          <div className="cell-color-grid" onClick={e => e.stopPropagation()}>
            <div className="cell-color-title">Couleur de cellule</div>
            {CELL_COLORS.map((c, i) => (
              <button key={i} className="cell-color-option"
                style={{ background: c.bg || (dark ? '#211e1b' : '#FDFAF6'), color: c.color || (dark ? '#EDE7DC' : '#1C1917') }}
                onClick={() => { updateCell(colorPicker.r, colorPicker.c, 'bg', c.bg); updateCell(colorPicker.r, colorPicker.c, 'color', c.color); setColorPicker(null) }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="table-outer">
        <div className="col-del-row">
          <div style={{width:22}} />
          {block.cells[0]?.map((_, ci) => <button key={ci} className="col-del-btn" onClick={() => delCol(ci)}>✕</button>)}
          <div style={{width:28}} />
        </div>
        <div style={{display:'flex'}}>
          <div className="row-del-col">{block.cells.map((_,ri) => <button key={ri} className="row-del-btn" onClick={() => delRow(ri)}>✕</button>)}</div>
          <table className="i-table">
            <tbody>
              {block.cells.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ background: cell.bg || '', color: cell.color || '' }}>
                      <div contentEditable suppressContentEditableWarning className="t-cell"
                        onInput={e => updateCell(ri, ci, 'content', e.currentTarget.textContent)}
                        ref={el => { if (el && el.textContent !== cell.content && document.activeElement !== el) el.textContent = cell.content }} />
                      <button className="cell-color-btn" onClick={() => setColorPicker({ r: ri, c: ci })}>🎨</button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-col-btn" onClick={addCol}>＋</button>
        </div>
        <div className="add-row-wrap"><button className="add-row-btn" onClick={addRow}>＋ Ajouter une ligne</button></div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÉDITEUR DE BLOCS
// ═══════════════════════════════════════════════════════════════════════════════

function BlockEditor({ blocks, onChange, dark, noteColor }) {
  const [addMenu, setAddMenu] = useState(null)   // { afterIndex, x, y }
  const [ctxMenu, setCtxMenu] = useState(null)   // { x, y, blockId, blockIndex }
  const [dropTarget, setDropTarget] = useState(null)
  const blockRefs = useRef({})
  const dragId = useRef(null)
  const longPressTimer = useRef(null)

  const updateBlock = useCallback((id, changes) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...changes } : b))
  }, [blocks, onChange])

  const addBlock = (type, afterIndex) => {
    const nb = createBlock(type)
    const arr = [...blocks]
    arr.splice(afterIndex + 1, 0, nb)
    onChange(arr)
    setTimeout(() => blockRefs.current[nb.id]?.focus(), 60)
  }

  const deleteBlock = (id) => {
    if (blocks.length <= 1) return
    const idx = blocks.findIndex(b => b.id === id)
    onChange(blocks.filter(b => b.id !== id))
    const prev = blocks[idx - 1] || blocks[idx + 1]
    if (prev) setTimeout(() => blockRefs.current[prev.id]?.focus(), 30)
  }

  const duplicateBlock = (id) => {
    const idx = blocks.findIndex(b => b.id === id)
    const nb = { ...blocks[idx], id: uid() }
    const arr = [...blocks]
    arr.splice(idx + 1, 0, nb)
    onChange(arr)
  }

  const moveBlock = (id, dir) => {
    const idx = blocks.findIndex(b => b.id === id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= blocks.length) return
    const arr = [...blocks]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    onChange(arr)
  }

  const makeKeyHandler = (block, index) => (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const next = ['checkbox','bullet','numbered'].includes(block.type) ? block.type : 'paragraph'
      addBlock(next, index)
    }
    if (e.key === 'Backspace') {
      const el = blockRefs.current[block.id]
      if ((!el || !el.textContent) && blocks.length > 1) { e.preventDefault(); deleteBlock(block.id) }
    }
    if (e.key === 'ArrowDown' && blocks[index + 1]) setTimeout(() => blockRefs.current[blocks[index+1].id]?.focus(), 0)
    if (e.key === 'ArrowUp' && blocks[index - 1]) setTimeout(() => blockRefs.current[blocks[index-1].id]?.focus(), 0)
  }

  const openCtxMenu = (e, block, index) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, blockId: block.id, blockIndex: index })
  }

  const openAddMenu = (e, afterIndex) => {
    e.stopPropagation()
    setAddMenu({ afterIndex, x: e.clientX, y: e.clientY })
  }

  // Drag & drop
  const onHandleMouseDown = (id) => { dragId.current = id }

  const onDragStart = (e, id) => {
    if (dragId.current !== id) { e.preventDefault(); return }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const onDragOver = (e, index) => { e.preventDefault(); setDropTarget(index) }

  const onDrop = (e, targetIndex) => {
    e.preventDefault()
    const fromId = dragId.current || e.dataTransfer.getData('text/plain')
    const fromIndex = blocks.findIndex(b => b.id === fromId)
    if (fromIndex === -1 || fromIndex === targetIndex) { setDropTarget(null); return }
    const arr = [...blocks]
    const [moved] = arr.splice(fromIndex, 1)
    arr.splice(targetIndex > fromIndex ? targetIndex - 1 : targetIndex, 0, moved)
    onChange(arr); setDropTarget(null); dragId.current = null
  }

  // Long press (mobile)
  const onTouchStart = (e, block, index) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0]
      setCtxMenu({ x: touch.clientX, y: touch.clientY, blockId: block.id, blockIndex: index })
    }, 500)
  }
  const onTouchEnd = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }

  const ctxBlock = ctxMenu ? blocks.find(b => b.id === ctxMenu.blockId) : null
  const ctxIndex = ctxMenu?.blockIndex ?? -1

  return (
    <div className="block-editor" onClick={() => { setAddMenu(null) }}>
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className={`block-row${dropTarget === index ? ' drop-target' : ''}`}
          draggable
          onDragStart={e => onDragStart(e, block.id)}
          onDragEnd={() => { setDropTarget(null); dragId.current = null }}
          onDragOver={e => onDragOver(e, index)}
          onDrop={e => onDrop(e, index)}
          onContextMenu={e => openCtxMenu(e, block, index)}
          onTouchStart={e => onTouchStart(e, block, index)}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchEnd}
          style={block.bgColor ? { background: getBlockBg(block.bgColor, dark), borderRadius: 6 } : {}}
        >
          {/* Contrôles gauche */}
          <div className="block-left">
            <div className="drag-handle" onMouseDown={() => onHandleMouseDown(block.id)} title="Glisser pour déplacer">⠿</div>
            <button className="add-btn" onClick={e => openAddMenu(e, index)} title="Ajouter un bloc">⊕</button>
          </div>

          {/* Contenu du bloc */}
          <div className="block-content">
            {block.type === 'divider' && <hr className="block-divider" />}
            {block.type === 'table' && <TableBlock block={block} onChange={updateBlock} dark={dark} />}
            {block.type === 'checkbox' && <CheckboxBlock block={block} onChange={updateBlock} onKeyDown={makeKeyHandler(block, index)} onFocus={() => {}} />}
            {['paragraph','heading1','heading2','bullet','numbered','quote'].includes(block.type) && (
              <TextBlock block={block} onChange={updateBlock} onKeyDown={makeKeyHandler(block, index)} onFocus={() => {}} setRef={el => { blockRefs.current[block.id] = el }} />
            )}
          </div>

          {/* Bouton menu (hover) */}
          <button className="block-menu-btn" onClick={e => openCtxMenu(e, block, index)} title="Options du bloc">⋮</button>
        </div>
      ))}

      {/* Ajouter bloc à la fin */}
      <button className="add-end-btn" onClick={e => { e.stopPropagation(); openAddMenu(e, blocks.length - 1) }}>
        <span>⊕</span> Ajouter un bloc
      </button>

      {/* Menus */}
      {addMenu && <AddBlockMenu onAdd={type => addBlock(type, addMenu.afterIndex)} onClose={() => setAddMenu(null)} position={addMenu} />}
      {ctxMenu && ctxBlock && (
        <ContextMenu menu={ctxMenu} block={ctxBlock} dark={dark}
          onChangeType={type => updateBlock(ctxBlock.id, { type })}
          onChangeFontSize={s => updateBlock(ctxBlock.id, { fontSize: s })}
          onChangeBgColor={c => updateBlock(ctxBlock.id, { bgColor: c })}
          onMoveUp={() => moveBlock(ctxBlock.id, -1)}
          onMoveDown={() => moveBlock(ctxBlock.id, 1)}
          onDuplicate={() => duplicateBlock(ctxBlock.id)}
          onDelete={() => deleteBlock(ctxBlock.id)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODÈLES
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPLATES = [
  { id:'meeting', icon:'🤝', label:'Réunion', title:'Réunion — ', blocks:[
    { id:uid(), type:'heading1', content:'Réunion — [Sujet]', fontSize:'md', bgColor:null },
    { id:uid(), type:'paragraph', content:`Date : ${new Date().toLocaleDateString('fr-FR')}`, fontSize:'md', bgColor:null },
    { id:uid(), type:'heading2', content:'Ordre du jour', fontSize:'md', bgColor:null },
    { id:uid(), type:'numbered', content:'', fontSize:'md', bgColor:null },
    { id:uid(), type:'heading2', content:'Actions à suivre', fontSize:'md', bgColor:null },
    { id:uid(), type:'checkbox', content:'', checked:false, fontSize:'md', bgColor:null },
  ]},
  { id:'journal', icon:'📖', label:'Journal', title:`Journal — ${new Date().toLocaleDateString('fr-FR')}`, blocks:[
    { id:uid(), type:'heading1', content:new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}), fontSize:'md', bgColor:null },
    { id:uid(), type:'heading2', content:'😊 Comment je me sens', fontSize:'md', bgColor:null },
    { id:uid(), type:'paragraph', content:'', fontSize:'md', bgColor:null },
    { id:uid(), type:'heading2', content:'🌟 Ce qui s\'est bien passé', fontSize:'md', bgColor:null },
    { id:uid(), type:'paragraph', content:'', fontSize:'md', bgColor:null },
    { id:uid(), type:'heading2', content:'🎯 Demain', fontSize:'md', bgColor:null },
    { id:uid(), type:'checkbox', content:'', checked:false, fontSize:'md', bgColor:null },
  ]},
  { id:'shopping', icon:'🛒', label:'Courses', title:'Courses', blocks:[
    { id:uid(), type:'heading1', content:'🛒 Liste de courses', fontSize:'md', bgColor:null },
    { id:uid(), type:'checkbox', content:'', checked:false, fontSize:'md', bgColor:null },
    { id:uid(), type:'checkbox', content:'', checked:false, fontSize:'md', bgColor:null },
    { id:uid(), type:'checkbox', content:'', checked:false, fontSize:'md', bgColor:null },
  ]},
  { id:'project', icon:'🚀', label:'Projet', title:'Projet — ', blocks:[
    { id:uid(), type:'heading1', content:'🚀 Nom du projet', fontSize:'md', bgColor:null },
    { id:uid(), type:'heading2', content:'Objectif', fontSize:'md', bgColor:null },
    { id:uid(), type:'paragraph', content:'', fontSize:'md', bgColor:null },
    { id:uid(), type:'heading2', content:'Étapes', fontSize:'md', bgColor:null },
    { id:uid(), type:'checkbox', content:'', checked:false, fontSize:'md', bgColor:null },
  ]},
  { id:'budget', icon:'💰', label:'Budget', title:'Budget', blocks:[
    { id:uid(), type:'heading1', content:'💰 Budget', fontSize:'md', bgColor:null },
    { id:uid(), type:'table', fontSize:'md', bgColor:null, cells:[
      [{content:'Catégorie',bg:'#1C1917',color:'#F7F3EC'},{content:'Prévu',bg:'#1C1917',color:'#F7F3EC'},{content:'Réel',bg:'#1C1917',color:'#F7F3EC'}],
      [{content:'',bg:null,color:null},{content:'',bg:null,color:null},{content:'',bg:null,color:null}],
      [{content:'Total',bg:'#f3f4f6',color:'#374151'},{content:'0 €',bg:'#f3f4f6',color:'#374151'},{content:'0 €',bg:'#f3f4f6',color:'#374151'}],
    ]},
  ]},
  { id:'recipe', icon:'🍽️', label:'Recette', title:'Recette — ', blocks:[
    { id:uid(), type:'heading1', content:'🍽️ Recette', fontSize:'md', bgColor:null },
    { id:uid(), type:'heading2', content:'Ingrédients', fontSize:'md', bgColor:null },
    { id:uid(), type:'checkbox', content:'', checked:false, fontSize:'md', bgColor:null },
    { id:uid(), type:'heading2', content:'Préparation', fontSize:'md', bgColor:null },
    { id:uid(), type:'numbered', content:'', fontSize:'md', bgColor:null },
  ]},
]

// ═══════════════════════════════════════════════════════════════════════════════
// AUTRES MODAUX
// ═══════════════════════════════════════════════════════════════════════════════

function TemplatesModal({ onSelect, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>📋 Choisir un modèle</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="templates-grid">
          {TEMPLATES.map(t => (
            <button key={t.id} className="template-card" onClick={() => onSelect(t)}>
              <span className="tpl-icon">{t.icon}</span><span className="tpl-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ColorPickerModal({ currentColor, onSelect, onClose, dark }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card small" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>🎨 Couleur de la note</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="color-grid">
          {NOTE_COLORS.map(c => (
            <button key={c.id??'none'} className={`color-swatch${currentColor===c.id?' selected':''}`}
              style={{ background: (dark?c.dark:c.light)||(dark?'#211e1b':'#F7F3EC') }}
              onClick={() => onSelect(c.id)}>{currentColor===c.id&&'✓'}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const steps = [
    { icon:'📝', title:'Bienvenue dans NoteFlow', desc:'Votre éditeur de notes simple, rapide et 100% local. Aucune connexion requise.' },
    { icon:'☐', title:'Blocs interactifs', desc:'Cliquez pour écrire. Cochez les cases directement. Ajoutez des blocs avec ⊕.' },
    { icon:'🖱️', title:'Menu contextuel', desc:'Clic droit (ordinateur) ou appui long (téléphone) sur un bloc pour le modifier, colorer ou supprimer.' },
    { icon:'⠿', title:'Réorganiser', desc:'Glissez le symbole ⠿ pour changer l\'ordre des blocs. Tableaux interactifs inclus.' },
  ]
  const cur = steps[step]
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="ob-icon">{cur.icon}</div>
        <h2 className="ob-title">{cur.title}</h2>
        <p className="ob-desc">{cur.desc}</p>
        <div className="ob-dots">{steps.map((_,i)=><div key={i} className={`ob-dot${i===step?' active':''}`}/>)}</div>
        <div className="ob-actions">
          {step<steps.length-1?<><button className="ob-skip" onClick={onDone}>Passer</button><button className="ob-next" onClick={()=>setStep(step+1)}>Suivant →</button></> : <button className="ob-next full" onClick={onDone}>Commencer ✦</button>}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function SidebarContent({ filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, togglePin, setShowTemplates, sortBy, setSortBy }) {
  return (
    <>
      <div className="sidebar-header">
        <div className="logo-row">
          <div className="logo"><div className="logo-mark">N</div><div className="logo-text">Note<span>Flow</span></div></div>
          <button className="theme-toggle" onClick={() => setDark(d=>!d)}>{dark?'☀️':'🌙'}</button>
        </div>
        <div className="search-bar"><span className="si">⌕</span><input placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        {allTags.length>0&&<div className="tags-row">{allTags.map(t=><button key={t} className={`tag-filter${activeTag===t?' active':''}`} onClick={()=>setActiveTag(activeTag===t?null:t)}>#{t}</button>)}</div>}
        <div className="sort-row">
          {[['updated','Récent'],['title','A-Z'],['size','Taille']].map(([v,l])=>(
            <button key={v} className={`sort-btn${sortBy===v?' active':''}`} onClick={()=>setSortBy(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="new-note-row">
        <button className="new-note-btn" onClick={()=>createNote()}>＋ Note</button>
        <button className="template-btn" onClick={()=>setShowTemplates(true)}>📋 Modèle</button>
      </div>
      <div className="note-list">
        {filtered.length===0&&<div className="empty-list">Aucune note trouvée</div>}
        {filtered.map(note=>(
          <div key={note.id} className={`note-item${note.id===selected?.id?' active':''}`} onClick={()=>selectNote(note.id)}>
            <div className="note-item-body">
              <div className="note-item-title-row">
                {note.pinned&&<span style={{fontSize:10}}>📌</span>}
                <span className="note-item-title">{note.title||'Sans titre'}</span>
              </div>
              <div className="note-item-date">{formatDate(note.updatedAt)}</div>
              {note.tags?.length>0&&<div className="note-item-tags">{note.tags.slice(0,3).map(t=>{const c=getTagColor(t,dark);return<span key={t} className="note-tag" style={{background:c.bg,color:c.text}}>#{t}</span>})}</div>}
            </div>
            <div className="note-item-actions">
              <button className="note-pin-btn" onClick={e=>{e.stopPropagation();togglePin(note.id)}}>{note.pinned?'📌':'📍'}</button>
              <button className="note-delete" onClick={e=>{e.stopPropagation();deleteNote(note.id)}}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function NoteFlow() {
  const isMobile = useIsMobile()
  const [dark, setDark] = useState(()=>{try{return localStorage.getItem('nf-dark')==='true'}catch{return false}})
  const [showOnboarding, setShowOnboarding] = useState(()=>{try{return!localStorage.getItem('nf-onboarded')}catch{return true}})
  const [notes, setNotes] = useState(()=>{try{const s=localStorage.getItem('nf-notes');return s?JSON.parse(s).map(migrateNote):[WELCOME_NOTE]}catch{return[WELCOME_NOTE]}})
  const [selectedId, setSelectedId] = useState(()=>{try{const s=localStorage.getItem('nf-selected');return s?Number(s):1}catch{return 1}})
  const [mobileScreen, setMobileScreen] = useState('list')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [sortBy, setSortBy] = useState('updated')

  useEffect(()=>{localStorage.setItem('nf-notes',JSON.stringify(notes))},[notes])
  useEffect(()=>{localStorage.setItem('nf-selected',String(selectedId))},[selectedId])
  useEffect(()=>{localStorage.setItem('nf-dark',dark)},[dark])

  const finishOnboarding = ()=>{localStorage.setItem('nf-onboarded','true');setShowOnboarding(false)}
  const selected = notes.find(n=>n.id===selectedId)
  const allTags = [...new Set(notes.flatMap(n=>n.tags||[]))]

  const filtered = [...notes]
    .filter(n=>n.title?.toLowerCase().includes(search.toLowerCase())&&(activeTag?n.tags?.includes(activeTag):true))
    .sort((a,b)=>{
      if(a.pinned&&!b.pinned)return-1;if(!a.pinned&&b.pinned)return 1
      if(sortBy==='title')return a.title.localeCompare(b.title)
      if(sortBy==='size')return(b.blocks?.length||0)-(a.blocks?.length||0)
      return new Date(b.updatedAt)-new Date(a.updatedAt)
    })

  const createNote = (template=null) => {
    const n = { id:Date.now(), title:template?.title||'Nouvelle note', blocks:template?.blocks?.map(b=>({...b,id:uid()}))||[createBlock('paragraph')], tags:[], pinned:false, color:null, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }
    setNotes(prev=>[n,...prev]); setSelectedId(n.id); setShowTemplates(false)
    if(isMobile)setMobileScreen('edit')
  }
  const selectNote = (id)=>{setSelectedId(id);if(isMobile)setMobileScreen('edit')}
  const deleteNote = (id)=>{setNotes(prev=>prev.filter(n=>n.id!==id));setSelectedId(notes.filter(n=>n.id!==id)[0]?.id??null);if(isMobile)setMobileScreen('list')}
  const updateBlocks = useCallback((blocks)=>{setNotes(prev=>prev.map(n=>n.id===selectedId?{...n,blocks,updatedAt:new Date().toISOString()}:n))},[selectedId])
  const updateField = (field,value)=>{setNotes(prev=>prev.map(n=>n.id===selectedId?{...n,[field]:value,updatedAt:new Date().toISOString()}:n))}
  const togglePin = (id)=>setNotes(prev=>prev.map(n=>n.id===id?{...n,pinned:!n.pinned}:n))
  const addTag = (tag)=>{const c=tag.trim().toLowerCase().replace(/\s+/g,'-');if(!c||selected?.tags?.includes(c))return;updateField('tags',[...(selected?.tags||[]),c]);setTagInput('');setShowTagInput(false)}
  const removeTag = (tag)=>updateField('tags',selected.tags.filter(t=>t!==tag))
  const wordCount = selected?.blocks?.reduce((a,b)=>a+(b.content?.trim().split(/\s+/).filter(Boolean).length||0),0)||0

  const sp = {filtered,selected,search,setSearch,activeTag,setActiveTag,allTags,dark,setDark,createNote,selectNote,deleteNote,togglePin,setShowTemplates,sortBy,setSortBy}

  const noteEditorContent = selected && (
    <>
      <input className="note-title-input" value={selected.title} onChange={e=>updateField('title',e.target.value)} placeholder="Titre de la note..."/>
      <BlockEditor blocks={selected.blocks||[]} onChange={updateBlocks} dark={dark} noteColor={selected.color}/>
    </>
  )

  return (
    <>
      <style>{CSS(dark)}</style>
      {showOnboarding&&<Onboarding onDone={finishOnboarding}/>}
      {showTemplates&&<TemplatesModal onSelect={t=>createNote(t)} onClose={()=>setShowTemplates(false)}/>}
      {showColorPicker&&selected&&<ColorPickerModal currentColor={selected.color} onSelect={c=>{updateField('color',c);setShowColorPicker(false)}} onClose={()=>setShowColorPicker(false)} dark={dark}/>}

      {isMobile?(
        <div className="mobile-app">
          {mobileScreen==='list'&&<div className="mobile-screen"><SidebarContent {...sp}/></div>}
          {mobileScreen==='edit'&&selected&&(
            <div className="mobile-screen">
              <div className="mobile-header">
                <button className="mobile-icon-btn" onClick={()=>setMobileScreen('list')}>←</button>
                <input className="mobile-title-input" value={selected.title} onChange={e=>updateField('title',e.target.value)} placeholder="Titre..."/>
                <div style={{display:'flex',gap:4}}>
                  <button className="mobile-icon-btn small" onClick={()=>shareNote(selected)}>📤</button>
                  <button className="mobile-icon-btn small" onClick={()=>printNote(selected)}>🖨️</button>
                  <button className="mobile-icon-btn small" onClick={()=>setShowColorPicker(true)}>🎨</button>
                  <button className="mobile-icon-btn small" onClick={()=>setDark(d=>!d)}>{dark?'☀️':'🌙'}</button>
                </div>
              </div>
              <div className="mobile-tags">
                {selected.tags?.map(t=>{const c=getTagColor(t,dark);return<span key={t} className="note-tag-pill" style={{background:c.bg,color:c.text}}>#{t}<button className="tag-remove" onClick={()=>removeTag(t)}>✕</button></span>})}
                {showTagInput?<input className="tag-input-inline" autoFocus value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addTag(tagInput);if(e.key==='Escape'){setShowTagInput(false);setTagInput('')}}} onBlur={()=>{if(tagInput)addTag(tagInput);else setShowTagInput(false)}} placeholder="tag"/>:<button className="add-tag-btn" onClick={()=>setShowTagInput(true)}>+ tag</button>}
              </div>
              <div className="mobile-editor-wrap">{noteEditorContent}</div>
              <div className="mobile-status"><span><span className="status-dot"/>Sauvegardé</span><span>{wordCount} mots</span></div>
            </div>
          )}
        </div>
      ):(
        <div className="app">
          <aside className={`sidebar${sidebarOpen?' closed':''}`}><SidebarContent {...sp}/></aside>
          <main className="main">
            {selected?(
              <>
                <div className="toolbar">
                  <button className="toggle-sidebar" onClick={()=>setSidebarOpen(v=>!v)}>☰</button>
                  <input className="title-input" value={selected.title} onChange={e=>updateField('title',e.target.value)} placeholder="Titre de la note..."/>
                  <div className="toolbar-actions">
                    <button className="tool-btn" onClick={()=>togglePin(selected.id)} title={selected.pinned?'Désépingler':'Épingler'}>{selected.pinned?'📌':'📍'}</button>
                    <button className="tool-btn" onClick={()=>setShowColorPicker(true)} title="Couleur de la note">🎨</button>
                    <button className="tool-btn" onClick={()=>shareNote(selected)} title="Partager">📤</button>
                    <button className="tool-btn" onClick={()=>printNote(selected)} title="Imprimer">🖨️</button>
                    <button className="tool-btn" onClick={()=>exportNote(selected)} title="Exporter en .txt">⬇</button>
                  </div>
                </div>
                <div className="tag-manager">
                  <span className="tag-label">tags :</span>
                  {selected.tags?.map(t=>{const c=getTagColor(t,dark);return<span key={t} className="note-tag-pill" style={{background:c.bg,color:c.text}}>#{t}<button className="tag-remove" onClick={()=>removeTag(t)}>✕</button></span>})}
                  {showTagInput?<input className="tag-input-inline" autoFocus value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addTag(tagInput);if(e.key==='Escape'){setShowTagInput(false);setTagInput('')}}} onBlur={()=>{if(tagInput)addTag(tagInput);else setShowTagInput(false)}} placeholder="nouveau-tag"/>:<button className="add-tag-btn" onClick={()=>setShowTagInput(true)}>+ tag</button>}
                </div>
                <div className="editor-scroll">
                  <div className="editor-inner">{noteEditorContent}</div>
                </div>
                <div className="status-bar">
                  <span><span className="status-dot"/>Sauvegardé</span>
                  <span>{wordCount} mots</span>
                  {selected.pinned&&<span>📌 Épinglée</span>}
                  <span style={{marginLeft:'auto'}}>Modifié le {formatDate(selected.updatedAt)}</span>
                </div>
              </>
            ):(
              <div className="no-note">
                <div style={{fontSize:48,opacity:.3}}>📝</div>
                <p>Sélectionnez ou créez une note</p>
                <div style={{display:'flex',gap:10,marginTop:12}}>
                  <button className="new-note-btn" onClick={()=>createNote()}>+ Note</button>
                  <button className="template-btn" onClick={()=>setShowTemplates(true)}>📋 Modèle</button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = (dark) => `
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

/* ── Onboarding ── */
.onboarding-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:2000;padding:20px}
.onboarding-card{background:var(--white);border-radius:20px;padding:40px 32px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.ob-icon{font-size:52px;margin-bottom:20px}
.ob-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--ink);margin-bottom:12px}
.ob-desc{font-family:'Lora',serif;font-size:15px;color:var(--ink-light);line-height:1.7;margin-bottom:28px}
.ob-dots{display:flex;justify-content:center;gap:8px;margin-bottom:28px}
.ob-dot{width:8px;height:8px;border-radius:50%;background:var(--border);transition:all .2s}
.ob-dot.active{background:var(--accent);width:24px;border-radius:4px}
.ob-actions{display:flex;gap:12px;justify-content:center}
.ob-skip{padding:10px 20px;border:1px solid var(--border);border-radius:8px;background:none;cursor:pointer;color:var(--ink-muted);font-family:'Lora',serif;font-size:14px}
.ob-next{padding:10px 24px;background:var(--accent);color:white;border:none;border-radius:8px;cursor:pointer;font-family:'Lora',serif;font-size:14px;font-weight:500}
.ob-next.full{width:100%;padding:12px;font-size:16px}
.ob-next:hover{background:var(--accent-hover)}

/* ── Context Menu ── */
.ctx-menu{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:8px;min-width:220px;box-shadow:0 8px 32px rgba(0,0,0,.2);z-index:1000}
.ctx-section-title{font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;padding:4px 8px 6px}
.ctx-type-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:4px}
.ctx-type-btn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-family:'Lora',serif;font-size:11px;color:var(--ink-light);transition:all .1s}
.ctx-type-btn:hover{background:var(--accent-light);border-color:var(--accent);color:var(--accent)}
.ctx-type-btn.active{background:var(--accent);border-color:var(--accent);color:white}
.ctx-type-icon{font-size:13px;font-family:'JetBrains Mono',monospace;font-weight:600}
.ctx-divider{border:none;border-top:1px solid var(--border);margin:6px 0}
.ctx-row{display:flex;gap:4px;padding:0 4px 4px}
.ctx-size-btn{flex:1;padding:6px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--ink-light);transition:all .1s}
.ctx-size-btn:hover{background:var(--accent-light);color:var(--accent);border-color:var(--accent)}
.ctx-size-btn.active{background:var(--accent);color:white;border-color:var(--accent)}
.ctx-color-row{display:flex;gap:8px;padding:4px 8px 8px;flex-wrap:wrap}
.ctx-color-dot{width:24px;height:24px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:transform .1s}
.ctx-color-dot:hover{transform:scale(1.2)}
.ctx-color-dot.selected{border-color:var(--accent);transform:scale(1.1)}
.ctx-item{display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;background:none;cursor:pointer;font-family:'Lora',serif;font-size:13px;color:var(--ink);border-radius:6px;text-align:left;transition:background .1s}
.ctx-item:hover{background:var(--cream)}
.ctx-item.danger{color:#B01A1A}
.ctx-item.danger:hover{background:#FEF0F0}

/* ── Add block menu ── */
.add-menu{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:8px;min-width:180px;box-shadow:0 8px 32px rgba(0,0,0,.18)}
.add-menu-title{font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;padding:4px 8px 8px}
.add-menu-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:none;background:none;cursor:pointer;border-radius:7px;font-family:'Lora',serif;font-size:13px;color:var(--ink);transition:background .1s}
.add-menu-item:hover{background:var(--accent-light)}
.add-menu-icon{width:26px;height:26px;border-radius:5px;background:var(--cream-dark);display:flex;align-items:center;justify-content:center;font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--ink-light);flex-shrink:0}

/* ── Modals ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1500;padding:20px}
.modal-card{background:var(--white);border-radius:16px;padding:24px;max-width:500px;width:100%;box-shadow:0 16px 48px rgba(0,0,0,.25);max-height:90vh;overflow-y:auto}
.modal-card.small{max-width:340px}
.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.modal-header h3{font-family:'Playfair Display',serif;font-size:18px;color:var(--ink)}
.modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--ink-muted);padding:4px 8px;border-radius:6px}
.modal-close:hover{background:var(--cream)}
.templates-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.template-card{display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px 10px;border:1px solid var(--border);border-radius:12px;background:var(--cream);cursor:pointer;transition:all .15s}
.template-card:hover{border-color:var(--accent);background:var(--accent-light);transform:translateY(-2px)}
.tpl-icon{font-size:26px}
.tpl-label{font-size:12px;color:var(--ink-light);font-family:'Lora',serif}
.color-grid{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;padding:8px 0}
.color-swatch{width:44px;height:44px;border-radius:50%;cursor:pointer;border:2px solid transparent;display:flex;align-items:center;justify-content:center;font-size:16px;transition:transform .15s}
.color-swatch:hover{transform:scale(1.1)}
.color-swatch.selected{border-color:var(--accent)}

/* ── Block editor ── */
.block-editor{min-height:200px;padding-bottom:80px}
.note-title-input{width:100%;border:none;background:transparent;font-family:'Playfair Display',serif;font-size:28px;font-weight:600;color:var(--ink);outline:none;padding:8px 0 8px 36px;margin-bottom:4px;border-bottom:1px solid var(--border)}
.note-title-input::placeholder{color:var(--ink-muted)}

/* Block row */
.block-row{display:flex;align-items:center;gap:0;position:relative;border-radius:6px;min-height:32px;padding:2px 0}
.block-row:hover .drag-handle{opacity:.5}
.block-row:hover .add-btn{opacity:.7}
.block-row:hover .block-menu-btn{opacity:1}
.block-row.drop-target{border-top:2px solid var(--accent)}

/* Left controls */
.block-left{display:flex;align-items:center;flex-shrink:0;width:48px;justify-content:flex-end;gap:2px;opacity:0;transition:opacity .15s;align-self:flex-start;padding-top:6px}
.block-row:hover .block-left{opacity:1}
.drag-handle{color:var(--ink-muted);cursor:grab;font-size:14px;padding:3px 2px;border-radius:4px;user-select:none;line-height:1;opacity:0;transition:opacity .15s}
.drag-handle:hover{opacity:1!important;background:var(--cream-dark);color:var(--ink)}
.drag-handle:active{cursor:grabbing}
.add-btn{background:none;border:1px solid var(--border);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:var(--ink-muted);transition:all .15s;opacity:0;flex-shrink:0;line-height:1}
.add-btn:hover{background:var(--accent);color:white;border-color:var(--accent)}

/* Block content */
.block-content{flex:1;min-width:0}

/* Block menu button */
.block-menu-btn{background:none;border:none;cursor:pointer;padding:4px 6px;border-radius:5px;color:var(--ink-muted);font-size:16px;opacity:0;transition:opacity .15s;flex-shrink:0;align-self:flex-start;margin-top:4px}
.block-menu-btn:hover{background:var(--cream-dark);color:var(--ink)}

/* Add end button */
.add-end-btn{display:flex;align-items:center;gap:8px;padding:10px 48px;background:none;border:none;cursor:pointer;font-family:'Lora',serif;font-size:13px;color:var(--ink-muted);border-radius:8px;transition:all .15s;width:100%;margin-top:8px}
.add-end-btn:hover{color:var(--accent);background:var(--accent-light)}

/* Block styles */
.block{outline:none;width:100%;min-height:1.6em;font-family:'Lora',serif;color:var(--ink);caret-color:var(--accent);padding:4px 6px;border-radius:4px;line-height:1.75;transition:background .1s}
.block:focus{background:${dark?'rgba(255,255,255,.03)':'rgba(0,0,0,.015)'}}
.block:empty::before{content:attr(data-placeholder);color:var(--ink-muted);pointer-events:none}
.block-h1{font-family:'Playfair Display',serif;font-size:24px;font-weight:600;margin:10px 0 2px;line-height:1.3}
.block-h2{font-family:'Playfair Display',serif;font-size:18px;font-weight:600;margin:8px 0 2px;line-height:1.3}
.block-p{font-size:15px;margin:1px 0}
.block-bullet{font-size:15px;padding-left:22px;margin:1px 0;position:relative}
.block-bullet::before{content:'•';position:absolute;left:7px;color:var(--accent)}
.block-numbered{font-size:15px;padding-left:22px;margin:1px 0;position:relative}
.block-numbered::before{content:counter(list)'.';position:absolute;left:4px;color:var(--accent)}
.block-quote{font-size:15px;margin:4px 0;border-left:3px solid var(--accent);padding-left:14px;color:var(--ink-light);font-style:italic;border-radius:0 4px 4px 0}
.block-divider{border:none;border-top:1px solid var(--border);margin:8px 0}
.fs-sm{font-size:12px!important}
.fs-lg{font-size:19px!important}

/* Checkbox */
.block-checkbox{display:flex;align-items:flex-start;gap:10px;padding:3px 6px;border-radius:4px;min-height:32px}
.checkbox-btn{width:20px;height:20px;border:2px solid var(--border);border-radius:5px;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;transition:all .15s;flex-shrink:0;margin-top:3px}
.block-checkbox.checked .checkbox-btn{background:var(--accent);border-color:var(--accent)}
.checkbox-text{flex:1;outline:none;font-family:'Lora',serif;font-size:15px;color:var(--ink);min-height:1.5em;line-height:1.7;padding:0 2px}
.checkbox-text:empty::before{content:attr(data-placeholder);color:var(--ink-muted);pointer-events:none}
.checkbox-text.striked{text-decoration:line-through;color:var(--ink-muted)}

/* Table */
.block-table-wrap{position:relative;margin:6px 0;overflow-x:auto}
.table-outer{display:inline-block;min-width:100%}
.col-del-row{display:flex;padding-bottom:2px;gap:0}
.col-del-btn{flex:1;background:none;border:none;cursor:pointer;font-size:9px;color:var(--ink-muted);padding:2px;border-radius:3px;opacity:0;transition:opacity .15s}
.block-table-wrap:hover .col-del-btn,.block-table-wrap:hover .row-del-btn{opacity:.7}
.col-del-btn:hover,.row-del-btn:hover{color:#B01A1A;opacity:1!important}
.row-del-col{display:flex;flex-direction:column;width:22px;flex-shrink:0}
.row-del-btn{flex:1;min-height:34px;background:none;border:none;cursor:pointer;font-size:9px;color:var(--ink-muted);padding:0 3px;border-radius:3px;opacity:0;transition:opacity .15s}
.i-table{border-collapse:collapse;width:100%}
.i-table td{border:1px solid var(--border);padding:0;min-width:80px;position:relative;vertical-align:top}
.t-cell{width:100%;min-height:32px;padding:7px 10px;outline:none;font-family:'Lora',serif;font-size:14px;color:inherit;background:transparent;white-space:pre-wrap;word-break:break-word;line-height:1.5}
.t-cell:empty::before{content:'';pointer-events:none}
.cell-color-btn{position:absolute;top:2px;right:2px;background:none;border:none;cursor:pointer;font-size:10px;opacity:0;transition:opacity .15s;padding:2px;border-radius:4px}
.i-table td:hover .cell-color-btn{opacity:.7}
.cell-color-btn:hover{opacity:1!important}
.add-col-btn{margin-left:4px;width:26px;align-self:stretch;background:none;border:1px dashed var(--border);border-radius:6px;cursor:pointer;color:var(--ink-muted);font-size:18px;transition:all .15s;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.add-col-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light)}
.add-row-wrap{margin-top:4px;margin-left:22px}
.add-row-btn{padding:5px 14px;background:none;border:1px dashed var(--border);border-radius:6px;cursor:pointer;color:var(--ink-muted);font-family:'Lora',serif;font-size:12px;transition:all .15s}
.add-row-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light)}
.cell-color-picker{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4)}
.cell-color-grid{background:var(--white);border-radius:12px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.2);min-width:200px}
.cell-color-title{font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px}
.cell-color-option{display:block;width:100%;padding:7px 12px;border:none;border-radius:8px;cursor:pointer;font-family:'Lora',serif;font-size:13px;text-align:left;margin-bottom:3px;border:1px solid rgba(0,0,0,.08)}
.cell-color-option:hover{opacity:.85}

/* Shared */
.note-tag-pill{display:flex;align-items:center;gap:4px;font-size:11px;font-family:'JetBrains Mono',monospace;padding:3px 8px;border-radius:20px}
.tag-remove{background:none;border:none;cursor:pointer;font-size:11px;padding:0;opacity:.6;color:inherit}
.tag-remove:hover{opacity:1}
.add-tag-btn{font-size:11px;padding:3px 8px;background:none;border:1px dashed var(--border);border-radius:20px;cursor:pointer;color:var(--ink-muted);font-family:'Lora',serif}
.add-tag-btn:hover{border-color:var(--accent);color:var(--accent)}
.tag-input-inline{font-size:11px;font-family:'JetBrains Mono',monospace;border:1px solid var(--accent);border-radius:20px;padding:3px 10px;outline:none;color:var(--ink);background:var(--white);width:100px}
.status-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#4CAF50;margin-right:5px}
.note-item-title-row{display:flex;align-items:center;gap:4px;margin-bottom:3px}
.note-item-title{font-family:'Playfair Display',serif;font-size:14px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.note-item-date{font-size:11px;color:var(--ink-muted);font-style:italic}
.note-item-tags{display:flex;gap:4px;margin-top:5px;flex-wrap:wrap}
.note-tag{font-size:10px;font-family:'JetBrains Mono',monospace;padding:2px 6px;border-radius:12px}
.search-bar{display:flex;align-items:center;gap:8px;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-bottom:8px}
.search-bar input{border:none;background:transparent;font-family:'Lora',serif;font-size:13px;color:var(--ink);width:100%;outline:none}
.search-bar input::placeholder{color:var(--ink-muted)}
.si{color:var(--ink-muted);font-size:14px}
.tags-row{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}
.tag-filter{font-size:11px;font-family:'JetBrains Mono',monospace;padding:3px 8px;border-radius:20px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--ink-light);transition:all .15s}
.tag-filter:hover{border-color:var(--accent);color:var(--accent)}
.tag-filter.active{background:var(--ink);color:var(--cream);border-color:var(--ink)}
.sort-row{display:flex;align-items:center;gap:4px}
.sort-btn{font-size:10px;font-family:'JetBrains Mono',monospace;padding:2px 7px;border-radius:20px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--ink-muted);transition:all .15s}
.sort-btn:hover{color:var(--accent);border-color:var(--accent)}
.sort-btn.active{background:var(--accent);color:white;border-color:var(--accent)}
.empty-list{text-align:center;padding:40px 20px;color:var(--ink-muted);font-size:13px;font-style:italic}
.logo{display:flex;align-items:center;gap:8px}
.logo-mark{width:28px;height:28px;background:var(--ink);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--cream);font-family:'Playfair Display',serif;font-size:14px;font-style:italic}
.logo-text{font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:var(--ink)}
.logo-text span{color:var(--accent)}

/* Desktop */
.app{display:flex;height:100vh;background:var(--cream);font-family:'Lora',serif;color:var(--ink);overflow:hidden}
.sidebar{width:280px;min-width:280px;background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;transition:margin-left .3s ease;overflow:hidden}
.sidebar.closed{margin-left:-280px}
.sidebar-header{padding:16px 16px 10px;border-bottom:1px solid var(--border);flex-shrink:0}
.logo-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.theme-toggle{background:none;border:1px solid var(--border);border-radius:8px;padding:4px 8px;cursor:pointer;font-size:16px}
.theme-toggle:hover{background:var(--cream)}
.new-note-row{display:flex;gap:8px;padding:8px 16px;flex-shrink:0;border-bottom:1px solid var(--border)}
.new-note-btn{flex:1;padding:9px;background:var(--accent);color:white;border:none;border-radius:8px;cursor:pointer;font-family:'Lora',serif;font-size:13px;font-weight:500;transition:background .15s}
.new-note-btn:hover{background:var(--accent-hover)}
.template-btn{flex:1;padding:9px;background:var(--cream);color:var(--ink-light);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-family:'Lora',serif;font-size:12px;transition:all .15s}
.template-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light)}
.note-list{flex:1;overflow-y:auto;padding:6px 0}
.note-list::-webkit-scrollbar{width:3px}
.note-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
.note-item{padding:10px 10px 10px 14px;cursor:pointer;border-left:3px solid transparent;transition:all .15s;display:flex;align-items:flex-start;gap:6px}
.note-item:hover{background:var(--cream)}
.note-item.active{background:var(--accent-light);border-left-color:var(--accent)}
.note-item-body{flex:1;min-width:0}
.note-item-actions{display:flex;gap:2px;flex-shrink:0;opacity:0;transition:opacity .15s}
.note-item:hover .note-item-actions{opacity:1}
.note-pin-btn{background:none;border:none;cursor:pointer;font-size:11px;padding:3px;border-radius:4px}
.note-delete{background:none;border:none;cursor:pointer;color:var(--ink-muted);font-size:12px;padding:3px 5px;border-radius:4px}
.note-delete:hover{color:#B01A1A;background:#FEF0F0}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.toolbar{display:flex;align-items:center;gap:8px;padding:10px 20px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0}
.toggle-sidebar{background:none;border:1px solid var(--border);border-radius:6px;padding:6px 10px;cursor:pointer;font-size:16px;color:var(--ink-light);transition:all .15s;flex-shrink:0}
.toggle-sidebar:hover{background:var(--cream)}
.title-input{flex:1;border:none;background:transparent;font-family:'Playfair Display',serif;font-size:17px;font-weight:600;color:var(--ink);outline:none;min-width:0}
.toolbar-actions{display:flex;gap:3px;flex-shrink:0}
.tool-btn{padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:14px;transition:all .15s;color:var(--ink-light)}
.tool-btn:hover{background:var(--accent-light);border-color:var(--accent)}
.tag-manager{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 20px;background:var(--cream);border-bottom:1px solid var(--border);flex-shrink:0}
.tag-label{font-size:11px;color:var(--ink-muted);font-style:italic}
.editor-scroll{flex:1;overflow-y:auto;background:var(--white)}
.editor-scroll::-webkit-scrollbar{width:5px}
.editor-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
.editor-inner{max-width:720px;margin:0 auto;padding:32px 16px 32px 0}
.status-bar{padding:5px 20px;background:var(--cream-dark);border-top:1px solid var(--border);display:flex;align-items:center;gap:14px;font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;flex-shrink:0}
.no-note{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:var(--ink-muted)}

/* Mobile */
.mobile-app{height:100dvh;background:var(--cream);font-family:'Lora',serif;color:var(--ink);display:flex;flex-direction:column;overflow:hidden}
.mobile-screen{display:flex;flex-direction:column;height:100%;overflow:hidden}
.mobile-screen .sidebar-header{padding:12px 14px 10px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--white)}
.mobile-screen .new-note-row{padding:8px 14px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0}
.mobile-screen .note-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.mobile-screen .note-item{padding:12px 12px 12px 14px;border-left:3px solid transparent;background:var(--white);cursor:pointer;transition:background .1s;display:flex;align-items:flex-start;gap:6px;border-bottom:1px solid var(--border)}
.mobile-screen .note-item:active{background:var(--accent-light)}
.mobile-screen .note-item.active{background:var(--accent-light);border-left-color:var(--accent)}
.mobile-screen .note-item-actions{opacity:1;flex-direction:row}
.mobile-header{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0;min-height:56px}
.mobile-icon-btn{min-width:38px;min-height:38px;border:1px solid var(--border);border-radius:10px;background:var(--cream);cursor:pointer;font-size:16px;color:var(--ink-light);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mobile-icon-btn.small{min-width:34px;min-height:34px;font-size:13px}
.mobile-icon-btn:active{transform:scale(.92)}
.mobile-title-input{flex:1;border:none;background:transparent;font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:var(--ink);outline:none;min-width:0}
.mobile-tags{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:7px 14px;background:var(--cream);border-bottom:1px solid var(--border);flex-shrink:0}
.mobile-editor-wrap{flex:1;overflow-y:auto;padding:16px 14px 80px;background:var(--white);-webkit-overflow-scrolling:touch}
.mobile-editor-wrap .note-title-input{padding-left:0;font-size:22px}
.mobile-editor-wrap .block-left{width:32px}
.mobile-status{display:flex;justify-content:space-between;padding:5px 14px;background:var(--cream-dark);border-top:1px solid var(--border);font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;flex-shrink:0}
`
