import { useState, useEffect, useCallback, useRef } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

const uid = () => Math.random().toString(36).slice(2, 9)

const createBlock = (type, extra = {}) => {
  switch (type) {
    case 'heading1':  return { id: uid(), type, content: '' }
    case 'heading2':  return { id: uid(), type, content: '' }
    case 'paragraph': return { id: uid(), type, content: '' }
    case 'bullet':    return { id: uid(), type, content: '' }
    case 'numbered':  return { id: uid(), type, content: '' }
    case 'quote':     return { id: uid(), type, content: '' }
    case 'checkbox':  return { id: uid(), type, content: '', checked: false }
    case 'divider':   return { id: uid(), type }
    case 'table':     return {
      id: uid(), type,
      cells: [
        [{ content: 'Colonne 1', bg: '#1C1917', color: '#F7F3EC' }, { content: 'Colonne 2', bg: '#1C1917', color: '#F7F3EC' }, { content: 'Colonne 3', bg: '#1C1917', color: '#F7F3EC' }],
        [{ content: '', bg: null, color: null }, { content: '', bg: null, color: null }, { content: '', bg: null, color: null }],
        [{ content: '', bg: null, color: null }, { content: '', bg: null, color: null }, { content: '', bg: null, color: null }],
      ],
    }
    default: return { id: uid(), type: 'paragraph', content: '' }
  }
}

// Migration des anciennes notes (format markdown → blocs)
const migrateNote = (note) => {
  if (note.blocks) return note
  const lines = (note.content || '').split('\n')
  const blocks = []
  for (const line of lines) {
    if (!line.trim()) continue
    if (line.startsWith('# '))        blocks.push(createBlock('heading1', { content: line.slice(2) }))
    else if (line.startsWith('## ')) blocks.push(createBlock('heading2', { content: line.slice(3) }))
    else if (line.startsWith('- [ ] ')) blocks.push({ ...createBlock('checkbox'), content: line.slice(6), checked: false })
    else if (line.startsWith('- [x] ')) blocks.push({ ...createBlock('checkbox'), content: line.slice(6), checked: true })
    else if (line.startsWith('- '))   blocks.push(createBlock('bullet', { content: line.slice(2) }))
    else if (line.startsWith('> '))   blocks.push(createBlock('quote', { content: line.slice(2) }))
    else if (line === '---')          blocks.push(createBlock('divider'))
    else                              blocks.push(createBlock('paragraph', { content: line }))
  }
  if (blocks.length === 0) blocks.push(createBlock('paragraph'))
  const { content, ...rest } = note
  return { ...rest, blocks }
}

const noteToText = (note) => {
  if (!note.blocks) return note.content || ''
  return note.blocks.map(b => {
    if (b.type === 'divider') return '---'
    if (b.type === 'table') return b.cells.map(r => r.map(c => c.content).join('\t')).join('\n')
    if (b.type === 'checkbox') return `[${b.checked ? 'x' : ' '}] ${b.content}`
    return b.content || ''
  }).join('\n')
}

const exportNote = (note) => {
  const text = noteToText(note)
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`; a.click()
  URL.revokeObjectURL(url)
}

const shareNote = async (note) => {
  const text = `${note.title}\n\n${noteToText(note)}`
  if (navigator.share) { try { await navigator.share({ title: note.title, text }) } catch {} }
  else { await navigator.clipboard.writeText(text); alert('Note copiée !') }
}

const printNote = (note) => {
  const w = window.open('', '_blank')
  const html = note.blocks?.map(b => {
    if (b.type === 'heading1') return `<h1>${b.content}</h1>`
    if (b.type === 'heading2') return `<h2>${b.content}</h2>`
    if (b.type === 'bullet') return `<li>${b.content}</li>`
    if (b.type === 'quote') return `<blockquote>${b.content}</blockquote>`
    if (b.type === 'divider') return `<hr>`
    if (b.type === 'checkbox') return `<p>${b.checked ? '☑' : '☐'} ${b.content}</p>`
    if (b.type === 'table') return `<table border="1">${b.cells.map(r => `<tr>${r.map(c => `<td style="background:${c.bg||'none'};color:${c.color||'inherit'};padding:6px 10px">${c.content}</td>`).join('')}</tr>`).join('')}</table>`
    return `<p>${b.content}</p>`
  }).join('\n') || ''
  w.document.write(`<!DOCTYPE html><html><head><title>${note.title}</title>
  <style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 20px}h1,h2{font-family:'Playfair Display',serif}table{border-collapse:collapse;width:100%}blockquote{border-left:3px solid #C45C26;padding-left:16px;color:#57534E;font-style:italic}@media print{body{margin:0}}</style>
  </head><body><h1>${note.title}</h1>${html}<script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
  w.document.close()
}

const formatDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const useIsMobile = () => {
  const [v, setV] = useState(() => window.innerWidth < 768)
  useEffect(() => { const fn = () => setV(window.innerWidth < 768); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn) }, [])
  return v
}

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const CELL_COLORS = [
  { label: 'Aucune', bg: null, color: null },
  { label: 'En-tête', bg: '#1C1917', color: '#F7F3EC' },
  { label: 'Rouge', bg: '#fee2e2', color: '#991b1b' },
  { label: 'Orange', bg: '#ffedd5', color: '#9a3412' },
  { label: 'Jaune', bg: '#fef9c3', color: '#713f12' },
  { label: 'Vert', bg: '#dcfce7', color: '#166534' },
  { label: 'Bleu', bg: '#dbeafe', color: '#1e40af' },
  { label: 'Violet', bg: '#f3e8ff', color: '#6b21a8' },
  { label: 'Gris', bg: '#f3f4f6', color: '#374151' },
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
  const c = tagMap[tag]
  return dark ? { bg: c.bgD, text: c.textD } : { bg: c.bg, text: c.text }
}

// ─── Note de bienvenue ────────────────────────────────────────────────────────

const WELCOME_NOTE = {
  id: 1, title: 'Bienvenue dans NoteFlow ✦', pinned: true, color: null, tags: ['guide'],
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
  blocks: [
    { id: 'w1', type: 'heading1', content: 'Bienvenue dans NoteFlow ✦' },
    { id: 'w2', type: 'paragraph', content: 'NoteFlow est votre espace de notes simple, rapide et 100% local. Pas besoin d\'apprendre quoi que ce soit — cliquez et écrivez.' },
    { id: 'w3', type: 'heading2', content: '✎ Comment écrire' },
    { id: 'w4', type: 'paragraph', content: 'Cliquez n\'importe où pour écrire. Appuyez sur Entrée pour créer un nouveau paragraphe. Utilisez le bouton ⊕ pour ajouter d\'autres types de blocs.' },
    { id: 'w5', type: 'heading2', content: '☐ Liste de tâches interactive' },
    { id: 'w6', type: 'paragraph', content: 'Essayez de cocher les cases ci-dessous directement !' },
    { id: 'w7', type: 'checkbox', content: 'Cliquez sur cette case pour la cocher ✓', checked: false },
    { id: 'w8', type: 'checkbox', content: 'Cette tâche est déjà terminée', checked: true },
    { id: 'w9', type: 'checkbox', content: 'Ajoutez vos propres tâches', checked: false },
    { id: 'w10', type: 'heading2', content: '📊 Tableau interactif' },
    { id: 'w11', type: 'paragraph', content: 'Cliquez sur une cellule pour écrire. Survolez le tableau pour voir les boutons d\'ajout de lignes et colonnes. Clic droit sur une cellule pour changer sa couleur.' },
    { id: 'w12', type: 'table', cells: [
      [{ content: 'Fonctionnalité', bg: '#1C1917', color: '#F7F3EC' }, { content: 'Description', bg: '#1C1917', color: '#F7F3EC' }],
      [{ content: 'Blocs interactifs', bg: '#dcfce7', color: '#166534' }, { content: 'Cliquez pour éditer directement', bg: null, color: null }],
      [{ content: 'Cases à cocher', bg: '#dbeafe', color: '#1e40af' }, { content: 'Cochez sans ouvrir l\'éditeur', bg: null, color: null }],
      [{ content: 'Tableaux dynamiques', bg: '#ffedd5', color: '#9a3412' }, { content: 'Ajoutez lignes, colonnes, couleurs', bg: null, color: null }],
    ]},
    { id: 'w13', type: 'heading2', content: '💡 Types de blocs disponibles' },
    { id: 'w14', type: 'bullet', content: 'Titre principal (Grand titre)' },
    { id: 'w15', type: 'bullet', content: 'Titre secondaire (Titre moyen)' },
    { id: 'w16', type: 'bullet', content: 'Texte normal — paragraphe' },
    { id: 'w17', type: 'bullet', content: 'Liste à puces' },
    { id: 'w18', type: 'bullet', content: 'Liste numérotée' },
    { id: 'w19', type: 'bullet', content: 'Case à cocher' },
    { id: 'w20', type: 'bullet', content: 'Citation' },
    { id: 'w21', type: 'bullet', content: 'Tableau interactif' },
    { id: 'w22', type: 'bullet', content: 'Séparateur' },
    { id: 'w23', type: 'divider' },
    { id: 'w24', type: 'quote', content: 'La simplicité est la sophistication suprême. — Léonard de Vinci' },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS DE BLOCS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Bloc texte générique ─────────────────────────────────────────────────────

// ─── Case à cocher ────────────────────────────────────────────────────────────

function CheckboxBlock({ block, onChange, onKeyDown, onFocus, dark }) {
  const textRef = useRef()

  useEffect(() => {
    if (textRef.current && textRef.current.textContent !== block.content) {
      textRef.current.textContent = block.content
    }
  }, [block.id])

  return (
    <div className={`block block-checkbox${block.checked ? ' checked' : ''}`} onFocus={onFocus}>
      <button
        className="checkbox-btn"
        onClick={() => onChange(block.id, { checked: !block.checked })}
        type="button"
        aria-label={block.checked ? 'Décocher' : 'Cocher'}
      >
        {block.checked ? '✓' : ''}
      </button>
      <div
        ref={textRef}
        contentEditable
        suppressContentEditableWarning
        className={`checkbox-text${block.checked ? ' striked' : ''}`}
        onInput={() => onChange(block.id, { content: textRef.current.textContent })}
        onKeyDown={onKeyDown}
        data-placeholder="Tâche..."
      />
    </div>
  )
}

// ─── Tableau interactif ───────────────────────────────────────────────────────

function TableBlock({ block, onChange, dark }) {
  const [colorPicker, setColorPicker] = useState(null) // {row, col}
  const [hoverRow, setHoverRow] = useState(null)
  const [hoverCol, setHoverCol] = useState(null)

  const updateCell = (r, c, field, value) => {
    const cells = block.cells.map((row, ri) =>
      row.map((cell, ci) => ri === r && ci === c ? { ...cell, [field]: value } : cell)
    )
    onChange(block.id, { cells })
  }

  const addRow = () => {
    const cols = block.cells[0]?.length || 2
    onChange(block.id, { cells: [...block.cells, Array(cols).fill(0).map(() => ({ content: '', bg: null, color: null }))] })
  }

  const addCol = () => {
    onChange(block.id, { cells: block.cells.map(row => [...row, { content: '', bg: null, color: null }]) })
  }

  const deleteRow = (r) => {
    if (block.cells.length <= 1) return
    onChange(block.id, { cells: block.cells.filter((_, i) => i !== r) })
  }

  const deleteCol = (c) => {
    if (block.cells[0]?.length <= 1) return
    onChange(block.id, { cells: block.cells.map(row => row.filter((_, i) => i !== c)) })
  }

  const setCellColor = (r, c, color) => {
    updateCell(r, c, 'bg', color.bg)
    updateCell(r, c, 'color', color.color)
    setColorPicker(null)
  }

  return (
    <div className="block block-table-wrap">
      {colorPicker && (
        <div className="cell-color-picker" onClick={() => setColorPicker(null)}>
          <div className="cell-color-grid" onClick={e => e.stopPropagation()}>
            <div className="cell-color-title">Couleur de la cellule</div>
            {CELL_COLORS.map((c, i) => (
              <button key={i} className="cell-color-option"
                style={{ background: c.bg || (dark ? '#211e1b' : '#FDFAF6'), color: c.color || (dark ? '#EDE7DC' : '#1C1917'), border: '1px solid rgba(0,0,0,.1)' }}
                onClick={() => setCellColor(colorPicker.row, colorPicker.col, c)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="table-container">
        {/* Boutons supprimer colonne */}
        <div className="col-controls">
          <div style={{ width: 24 }} />
          {block.cells[0]?.map((_, ci) => (
            <div key={ci} className="col-control" style={{ flex: 1 }}>
              <button className="del-col-btn" onClick={() => deleteCol(ci)} title="Supprimer colonne">✕</button>
            </div>
          ))}
          <div style={{ width: 28 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* Boutons supprimer ligne */}
          <div className="row-controls">
            {block.cells.map((_, ri) => (
              <div key={ri} className="row-control">
                <button className="del-row-btn" onClick={() => deleteRow(ri)} title="Supprimer ligne">✕</button>
              </div>
            ))}
          </div>

          <table className="interactive-table">
            <tbody>
              {block.cells.map((row, ri) => (
                <tr key={ri} onMouseEnter={() => setHoverRow(ri)} onMouseLeave={() => setHoverRow(null)}>
                  {row.map((cell, ci) => (
                    <td key={ci}
                      style={{ background: cell.bg || '', color: cell.color || '', position: 'relative' }}
                      onMouseEnter={() => setHoverCol(ci)}
                      onMouseLeave={() => setHoverCol(null)}
                    >
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className="table-cell-input"
                        onInput={e => updateCell(ri, ci, 'content', e.currentTarget.textContent)}
                        onFocus={() => {}}
                        data-initial={cell.content}
                        ref={el => { if (el && el.textContent !== cell.content && document.activeElement !== el) el.textContent = cell.content }}
                      />
                      <button
                        className="cell-color-trigger"
                        onClick={() => setColorPicker(colorPicker?.row === ri && colorPicker?.col === ci ? null : { row: ri, col: ci })}
                        title="Couleur de la cellule"
                      >🎨</button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Ajouter colonne */}
          <button className="add-col-btn" onClick={addCol} title="Ajouter une colonne">＋</button>
        </div>

        {/* Ajouter ligne */}
        <div style={{ display: 'flex', marginLeft: 24 }}>
          <button className="add-row-btn" onClick={addRow}>＋ Ajouter une ligne</button>
        </div>
      </div>
    </div>
  )
}

// ─── Séparateur ───────────────────────────────────────────────────────────────

function DividerBlock({ block, onDelete }) {
  return (
    <div className="block block-divider-wrap">
      <hr className="block-divider" />
    </div>
  )
}

// ─── Menu d'ajout de bloc ─────────────────────────────────────────────────────

function AddBlockMenu({ onAdd, onClose }) {
  const items = [
    { type: 'paragraph', icon: '¶', label: 'Texte' },
    { type: 'heading1', icon: 'H1', label: 'Titre principal' },
    { type: 'heading2', icon: 'H2', label: 'Titre secondaire' },
    { type: 'bullet', icon: '•', label: 'Liste à puces' },
    { type: 'numbered', icon: '1.', label: 'Liste numérotée' },
    { type: 'checkbox', icon: '☐', label: 'Case à cocher' },
    { type: 'quote', icon: '❝', label: 'Citation' },
    { type: 'table', icon: '▦', label: 'Tableau' },
    { type: 'divider', icon: '—', label: 'Séparateur' },
  ]
  return (
    <div className="add-block-overlay" onClick={onClose}>
      <div className="add-block-menu" onClick={e => e.stopPropagation()}>
        <div className="add-block-title">Ajouter un bloc</div>
        {items.map(item => (
          <button key={item.type} className="add-block-item" onClick={() => { onAdd(item.type); onClose() }}>
            <span className="add-block-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const steps = [
    { icon: '📝', title: 'Bienvenue dans NoteFlow', desc: 'Prenez des notes facilement. Cliquez pour écrire, comme dans un document normal.' },
    { icon: '☐', title: 'Cases à cocher interactives', desc: 'Créez des listes de tâches et cochez-les directement, sans ouvrir d\'éditeur.' },
    { icon: '📊', title: 'Tableaux dynamiques', desc: 'Créez des tableaux, éditez les cellules, ajoutez des lignes/colonnes et colorez les cases.' },
    { icon: '🎨', title: 'Personnalisez tout', desc: 'Thème clair/sombre, couleur par note, tags, modèles prêts à l\'emploi.' },
  ]
  const cur = steps[step]
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-icon">{cur.icon}</div>
        <h2 className="onboarding-title">{cur.title}</h2>
        <p className="onboarding-desc">{cur.desc}</p>
        <div className="onboarding-dots">{steps.map((_, i) => <div key={i} className={`onboarding-dot${i === step ? ' active' : ''}`} />)}</div>
        <div className="onboarding-actions">
          {step < steps.length - 1
            ? <><button className="onboarding-skip" onClick={onDone}>Passer</button><button className="onboarding-next" onClick={() => setStep(step + 1)}>Suivant →</button></>
            : <button className="onboarding-next full" onClick={onDone}>Commencer ✦</button>}
        </div>
      </div>
    </div>
  )
}

// ─── Modèles ──────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: 'meeting', icon: '🤝', label: 'Réunion', title: 'Réunion — ', blocks: [
    { id: uid(), type: 'heading1', content: 'Réunion — [Sujet]' },
    { id: uid(), type: 'paragraph', content: `Date : ${new Date().toLocaleDateString('fr-FR')}` },
    { id: uid(), type: 'paragraph', content: 'Participants : ' },
    { id: uid(), type: 'heading2', content: 'Ordre du jour' },
    { id: uid(), type: 'numbered', content: 'Premier point' },
    { id: uid(), type: 'heading2', content: 'Notes' },
    { id: uid(), type: 'paragraph', content: '' },
    { id: uid(), type: 'heading2', content: 'Actions à suivre' },
    { id: uid(), type: 'checkbox', content: '', checked: false },
    { id: uid(), type: 'checkbox', content: '', checked: false },
  ]},
  { id: 'journal', icon: '📖', label: 'Journal', title: `Journal — ${new Date().toLocaleDateString('fr-FR')}`, blocks: [
    { id: uid(), type: 'heading1', content: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) },
    { id: uid(), type: 'heading2', content: '😊 Comment je me sens' },
    { id: uid(), type: 'paragraph', content: '' },
    { id: uid(), type: 'heading2', content: '🌟 Ce qui s\'est bien passé' },
    { id: uid(), type: 'paragraph', content: '' },
    { id: uid(), type: 'heading2', content: '🎯 Demain' },
    { id: uid(), type: 'checkbox', content: '', checked: false },
  ]},
  { id: 'shopping', icon: '🛒', label: 'Courses', title: 'Liste de courses', blocks: [
    { id: uid(), type: 'heading1', content: '🛒 Liste de courses' },
    { id: uid(), type: 'heading2', content: 'Fruits & Légumes' },
    { id: uid(), type: 'checkbox', content: '', checked: false },
    { id: uid(), type: 'heading2', content: 'Produits frais' },
    { id: uid(), type: 'checkbox', content: '', checked: false },
    { id: uid(), type: 'heading2', content: 'Épicerie' },
    { id: uid(), type: 'checkbox', content: '', checked: false },
  ]},
  { id: 'project', icon: '🚀', label: 'Projet', title: 'Projet — ', blocks: [
    { id: uid(), type: 'heading1', content: '🚀 Nom du projet' },
    { id: uid(), type: 'heading2', content: 'Objectif' },
    { id: uid(), type: 'paragraph', content: '' },
    { id: uid(), type: 'heading2', content: 'Étapes' },
    { id: uid(), type: 'checkbox', content: 'Étape 1', checked: false },
    { id: uid(), type: 'checkbox', content: 'Étape 2', checked: false },
    { id: uid(), type: 'heading2', content: 'Notes' },
    { id: uid(), type: 'paragraph', content: '' },
  ]},
  { id: 'budget', icon: '💰', label: 'Budget', title: 'Budget — ', blocks: [
    { id: uid(), type: 'heading1', content: '💰 Budget' },
    { id: uid(), type: 'table', cells: [
      [{ content: 'Catégorie', bg: '#1C1917', color: '#F7F3EC' }, { content: 'Prévu', bg: '#1C1917', color: '#F7F3EC' }, { content: 'Réel', bg: '#1C1917', color: '#F7F3EC' }],
      [{ content: 'Loyer', bg: null, color: null }, { content: '', bg: null, color: null }, { content: '', bg: null, color: null }],
      [{ content: 'Courses', bg: null, color: null }, { content: '', bg: null, color: null }, { content: '', bg: null, color: null }],
      [{ content: 'Transports', bg: null, color: null }, { content: '', bg: null, color: null }, { content: '', bg: null, color: null }],
      [{ content: 'Total', bg: '#f3f4f6', color: '#374151' }, { content: '0 €', bg: '#f3f4f6', color: '#374151' }, { content: '0 €', bg: '#f3f4f6', color: '#374151' }],
    ]},
  ]},
  { id: 'recipe', icon: '🍽️', label: 'Recette', title: 'Recette — ', blocks: [
    { id: uid(), type: 'heading1', content: '🍽️ Nom de la recette' },
    { id: uid(), type: 'paragraph', content: 'Pour : personnes · Temps : min' },
    { id: uid(), type: 'heading2', content: 'Ingrédients' },
    { id: uid(), type: 'checkbox', content: '', checked: false },
    { id: uid(), type: 'heading2', content: 'Préparation' },
    { id: uid(), type: 'numbered', content: '' },
  ]},
]

function TemplatesModal({ onSelect, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>📋 Choisir un modèle</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="templates-grid">
          {TEMPLATES.map(t => (
            <button key={t.id} className="template-card" onClick={() => onSelect(t)}>
              <span className="template-icon">{t.icon}</span>
              <span className="template-label">{t.label}</span>
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
            <button key={c.id ?? 'none'} className={`color-swatch${currentColor === c.id ? ' selected' : ''}`}
              style={{ background: (dark ? c.dark : c.light) || (dark ? '#211e1b' : '#F7F3EC') }}
              onClick={() => onSelect(c.id)}>
              {currentColor === c.id && '✓'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÉDITEUR DE BLOCS
// ═══════════════════════════════════════════════════════════════════════════════

function BlockEditor({ blocks, onChange, dark, noteColor }) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [addAfterIndex, setAddAfterIndex] = useState(null)
  const [focusedBlockId, setFocusedBlockId] = useState(null)
  const blockRefs = useRef({})

  const updateBlock = useCallback((id, changes) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...changes } : b))
  }, [blocks, onChange])

  const addBlock = (type, afterIndex = blocks.length - 1) => {
    const nb = createBlock(type)
    const newBlocks = [...blocks]
    newBlocks.splice(afterIndex + 1, 0, nb)
    onChange(newBlocks)
    setFocusedBlockId(nb.id)
    setTimeout(() => {
      const el = blockRefs.current[nb.id]
      if (el) { el.focus(); const range = document.createRange(); range.selectNodeContents(el); range.collapse(false); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range) }
    }, 50)
  }

  const deleteBlock = (id) => {
    if (blocks.length <= 1) return
    const idx = blocks.findIndex(b => b.id === id)
    onChange(blocks.filter(b => b.id !== id))
    const prevBlock = blocks[idx - 1] || blocks[idx + 1]
    if (prevBlock) setTimeout(() => { blockRefs.current[prevBlock.id]?.focus() }, 30)
  }

  const makeKeyHandler = (block, index) => (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // For checkboxes and bullets, add same type; otherwise paragraph
      const nextType = ['checkbox', 'bullet', 'numbered'].includes(block.type) ? block.type : 'paragraph'
      addBlock(nextType, index)
    }
    if (e.key === 'Backspace') {
      const el = blockRefs.current[block.id]
      const empty = !el || el.textContent === ''
      if (empty && blocks.length > 1) {
        e.preventDefault()
        deleteBlock(block.id)
      }
    }
    if (e.key === 'ArrowDown') {
      const next = blocks[index + 1]
      if (next) setTimeout(() => blockRefs.current[next.id]?.focus(), 0)
    }
    if (e.key === 'ArrowUp') {
      const prev = blocks[index - 1]
      if (prev) setTimeout(() => blockRefs.current[prev.id]?.focus(), 0)
    }
  }

  const bg = noteColor ? getNoteColor(noteColor, dark) : null

  return (
    <div className="block-editor" style={bg ? { background: bg } : {}}>
      {blocks.map((block, index) => (
        <div key={block.id} className={`block-row${focusedBlockId === block.id ? ' focused' : ''}`}>

          {/* Bouton ajouter entre blocs */}
          <button
            className="add-between-btn"
            onClick={() => { setAddAfterIndex(index); setShowAddMenu(true) }}
            title="Ajouter un bloc"
          >⊕</button>

          {/* Le bloc */}
          <div className="block-content">
            {block.type === 'divider' && <DividerBlock block={block} onDelete={() => deleteBlock(block.id)} />}
            {block.type === 'table' && <TableBlock block={block} onChange={updateBlock} dark={dark} />}
            {block.type === 'checkbox' && (
              <CheckboxBlock block={block} onChange={updateBlock}
                onKeyDown={makeKeyHandler(block, index)}
                onFocus={() => setFocusedBlockId(block.id)} dark={dark} />
            )}
            {['paragraph','heading1','heading2','bullet','numbered','quote'].includes(block.type) && (
              <TextBlock block={block} onChange={updateBlock}
                onKeyDown={makeKeyHandler(block, index)}
                onFocus={() => setFocusedBlockId(block.id)}
                setRef={el => { blockRefs.current[block.id] = el }}
                dark={dark} />
            )}
          </div>

          {/* Bouton supprimer bloc (hover) */}
          <button className="delete-block-btn" onClick={() => deleteBlock(block.id)} title="Supprimer">✕</button>
        </div>
      ))}

      {/* Bouton ajouter à la fin */}
      <button className="add-end-btn" onClick={() => { setAddAfterIndex(blocks.length - 1); setShowAddMenu(true) }}>
        ⊕ Ajouter un bloc
      </button>

      {showAddMenu && (
        <AddBlockMenu
          onAdd={(type) => addBlock(type, addAfterIndex ?? blocks.length - 1)}
          onClose={() => setShowAddMenu(false)}
        />
      )}
    </div>
  )
}

function TextBlock({ block, onChange, onKeyDown, onFocus, setRef }) {
  const ref = useRef()

  useEffect(() => {
    if (ref.current && ref.current.textContent !== block.content) {
      ref.current.textContent = block.content
    }
  }, [block.id])

  const cls = { heading1: 'block-h1', heading2: 'block-h2', paragraph: 'block-p', bullet: 'block-bullet', numbered: 'block-numbered', quote: 'block-quote' }[block.type] || 'block-p'
  const Tag = { heading1: 'h1', heading2: 'h2' }[block.type] || 'div'
  const placeholder = { heading1: 'Titre principal...', heading2: 'Titre secondaire...', paragraph: 'Écrivez quelque chose...', bullet: 'Élément de liste...', numbered: 'Élément numéroté...', quote: 'Citation...' }[block.type] || ''

  return (
    <Tag
      ref={el => { ref.current = el; if (setRef) setRef(el) }}
      contentEditable
      suppressContentEditableWarning
      className={`block ${cls}`}
      onInput={() => onChange(block.id, { content: ref.current?.textContent || '' })}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      data-placeholder={placeholder}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function SidebarContent({ filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, togglePin, setShowTemplates, sortBy, setSortBy, mobile = false }) {
  return (
    <>
      <div className="sidebar-header">
        <div className="logo-row">
          <div className="logo"><div className="logo-mark">N</div><div className="logo-text">Note<span>Flow</span></div></div>
          <button className="theme-toggle" onClick={() => setDark(d => !d)}>{dark ? '☀️' : '🌙'}</button>
        </div>
        <div className="search-bar"><span className="si">⌕</span><input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {allTags.length > 0 && <div className="tags-row">{allTags.map(t => <button key={t} className={`tag-filter${activeTag === t ? ' active' : ''}`} onClick={() => setActiveTag(activeTag === t ? null : t)}>#{t}</button>)}</div>}
        <div className="sort-row">
          {[['updated', 'Récent'], ['title', 'A-Z'], ['size', 'Taille']].map(([v, l]) => (
            <button key={v} className={`sort-btn${sortBy === v ? ' active' : ''}`} onClick={() => setSortBy(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="new-note-row">
        <button className="new-note-btn" onClick={() => createNote()}>＋ Note</button>
        <button className="template-btn" onClick={() => setShowTemplates(true)}>📋 Modèle</button>
      </div>
      <div className="note-list">
        {filtered.length === 0 && <div className="empty-list">Aucune note trouvée</div>}
        {filtered.map(note => (
          <div key={note.id} className={`note-item${note.id === selected?.id ? ' active' : ''}`} onClick={() => selectNote(note.id)}>
            <div className="note-item-body">
              <div className="note-item-title-row">
                {note.pinned && <span style={{ fontSize: 10 }}>📌</span>}
                <span className="note-item-title">{note.title || 'Sans titre'}</span>
              </div>
              <div className="note-item-date">{formatDate(note.updatedAt)}</div>
              {note.tags?.length > 0 && (
                <div className="note-item-tags">
                  {note.tags.slice(0, 3).map(t => { const c = getTagColor(t, dark); return <span key={t} className="note-tag" style={{ background: c.bg, color: c.text }}>#{t}</span> })}
                </div>
              )}
            </div>
            <div className="note-item-actions">
              <button className="note-pin-btn" onClick={e => { e.stopPropagation(); togglePin(note.id) }}>{note.pinned ? '📌' : '📍'}</button>
              <button className="note-delete" onClick={e => { e.stopPropagation(); deleteNote(note.id) }}>✕</button>
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
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('nf-dark') === 'true' } catch { return false } })
  const [showOnboarding, setShowOnboarding] = useState(() => { try { return !localStorage.getItem('nf-onboarded') } catch { return true } })
  const [notes, setNotes] = useState(() => { try { const s = localStorage.getItem('nf-notes'); return s ? JSON.parse(s).map(migrateNote) : [WELCOME_NOTE] } catch { return [WELCOME_NOTE] } })
  const [selectedId, setSelectedId] = useState(() => { try { const s = localStorage.getItem('nf-selected'); return s ? Number(s) : 1 } catch { return 1 } })
  const [mobileScreen, setMobileScreen] = useState('list')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [sortBy, setSortBy] = useState('updated')

  useEffect(() => { localStorage.setItem('nf-notes', JSON.stringify(notes)) }, [notes])
  useEffect(() => { localStorage.setItem('nf-selected', String(selectedId)) }, [selectedId])
  useEffect(() => { localStorage.setItem('nf-dark', dark) }, [dark])

  const finishOnboarding = () => { localStorage.setItem('nf-onboarded', 'true'); setShowOnboarding(false) }

  const selected = notes.find(n => n.id === selectedId)
  const allTags = [...new Set(notes.flatMap(n => n.tags || []))]

  const filtered = [...notes]
    .filter(n => n.title?.toLowerCase().includes(search.toLowerCase()) && (activeTag ? n.tags?.includes(activeTag) : true))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'size') return (b.blocks?.length || 0) - (a.blocks?.length || 0)
      return new Date(b.updatedAt) - new Date(a.updatedAt)
    })

  const createNote = (template = null) => {
    const n = {
      id: Date.now(), title: template?.title || 'Nouvelle note',
      blocks: template?.blocks?.map(b => ({ ...b, id: uid() })) || [createBlock('paragraph')],
      tags: [], pinned: false, color: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    setNotes(prev => [n, ...prev]); setSelectedId(n.id)
    setShowTemplates(false)
    if (isMobile) setMobileScreen('edit')
  }

  const selectNote = (id) => { setSelectedId(id); if (isMobile) setMobileScreen('edit') }

  const deleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    setSelectedId(notes.filter(n => n.id !== id)[0]?.id ?? null)
    if (isMobile) setMobileScreen('list')
  }

  const updateBlocks = useCallback((blocks) => {
    setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, blocks, updatedAt: new Date().toISOString() } : n))
  }, [selectedId])

  const updateField = (field, value) => {
    setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, [field]: value, updatedAt: new Date().toISOString() } : n))
  }

  const togglePin = (id) => setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))

  const addTag = (tag) => {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!clean || selected?.tags?.includes(clean)) return
    updateField('tags', [...(selected?.tags || []), clean])
    setTagInput(''); setShowTagInput(false)
  }
  const removeTag = (tag) => updateField('tags', selected.tags.filter(t => t !== tag))

  const wordCount = selected?.blocks?.reduce((acc, b) => acc + (b.content?.trim().split(/\s+/).filter(Boolean).length || 0), 0) || 0

  const sidebarProps = { filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, togglePin, setShowTemplates, sortBy, setSortBy }

  return (
    <>
      <style>{CSS(dark)}</style>
      {showOnboarding && <Onboarding onDone={finishOnboarding} />}
      {showTemplates && <TemplatesModal onSelect={t => createNote(t)} onClose={() => setShowTemplates(false)} />}
      {showColorPicker && selected && <ColorPickerModal currentColor={selected.color} onSelect={c => { updateField('color', c); setShowColorPicker(false) }} onClose={() => setShowColorPicker(false)} dark={dark} />}

      {isMobile ? (
        <div className="mobile-app">
          {mobileScreen === 'list' && (
            <div className="mobile-screen">
              <SidebarContent {...sidebarProps} mobile />
            </div>
          )}
          {mobileScreen === 'edit' && selected && (
            <div className="mobile-screen">
              <div className="mobile-header">
                <button className="mobile-icon-btn" onClick={() => setMobileScreen('list')}>←</button>
                <input className="mobile-title-input" value={selected.title} onChange={e => updateField('title', e.target.value)} placeholder="Titre..." />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="mobile-icon-btn small" onClick={() => shareNote(selected)}>📤</button>
                  <button className="mobile-icon-btn small" onClick={() => printNote(selected)}>🖨️</button>
                  <button className="mobile-icon-btn small" onClick={() => setShowColorPicker(true)}>🎨</button>
                  <button className="mobile-icon-btn small" onClick={() => setDark(d => !d)}>{dark ? '☀️' : '🌙'}</button>
                </div>
              </div>
              <div className="mobile-tags">
                {selected.tags?.map(t => { const c = getTagColor(t, dark); return <span key={t} className="note-tag-pill" style={{ background: c.bg, color: c.text }}>#{t}<button className="tag-remove" onClick={() => removeTag(t)}>✕</button></span> })}
                {showTagInput ? <input className="tag-input-inline" autoFocus value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTag(tagInput); if (e.key === 'Escape') { setShowTagInput(false); setTagInput('') } }} onBlur={() => { if (tagInput) addTag(tagInput); else setShowTagInput(false) }} placeholder="tag" /> : <button className="add-tag-btn" onClick={() => setShowTagInput(true)}>+ tag</button>}
              </div>
              <div className="mobile-editor-wrap">
                <input className="note-title-input" value={selected.title} onChange={e => updateField('title', e.target.value)} placeholder="Titre de la note..." />
                <BlockEditor blocks={selected.blocks || []} onChange={updateBlocks} dark={dark} noteColor={selected.color} />
              </div>
              <div className="mobile-status"><span><span className="status-dot" />Sauvegardé</span><span>{wordCount} mots</span></div>
            </div>
          )}
        </div>
      ) : (
        <div className="app">
          <aside className={`sidebar${sidebarOpen ? ' closed' : ''}`}>
            <SidebarContent {...sidebarProps} />
          </aside>
          <main className="main">
            {selected ? (
              <>
                <div className="toolbar">
                  <button className="toggle-sidebar" onClick={() => setSidebarOpen(v => !v)}>☰</button>
                  <input className="title-input" value={selected.title} onChange={e => updateField('title', e.target.value)} placeholder="Titre de la note..." />
                  <div className="toolbar-actions">
                    <button className="tool-action-btn" onClick={() => togglePin(selected.id)} title={selected.pinned ? 'Désépingler' : 'Épingler'}>{selected.pinned ? '📌' : '📍'}</button>
                    <button className="tool-action-btn" onClick={() => setShowColorPicker(true)} title="Couleur">🎨</button>
                    <button className="tool-action-btn" onClick={() => shareNote(selected)} title="Partager">📤</button>
                    <button className="tool-action-btn" onClick={() => printNote(selected)} title="Imprimer">🖨️</button>
                    <button className="tool-action-btn" onClick={() => exportNote(selected)} title="Exporter">⬇</button>
                  </div>
                </div>
                <div className="tag-manager">
                  <span className="tag-label">tags :</span>
                  {selected.tags?.map(t => { const c = getTagColor(t, dark); return <span key={t} className="note-tag-pill" style={{ background: c.bg, color: c.text }}>#{t}<button className="tag-remove" onClick={() => removeTag(t)}>✕</button></span> })}
                  {showTagInput ? <input className="tag-input-inline" autoFocus value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTag(tagInput); if (e.key === 'Escape') { setShowTagInput(false); setTagInput('') } }} onBlur={() => { if (tagInput) addTag(tagInput); else setShowTagInput(false) }} placeholder="nouveau-tag" /> : <button className="add-tag-btn" onClick={() => setShowTagInput(true)}>+ tag</button>}
                </div>
                <div className="editor-scroll">
                  <div className="editor-inner">
                    <input className="note-title-input" value={selected.title} onChange={e => updateField('title', e.target.value)} placeholder="Titre de la note..." />
                    <BlockEditor blocks={selected.blocks || []} onChange={updateBlocks} dark={dark} noteColor={selected.color} />
                  </div>
                </div>
                <div className="status-bar">
                  <span><span className="status-dot" />Sauvegardé</span>
                  <span>{wordCount} mots</span>
                  {selected.pinned && <span>📌 Épinglée</span>}
                  <span style={{ marginLeft: 'auto' }}>Modifié le {formatDate(selected.updatedAt)}</span>
                </div>
              </>
            ) : (
              <div className="no-note">
                <div className="no-note-icon">📝</div>
                <p>Sélectionnez ou créez une note</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button className="new-note-btn" onClick={() => createNote()}>+ Note</button>
                  <button className="template-btn" onClick={() => setShowTemplates(true)}>📋 Modèle</button>
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
  --cream:${dark ? '#1a1714' : '#F7F3EC'};
  --cream-dark:${dark ? '#141210' : '#EDE7DC'};
  --ink:${dark ? '#EDE7DC' : '#1C1917'};
  --ink-light:${dark ? '#A8A29E' : '#57534E'};
  --ink-muted:${dark ? '#6B6560' : '#A8A29E'};
  --accent:#C45C26;
  --accent-light:${dark ? '#3a1f10' : '#F5E6DC'};
  --accent-hover:#A34A1E;
  --border:${dark ? '#2e2a26' : '#D6CFC6'};
  --white:${dark ? '#211e1b' : '#FDFAF6'};
}

/* ── Onboarding ── */
.onboarding-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.onboarding-card{background:var(--white);border-radius:20px;padding:40px 32px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)}
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

/* ── Modals ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px}
.modal-card{background:var(--white);border-radius:16px;padding:24px;max-width:500px;width:100%;box-shadow:0 16px 48px rgba(0,0,0,.25);max-height:90vh;overflow-y:auto}
.modal-card.small{max-width:340px}
.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.modal-header h3{font-family:'Playfair Display',serif;font-size:18px;color:var(--ink)}
.modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--ink-muted);padding:4px 8px;border-radius:6px}
.modal-close:hover{background:var(--cream)}
.templates-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.template-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 10px;border:1px solid var(--border);border-radius:12px;background:var(--cream);cursor:pointer;transition:all .15s}
.template-card:hover{border-color:var(--accent);background:var(--accent-light);transform:translateY(-2px)}
.template-icon{font-size:26px}
.template-label{font-size:12px;color:var(--ink-light);font-family:'Lora',serif}
.color-grid{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;padding:8px 0}
.color-swatch{width:48px;height:48px;border-radius:50%;cursor:pointer;border:2px solid transparent;display:flex;align-items:center;justify-content:center;font-size:18px;transition:transform .15s}
.color-swatch:hover{transform:scale(1.1)}
.color-swatch.selected{border-color:var(--accent)}

/* ── Add block menu ── */
.add-block-overlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3)}
.add-block-menu{background:var(--white);border-radius:14px;padding:12px;box-shadow:0 12px 40px rgba(0,0,0,.2);min-width:200px}
.add-block-title{font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;padding:4px 8px 10px;text-transform:uppercase;letter-spacing:.5px}
.add-block-item{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:none;background:none;cursor:pointer;border-radius:8px;text-align:left;font-family:'Lora',serif;font-size:14px;color:var(--ink);transition:background .1s}
.add-block-item:hover{background:var(--accent-light)}
.add-block-icon{width:28px;height:28px;border-radius:6px;background:var(--cream-dark);display:flex;align-items:center;justify-content:center;font-size:13px;font-family:'JetBrains Mono',monospace;color:var(--ink-light);flex-shrink:0}

/* ── Block editor ── */
.block-editor{min-height:100%;padding:0 0 80px;transition:background .2s}
.note-title-input{width:100%;border:none;background:transparent;font-family:'Playfair Display',serif;font-size:28px;font-weight:600;color:var(--ink);outline:none;padding:8px 0 4px;margin-bottom:8px;border-bottom:1px solid var(--border)}
.note-title-input::placeholder{color:var(--ink-muted)}
.block-row{display:flex;align-items:flex-start;gap:6px;position:relative;border-radius:6px;padding:1px 0}
.block-row:hover .add-between-btn,.block-row:hover .delete-block-btn{opacity:1}
.add-between-btn{opacity:0;background:none;border:none;cursor:pointer;font-size:16px;color:var(--ink-muted);padding:2px 4px;border-radius:6px;flex-shrink:0;transition:all .15s;line-height:1;margin-top:4px}
.add-between-btn:hover{color:var(--accent);background:var(--accent-light)}
.block-content{flex:1;min-width:0}
.delete-block-btn{opacity:0;background:none;border:none;cursor:pointer;font-size:12px;color:var(--ink-muted);padding:4px 6px;border-radius:6px;flex-shrink:0;transition:all .15s;margin-top:4px}
.delete-block-btn:hover{color:#B01A1A;background:#FEF0F0}
.add-end-btn{display:flex;align-items:center;gap:8px;padding:12px 36px;background:none;border:none;cursor:pointer;font-family:'Lora',serif;font-size:13px;color:var(--ink-muted);border-radius:8px;transition:all .15s;width:100%}
.add-end-btn:hover{color:var(--accent);background:var(--accent-light)}

/* ── Blocs texte ── */
.block{outline:none;width:100%;min-height:1.5em;font-family:'Lora',serif;color:var(--ink);caret-color:var(--accent);transition:background .1s;padding:3px 6px;border-radius:4px;line-height:1.7}
.block:focus{background:${dark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)'}}
.block:empty:before{content:attr(data-placeholder);color:var(--ink-muted);pointer-events:none}
.block-h1{font-family:'Playfair Display',serif;font-size:24px;font-weight:600;margin:12px 0 4px;line-height:1.3}
.block-h2{font-family:'Playfair Display',serif;font-size:18px;font-weight:600;margin:10px 0 4px;line-height:1.3}
.block-p{font-size:15px;margin:2px 0}
.block-bullet{font-size:15px;padding-left:20px;margin:1px 0;position:relative}
.block-bullet::before{content:'•';position:absolute;left:6px;color:var(--accent)}
.block-numbered{font-size:15px;padding-left:20px;margin:1px 0;position:relative}
.block-numbered::before{content:counter(list-item)'.';position:absolute;left:2px;color:var(--accent)}
.block-quote{font-size:15px;margin:6px 0;border-left:3px solid var(--accent);padding-left:14px;color:var(--ink-light);font-style:italic;border-radius:0 4px 4px 0}

/* ── Checkbox ── */
.block-checkbox{display:flex;align-items:flex-start;gap:10px;padding:3px 6px;border-radius:4px}
.block-checkbox:focus-within{background:${dark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)'}}
.checkbox-btn{width:20px;height:20px;border:2px solid var(--border);border-radius:5px;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;transition:all .15s;flex-shrink:0;margin-top:3px}
.block-checkbox.checked .checkbox-btn{background:var(--accent);border-color:var(--accent)}
.checkbox-text{flex:1;outline:none;font-family:'Lora',serif;font-size:15px;color:var(--ink);min-height:1.5em;line-height:1.7}
.checkbox-text:empty:before{content:attr(data-placeholder);color:var(--ink-muted);pointer-events:none}
.checkbox-text.striked{text-decoration:line-through;color:var(--ink-muted)}

/* ── Divider ── */
.block-divider-wrap{padding:12px 6px}
.block-divider{border:none;border-top:1px solid var(--border)}

/* ── Table ── */
.block-table-wrap{position:relative;margin:8px 0;overflow-x:auto}
.table-container{display:inline-block;min-width:100%}
.col-controls{display:flex;align-items:center;gap:0;padding-bottom:2px}
.col-control{display:flex;justify-content:center}
.del-col-btn{background:none;border:none;cursor:pointer;font-size:10px;color:var(--ink-muted);padding:2px 6px;border-radius:4px;opacity:0;transition:opacity .15s}
.block-table-wrap:hover .del-col-btn,.block-table-wrap:hover .del-row-btn{opacity:1}
.del-col-btn:hover,.del-row-btn:hover{color:#B01A1A;background:#FEF0F0}
.row-controls{display:flex;flex-direction:column;width:24px;flex-shrink:0}
.row-control{display:flex;align-items:center;justify-content:center;flex:1;min-height:36px}
.del-row-btn{background:none;border:none;cursor:pointer;font-size:10px;color:var(--ink-muted);padding:2px 4px;border-radius:4px;opacity:0;transition:opacity .15s}
.interactive-table{border-collapse:collapse;width:100%}
.interactive-table td{border:1px solid var(--border);padding:0;min-width:80px;position:relative;vertical-align:top}
.table-cell-input{width:100%;min-height:32px;padding:7px 10px;outline:none;font-family:'Lora',serif;font-size:14px;color:inherit;background:transparent;white-space:pre-wrap;word-break:break-word;line-height:1.5}
.table-cell-input:empty:before{content:attr(data-placeholder);color:var(--ink-muted)}
.cell-color-trigger{position:absolute;top:2px;right:2px;background:none;border:none;cursor:pointer;font-size:10px;opacity:0;transition:opacity .15s;padding:2px;border-radius:4px}
.interactive-table td:hover .cell-color-trigger{opacity:.7}
.cell-color-trigger:hover{opacity:1!important}
.add-col-btn{margin-left:4px;width:26px;align-self:stretch;background:none;border:1px dashed var(--border);border-radius:6px;cursor:pointer;color:var(--ink-muted);font-size:18px;transition:all .15s;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.add-col-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light)}
.add-row-btn{margin-top:4px;padding:6px 16px;background:none;border:1px dashed var(--border);border-radius:6px;cursor:pointer;color:var(--ink-muted);font-family:'Lora',serif;font-size:13px;transition:all .15s}
.add-row-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light)}
.cell-color-picker{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4)}
.cell-color-grid{background:var(--white);border-radius:12px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.2);min-width:220px}
.cell-color-title{font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px}
.cell-color-option{display:block;width:100%;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;font-family:'Lora',serif;font-size:14px;text-align:left;margin-bottom:4px;transition:opacity .1s}
.cell-color-option:hover{opacity:.8}

/* ── Shared ── */
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

/* ── Desktop ── */
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
.tool-action-btn{padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:14px;transition:all .15s;color:var(--ink-light)}
.tool-action-btn:hover{background:var(--accent-light);border-color:var(--accent)}
.tag-manager{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 20px;background:var(--cream);border-bottom:1px solid var(--border);flex-shrink:0}
.tag-label{font-size:11px;color:var(--ink-muted);font-style:italic}
.editor-scroll{flex:1;overflow-y:auto;background:var(--white)}
.editor-scroll::-webkit-scrollbar{width:5px}
.editor-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
.editor-inner{max-width:720px;margin:0 auto;padding:32px 40px;min-height:100%}
.status-bar{padding:5px 20px;background:var(--cream-dark);border-top:1px solid var(--border);display:flex;align-items:center;gap:14px;font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;flex-shrink:0}
.no-note{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:var(--ink-muted)}
.no-note-icon{font-size:48px;opacity:.3}

/* ── Mobile ── */
.mobile-app{height:100dvh;background:var(--cream);font-family:'Lora',serif;color:var(--ink);display:flex;flex-direction:column;overflow:hidden}
.mobile-screen{display:flex;flex-direction:column;height:100%;overflow:hidden}
.mobile-screen .sidebar-header{padding:12px 14px 10px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--white)}
.mobile-screen .new-note-row{padding:8px 14px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0}
.mobile-screen .note-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.mobile-header{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0;min-height:56px}
.mobile-icon-btn{min-width:38px;min-height:38px;border:1px solid var(--border);border-radius:10px;background:var(--cream);cursor:pointer;font-size:16px;color:var(--ink-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.mobile-icon-btn.small{min-width:34px;min-height:34px;font-size:13px}
.mobile-icon-btn:active{transform:scale(.92)}
.mobile-title-input{flex:1;border:none;background:transparent;font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:var(--ink);outline:none;min-width:0}
.mobile-tags{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:7px 14px;background:var(--cream);border-bottom:1px solid var(--border);flex-shrink:0}
.mobile-editor-wrap{flex:1;overflow-y:auto;padding:20px 16px 80px;background:var(--white);-webkit-overflow-scrolling:touch}
.mobile-status{display:flex;justify-content:space-between;padding:5px 14px;background:var(--cream-dark);border-top:1px solid var(--border);font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;flex-shrink:0}
.mobile-screen .note-item{padding:12px 12px 12px 14px;border-left:3px solid transparent;background:var(--white);cursor:pointer;transition:background .1s;display:flex;align-items:flex-start;gap:6px;border-bottom:1px solid var(--border)}
.mobile-screen .note-item:active{background:var(--accent-light)}
.mobile-screen .note-item.active{background:var(--accent-light);border-left-color:var(--accent)}
.mobile-screen .note-item-actions{opacity:1;flex-direction:row}
`
