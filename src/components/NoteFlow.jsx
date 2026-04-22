import { useState, useEffect, useCallback, useRef } from 'react'
import { marked } from 'marked'

// ─── Note de bienvenue ────────────────────────────────────────────────────────

const WELCOME_NOTE = {
  id: 1,
  title: 'Bienvenue dans NoteFlow ✦',
  pinned: true,
  color: null,
  content: `# Bienvenue dans NoteFlow ✦

NoteFlow est votre espace de notes **Markdown**, simple, rapide et 100% local.

---

## ✎ Écrire en Markdown

Le Markdown vous permet de mettre en forme vos textes facilement :

| Ce que vous tapez | Ce que vous obtenez |
|---|---|
| \`**texte**\` | **gras** |
| \`*texte*\` | *italique* |
| \`# Titre\` | Grand titre |
| \`## Titre\` | Titre moyen |
| \`- item\` | • Liste |
| \`- [ ] tâche\` | ☐ Case à cocher |
| \`\`code\`\`\` | \`code\` |

---

## 🛠️ Barre d'outils

Utilisez les boutons en haut de l'éditeur pour insérer rapidement du formatage sans mémoriser la syntaxe.

---

## 📋 Modèles

Cliquez sur **Modèles** pour démarrer rapidement avec un format prêt à l'emploi : réunion, journal, liste de courses...

---

## 🏷️ Tags & Organisation

- Ajoutez des **tags** à vos notes pour les retrouver facilement
- **Épinglez** vos notes importantes en haut de la liste
- **Colorez** vos notes pour les identifier d'un coup d'œil
- **Glissez-déposez** pour réorganiser l'ordre
- **Triez** par date, titre ou taille

---

## 💾 Sauvegarde

Toutes vos notes sont sauvegardées **automatiquement** dans votre appareil. Aucune connexion internet requise.

> Bonne écriture ! 🖊️
`,
  tags: ['guide'],
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
}

// ─── Modèles ──────────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'meeting', icon: '🤝', label: 'Réunion',
    title: 'Réunion — ',
    content: `# Réunion — [Sujet]

**Date :** ${new Date().toLocaleDateString('fr-FR')}
**Participants :** 

---

## Ordre du jour

1. 
2. 
3. 

## Notes

## Décisions prises

## Actions à suivre

- [ ] — Responsable :
- [ ] — Responsable :

## Prochaine réunion

`,
  },
  {
    id: 'journal', icon: '📖', label: 'Journal',
    title: `Journal — ${new Date().toLocaleDateString('fr-FR')}`,
    content: `# ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

## 😊 Comment je me sens

## 🌟 Ce qui s'est bien passé

## 💡 Ce que j'ai appris

## 🎯 Demain, je veux

`,
  },
  {
    id: 'shopping', icon: '🛒', label: 'Courses',
    title: 'Liste de courses',
    content: `# 🛒 Liste de courses

## Fruits & Légumes
- [ ] 
- [ ] 

## Produits frais
- [ ] 
- [ ] 

## Épicerie
- [ ] 
- [ ] 

## Autres
- [ ] 
- [ ] 
`,
  },
  {
    id: 'project', icon: '🚀', label: 'Projet',
    title: 'Projet — ',
    content: `# 🚀 [Nom du projet]

## Objectif

## Étapes

- [ ] Étape 1
- [ ] Étape 2
- [ ] Étape 3

## Ressources

## Notes & idées

## Délai

`,
  },
  {
    id: 'ideas', icon: '💡', label: 'Idées',
    title: 'Brainstorm — ',
    content: `# 💡 Brainstorm — [Sujet]

## Idées principales

- 
- 
- 

## À approfondir

## À écarter

## Prochaine étape

`,
  },
  {
    id: 'recipe', icon: '🍽️', label: 'Recette',
    title: 'Recette — ',
    content: `# 🍽️ [Nom de la recette]

**Pour :** personnes · **Temps :** min

---

## Ingrédients

- [ ] 
- [ ] 
- [ ] 

## Préparation

1. 
2. 
3. 

## Notes

`,
  },
]

// ─── Couleurs de notes ────────────────────────────────────────────────────────

const NOTE_COLORS = [
  { id: null,     label: 'Défaut',  light: null,      dark: null },
  { id: 'red',    label: 'Rouge',   light: '#FEF0F0', dark: '#3a0f0f' },
  { id: 'orange', label: 'Orange',  light: '#FFF4E6', dark: '#3a1f00' },
  { id: 'yellow', label: 'Jaune',   light: '#FFFBE6', dark: '#2e2500' },
  { id: 'green',  label: 'Vert',    light: '#F0F8E8', dark: '#0f2010' },
  { id: 'blue',   label: 'Bleu',    light: '#E6F0FF', dark: '#0f1f3a' },
  { id: 'purple', label: 'Violet',  light: '#F0EAF8', dark: '#1f0f3a' },
]

const getNoteColor = (colorId, dark) => {
  const c = NOTE_COLORS.find(c => c.id === colorId) || NOTE_COLORS[0]
  return dark ? c.dark : c.light
}

// ─── Tag colors ───────────────────────────────────────────────────────────────

const TAG_PALETTE = [
  { bg:'#E8F4F0',text:'#2D6A57',bgD:'#1a3330',textD:'#6fcfb5' },
  { bg:'#F0EAF8',text:'#5B3D8A',bgD:'#2a1f40',textD:'#b58fe8' },
  { bg:'#FFF0E6',text:'#B05A1A',bgD:'#3a2010',textD:'#f0a060' },
  { bg:'#E6F0FF',text:'#1A4DB0',bgD:'#0f2040',textD:'#6090f0' },
  { bg:'#FEF0F0',text:'#B01A1A',bgD:'#3a0f0f',textD:'#f06060' },
  { bg:'#F0F8E8',text:'#3D6A2D',bgD:'#1a2f10',textD:'#90d060' },
]
const tagMap = {}
const getTagColor = (tag, dark) => {
  if (!tagMap[tag]) tagMap[tag] = TAG_PALETTE[Object.keys(tagMap).length % TAG_PALETTE.length]
  const c = tagMap[tag]
  return dark ? { bg: c.bgD, text: c.textD } : { bg: c.bg, text: c.text }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })

const useIsMobile = () => {
  const [v, setV] = useState(() => window.innerWidth < 768)
  useEffect(() => { const fn = () => setV(window.innerWidth < 768); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn) }, [])
  return v
}

const insertText = (ta, before, after='', ph='') => {
  if (!ta) return ''
  const s = ta.selectionStart, e = ta.selectionEnd
  const sel = ta.value.substring(s, e) || ph
  const txt = ta.value.substring(0, s) + before + sel + after + ta.value.substring(e)
  setTimeout(() => { ta.focus(); ta.setSelectionRange(s + before.length + sel.length, s + before.length + sel.length) }, 0)
  return txt
}

const exportMd = (note) => {
  const blob = new Blob([note.content], { type:'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${note.title.replace(/[^a-z0-9]/gi,'_').toLowerCase()}.md`; a.click()
  URL.revokeObjectURL(url)
}

const shareNote = async (note) => {
  const text = `${note.title}\n\n${note.content}`
  if (navigator.share) {
    await navigator.share({ title: note.title, text }).catch(() => {})
  } else {
    await navigator.clipboard.writeText(text)
    alert('Note copiée dans le presse-papiers !')
  }
}

const printNote = (note) => {
  const w = window.open('', '_blank')
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${note.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Lora&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Lora', serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1C1917; }
    h1,h2,h3 { font-family: 'Playfair Display', serif; }
    code,pre { font-family: 'JetBrains Mono', monospace; background: #f5f0e8; padding: 2px 6px; border-radius: 4px; }
    pre { padding: 16px; }
    table { width:100%; border-collapse:collapse; }
    th { background:#1C1917; color:#F7F3EC; padding:8px 12px; text-align:left; }
    td { padding:8px 12px; border-bottom:1px solid #D6CFC6; }
    blockquote { border-left:3px solid #C45C26; padding-left:16px; color:#57534E; font-style:italic; }
    @media print { body { margin: 0; } }
  </style></head><body>
  ${marked.parse(note.content)}
  <script>window.onload=()=>{window.print();window.close()}<\/script>
  </body></html>`)
  w.document.close()
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════════════════════

function TemplatesModal({ onSelect, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 Choisir un modèle</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
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

function ColorPickerModal({ currentColor, onSelect, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card small" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎨 Couleur de la note</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="color-grid">
          {NOTE_COLORS.map(c => (
            <button key={c.id ?? 'none'} className={`color-swatch ${currentColor === c.id ? 'selected' : ''}`}
              style={{ background: c.light || '#F7F3EC', border: currentColor === c.id ? '2px solid #C45C26' : '2px solid transparent' }}
              onClick={() => onSelect(c.id)} title={c.label}>
              {currentColor === c.id && <span className="color-check">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TableBuilder({ onInsert, onClose }) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [headers, setHeaders] = useState(['Colonne 1', 'Colonne 2', 'Colonne 3'])
  const updateCols = (n) => {
    const nn = Math.max(1, Math.min(8, n)); setCols(nn)
    setHeaders(prev => { const h=[...prev]; while(h.length<nn) h.push(`Colonne ${h.length+1}`); return h.slice(0,nn) })
  }
  const generate = () => {
    const h = headers.map(hh=>hh||'Col').join(' | ')
    const sep = headers.map(()=>'---').join(' | ')
    const rowLines = Array(rows).fill(0).map((_,r)=>headers.map((_,c)=>`${r+1}-${c+1}`).join(' | '))
    onInsert(`| ${h} |\n| ${sep} |\n${rowLines.map(r=>`| ${r} |`).join('\n')}\n`)
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3>⊞ Constructeur de tableau</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="table-controls">
          {[['Lignes',rows,n=>setRows(Math.max(1,Math.min(10,n)))],['Colonnes',cols,updateCols]].map(([l,v,s])=>(
            <div key={l} className="table-control-group"><label>{l}</label>
              <div className="table-counter">
                <button onClick={()=>s(v-1)}>−</button><span>{v}</span><button onClick={()=>s(v+1)}>＋</button>
              </div>
            </div>
          ))}
        </div>
        <div className="table-headers"><label>En-têtes</label>
          <div className="table-header-inputs">{headers.map((h,i)=><input key={i} className="table-header-input" value={h} onChange={e=>{const a=[...headers];a[i]=e.target.value;setHeaders(a)}} placeholder={`Col ${i+1}`} />)}</div>
        </div>
        <div className="table-preview"><label>Aperçu</label>
          <div className="table-preview-wrap">
            <table><thead><tr>{headers.map((h,i)=><th key={i}>{h||`Col ${i+1}`}</th>)}</tr></thead>
              <tbody>{Array(rows).fill(0).map((_,r)=><tr key={r}>{headers.map((_,c)=><td key={c}>{r+1}-{c+1}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
        <button className="table-insert-btn" onClick={generate}>Insérer le tableau</button>
      </div>
    </div>
  )
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const steps = [
    { icon:'📝', title:'Bienvenue dans NoteFlow', desc:'Votre espace de notes Markdown, simple, rapide et 100% local. Aucune connexion requise.' },
    { icon:'✨', title:'Écrivez en Markdown', desc:"Utilisez la barre d'outils ou tapez directement. L'aperçu se met à jour en temps réel." },
    { icon:'📋', title:'Modèles prêts à l\'emploi', desc:'Démarrez rapidement avec nos modèles : réunion, journal, liste de courses, projet...' },
    { icon:'🎨', title:'Personnalisez tout', desc:'Thème clair/sombre, couleur par note, tags, épinglage. NoteFlow s\'adapte à vous.' },
  ]
  const cur = steps[step]
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-icon">{cur.icon}</div>
        <h2 className="onboarding-title">{cur.title}</h2>
        <p className="onboarding-desc">{cur.desc}</p>
        <div className="onboarding-dots">{steps.map((_,i)=><div key={i} className={`onboarding-dot${i===step?' active':''}`}/>)}</div>
        <div className="onboarding-actions">
          {step<steps.length-1 ? <>
            <button className="onboarding-skip" onClick={onDone}>Passer</button>
            <button className="onboarding-next" onClick={()=>setStep(step+1)}>Suivant →</button>
          </> : <button className="onboarding-next full" onClick={onDone}>Commencer ✦</button>}
        </div>
      </div>
    </div>
  )
}

// ─── Toolbar Markdown ─────────────────────────────────────────────────────────

function MarkdownToolbar({ textareaRef, onUpdate, onTableOpen }) {
  const apply = (b, a='', p='') => { const ta=textareaRef.current; if(ta) onUpdate(insertText(ta,b,a,p)) }
  const tools = [
    {l:'G',title:'Gras',fn:()=>apply('**','**','texte')},
    {l:'I',title:'Italique',fn:()=>apply('*','*','texte'),cls:'italic'},
    {l:'H1',title:'Titre 1',fn:()=>apply('# ','','Titre')},
    {l:'H2',title:'Titre 2',fn:()=>apply('## ','','Titre')},
    {l:'—',title:'Séparateur',fn:()=>apply('\n---\n')},
    {l:'• Liste',title:'Liste',fn:()=>apply('\n- ','','élément')},
    {l:'1. Liste',title:'Liste numérotée',fn:()=>apply('\n1. ','','élément')},
    {l:'☐',title:'Tâche',fn:()=>apply('\n- [ ] ','','tâche')},
    {l:'`Code`',title:'Code',fn:()=>apply('`','`','code'),cls:'mono'},
    {l:'❝',title:'Citation',fn:()=>apply('\n> ','','citation')},
    {l:'🔗',title:'Lien',fn:()=>apply('[','](url)','texte')},
    {l:'⊞ Tableau',title:'Tableau',fn:onTableOpen,cls:'special'},
  ]
  return (
    <div className="md-toolbar">
      {tools.map((t,i)=><button key={i} className={`md-tool-btn${t.cls?' '+t.cls:''}`} title={t.title} onClick={t.fn} type="button">{t.l}</button>)}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function NoteFlow() {
  const isMobile = useIsMobile()
  const [dark, setDark] = useState(()=>{ try{return localStorage.getItem('nf-dark')==='true'}catch{return false} })
  const [showOnboarding, setShowOnboarding] = useState(()=>{ try{return !localStorage.getItem('nf-onboarded')}catch{return true} })
  const [notes, setNotes] = useState(()=>{ try{const s=localStorage.getItem('nf-notes');return s?JSON.parse(s):[WELCOME_NOTE]}catch{return [WELCOME_NOTE]} })
  const [selectedId, setSelectedId] = useState(()=>{ try{const s=localStorage.getItem('nf-selected');return s?Number(s):1}catch{return 1} })
  const [mobileScreen, setMobileScreen] = useState('list')
  const [desktopView, setDesktopView] = useState('split')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [showTableBuilder, setShowTableBuilder] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [sortBy, setSortBy] = useState('updated') // updated | created | title | size
  const [dragOver, setDragOver] = useState(null)
  const dragItem = useRef(null)
  const textareaRef = useRef(null)

  useEffect(()=>{ localStorage.setItem('nf-notes', JSON.stringify(notes)) }, [notes])
  useEffect(()=>{ localStorage.setItem('nf-selected', String(selectedId)) }, [selectedId])
  useEffect(()=>{ localStorage.setItem('nf-dark', dark) }, [dark])

  const finishOnboarding = () => { localStorage.setItem('nf-onboarded','true'); setShowOnboarding(false) }

  const selected = notes.find(n=>n.id===selectedId)
  const allTags = [...new Set(notes.flatMap(n=>n.tags))]

  // Filtrage + tri
  const filtered = notes
    .filter(n=>n.title.toLowerCase().includes(search.toLowerCase()) && (activeTag?n.tags.includes(activeTag):true))
    .sort((a,b)=>{
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      if (sortBy==='title') return a.title.localeCompare(b.title)
      if (sortBy==='size') return b.content.length - a.content.length
      if (sortBy==='created') return new Date(b.createdAt)-new Date(a.createdAt)
      return new Date(b.updatedAt)-new Date(a.updatedAt)
    })

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const createNote = (template=null) => {
    const n = {
      id: Date.now(),
      title: template?.title || 'Nouvelle note',
      content: template?.content || '# Nouvelle note\n\nCommencez à écrire...',
      tags: [], pinned: false, color: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setNotes(prev=>[n,...prev]); setSelectedId(n.id)
    setShowTemplates(false)
    if (isMobile) setMobileScreen('edit')
  }

  const selectNote = (id) => { setSelectedId(id); if(isMobile) setMobileScreen('edit') }

  const deleteNote = (id) => {
    setNotes(prev=>prev.filter(n=>n.id!==id))
    const rem = notes.filter(n=>n.id!==id)
    setSelectedId(rem[0]?.id??null)
    if(isMobile) setMobileScreen('list')
  }

  const updateNote = useCallback((field, value) => {
    setNotes(prev=>prev.map(n=>n.id===selectedId?{...n,[field]:value,updatedAt:new Date().toISOString()}:n))
  }, [selectedId])

  const togglePin = (id, e) => {
    e?.stopPropagation()
    setNotes(prev=>prev.map(n=>n.id===id?{...n,pinned:!n.pinned}:n))
  }

  const addTag = (tag) => {
    const clean=tag.trim().toLowerCase().replace(/\s+/g,'-')
    if(!clean||selected?.tags.includes(clean)) return
    updateNote('tags',[...(selected?.tags||[]),clean]); setTagInput(''); setShowTagInput(false)
  }
  const removeTag = (tag) => updateNote('tags', selected.tags.filter(t=>t!==tag))

  const wordCount = selected?.content?.trim().split(/\s+/).filter(Boolean).length||0

  // Drag & drop
  const onDragStart = (id) => { dragItem.current=id }
  const onDragOver = (e,id) => { e.preventDefault(); setDragOver(id) }
  const onDrop = (targetId) => {
    if(!dragItem.current||dragItem.current===targetId){setDragOver(null);return}
    setNotes(prev=>{
      const arr=[...prev]
      const fi=arr.findIndex(n=>n.id===dragItem.current)
      const ti=arr.findIndex(n=>n.id===targetId)
      const [m]=arr.splice(fi,1); arr.splice(ti,0,m); return arr
    })
    setDragOver(null); dragItem.current=null
  }

  const insertTable = (md) => {
    const ta=textareaRef.current
    if(ta){const s=ta.selectionStart; updateNote('content',selected.content.substring(0,s)+'\n'+md+selected.content.substring(s))}
    else updateNote('content',(selected?.content||'')+'\n'+md)
    setShowTableBuilder(false)
  }

  const sp = { filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark,
    createNote, selectNote, deleteNote, updateNote, togglePin, addTag, removeTag,
    tagInput, setTagInput, showTagInput, setShowTagInput, wordCount,
    setShowTableBuilder, setShowTemplates, setShowColorPicker, textareaRef,
    dragOver, onDragStart, onDragOver, onDrop, sortBy, setSortBy,
    exportMd, shareNote, printNote }

  return (
    <>
      <style>{CSS(dark)}</style>
      {showOnboarding && <Onboarding onDone={finishOnboarding} />}
      {showTableBuilder && <TableBuilder onInsert={insertTable} onClose={()=>setShowTableBuilder(false)} />}
      {showTemplates && <TemplatesModal onSelect={t=>createNote(t)} onClose={()=>setShowTemplates(false)} />}
      {showColorPicker && selected && <ColorPickerModal currentColor={selected.color} onSelect={c=>{updateNote('color',c);setShowColorPicker(false)}} onClose={()=>setShowColorPicker(false)} />}
      {isMobile
        ? <MobileLayout {...sp} mobileScreen={mobileScreen} setMobileScreen={setMobileScreen} />
        : <DesktopLayout {...sp} desktopView={desktopView} setDesktopView={setDesktopView} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      }
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTE ITEM (réutilisé mobile + desktop)
// ═══════════════════════════════════════════════════════════════════════════════

function NoteItem({ note, active, dark, onSelect, onDelete, onPin, dragOver, onDragStart, onDragOver, onDrop, mobile=false }) {
  const bg = getNoteColor(note.color, dark)
  return (
    <div
      className={`${mobile?'mobile-note-item':'note-item'}${active?' active':''}${dragOver?' drag-over':''}`}
      style={bg?{background:bg}:{}}
      onClick={()=>onSelect(note.id)}
      draggable onDragStart={()=>onDragStart(note.id)} onDragOver={e=>onDragOver(e,note.id)} onDrop={()=>onDrop(note.id)}
    >
      {!mobile && <div className="drag-handle">⠿</div>}
      <div className={mobile?'mobile-note-main':'note-item-body'}>
        <div className="note-item-title-row">
          {note.pinned && <span className="pin-badge">📌</span>}
          <span className="note-item-title">{note.title||'Sans titre'}</span>
        </div>
        <div className="note-item-date">{formatDate(note.updatedAt)}</div>
        {note.tags.length>0 && (
          <div className="note-item-tags">
            {note.tags.slice(0,3).map(t=>{ const c=getTagColor(t,dark); return <span key={t} className="note-tag" style={{background:c.bg,color:c.text}}>#{t}</span> })}
          </div>
        )}
      </div>
      <div className="note-item-actions">
        <button className="note-pin-btn" onClick={e=>onPin(note.id,e)} title={note.pinned?'Désépingler':'Épingler'}>{note.pinned?'📌':'📍'}</button>
        <button className={mobile?'mobile-delete-btn':'note-delete'} onClick={e=>{e.stopPropagation();onDelete(note.id)}}>✕</button>
      </div>
    </div>
  )
}

// ─── Barre latérale partagée ──────────────────────────────────────────────────

function SidebarContent({ filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, togglePin, setShowTemplates, dragOver, onDragStart, onDragOver, onDrop, sortBy, setSortBy, mobile=false }) {
  return (
    <>
      <div className="sidebar-header">
        <div className="logo-row">
          <div className="logo"><div className="logo-mark">N</div><div className="logo-text">Note<span>Flow</span></div></div>
          <button className="theme-toggle" onClick={()=>setDark(d=>!d)}>{dark?'☀️':'🌙'}</button>
        </div>
        <div className="search-bar"><span className="search-icon">⌕</span><input placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className="sidebar-controls">
          {allTags.length>0 && <div className="tags-row">{allTags.map(t=><button key={t} className={`tag-filter${activeTag===t?' active':''}`} onClick={()=>setActiveTag(activeTag===t?null:t)}>#{t}</button>)}</div>}
          <div className="sort-row">
            <span className="sort-label">Trier :</span>
            {[['updated','Récent'],['title','A-Z'],['size','Taille'],['created','Création']].map(([v,l])=>(
              <button key={v} className={`sort-btn${sortBy===v?' active':''}`} onClick={()=>setSortBy(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="new-note-row">
        <button className="new-note-btn" onClick={()=>createNote()}>＋ Note</button>
        <button className="template-btn" onClick={()=>setShowTemplates(true)}>📋 Modèle</button>
      </div>

      <div className="note-list">
        {filtered.length===0 && <div className="empty-list">Aucune note trouvée</div>}
        {filtered.map(note=>(
          <NoteItem key={note.id} note={note} active={note.id===selected?.id} dark={dark}
            onSelect={selectNote} onDelete={deleteNote} onPin={togglePin}
            dragOver={dragOver===note.id} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
            mobile={mobile} />
        ))}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE
// ═══════════════════════════════════════════════════════════════════════════════

function MobileLayout({ filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, updateNote, togglePin, addTag, removeTag, tagInput, setTagInput, showTagInput, setShowTagInput, wordCount, setShowTableBuilder, setShowTemplates, setShowColorPicker, textareaRef, mobileScreen, setMobileScreen, dragOver, onDragStart, onDragOver, onDrop, sortBy, setSortBy }) {
  return (
    <div className="mobile-app">
      {mobileScreen==='list' && (
        <div className="mobile-screen">
          <SidebarContent {...{filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, togglePin, setShowTemplates, dragOver, onDragStart, onDragOver, onDrop, sortBy, setSortBy}} mobile />
        </div>
      )}

      {(mobileScreen==='edit'||mobileScreen==='preview') && selected && (
        <div className="mobile-screen">
          <div className="mobile-header">
            <button className="mobile-icon-btn" onClick={()=>setMobileScreen('list')}>←</button>
            <input className="mobile-title-input" value={selected.title} onChange={e=>updateNote('title',e.target.value)} placeholder="Titre..."/>
            <div style={{display:'flex',gap:5}}>
              <button className="mobile-icon-btn small" onClick={()=>shareNote(selected)}>📤</button>
              <button className="mobile-icon-btn small" onClick={()=>printNote(selected)}>🖨️</button>
              <button className="mobile-icon-btn small" onClick={()=>exportMd(selected)}>⬇</button>
              <button className="mobile-icon-btn small" onClick={()=>setShowColorPicker(true)}>🎨</button>
              <button className="mobile-icon-btn small" onClick={()=>setMobileScreen(mobileScreen==='edit'?'preview':'edit')}>{mobileScreen==='edit'?'👁':'✎'}</button>
            </div>
          </div>
          {mobileScreen==='edit' && <MarkdownToolbar textareaRef={textareaRef} onUpdate={v=>updateNote('content',v)} onTableOpen={()=>setShowTableBuilder(true)}/>}
          <div className="mobile-tags">
            {selected.tags.map(t=>{ const c=getTagColor(t,dark); return <span key={t} className="note-tag-pill" style={{background:c.bg,color:c.text}}>#{t}<button className="tag-remove" onClick={()=>removeTag(t)}>✕</button></span> })}
            {showTagInput?<input className="tag-input-inline" autoFocus value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addTag(tagInput);if(e.key==='Escape'){setShowTagInput(false);setTagInput('')}}} onBlur={()=>{if(tagInput)addTag(tagInput);else setShowTagInput(false)}} placeholder="tag"/>:<button className="add-tag-btn" onClick={()=>setShowTagInput(true)}>+ tag</button>}
          </div>
          <div className="mobile-content" style={selected.color?{background:getNoteColor(selected.color,dark)}:{}}>
            {mobileScreen==='edit'
              ?<textarea ref={textareaRef} className="mobile-editor" style={selected.color?{background:getNoteColor(selected.color,dark)}:{}} value={selected.content} onChange={e=>updateNote('content',e.target.value)} placeholder="Écrivez en Markdown..." spellCheck={false}/>
              :<div className="mobile-preview md-preview" dangerouslySetInnerHTML={{__html:marked.parse(selected.content||'')}}/>
            }
          </div>
          <div className="mobile-status"><span><span className="status-dot"/>Sauvegardé</span><span>{wordCount} mots · {selected.content.length} car.</span></div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESKTOP
// ═══════════════════════════════════════════════════════════════════════════════

function DesktopLayout({ filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, updateNote, togglePin, addTag, removeTag, tagInput, setTagInput, showTagInput, setShowTagInput, wordCount, setShowTableBuilder, setShowTemplates, setShowColorPicker, textareaRef, desktopView, setDesktopView, sidebarOpen, setSidebarOpen, dragOver, onDragStart, onDragOver, onDrop, sortBy, setSortBy }) {
  return (
    <div className="app">
      <aside className={`sidebar${sidebarOpen?' closed':''}`}>
        <SidebarContent {...{filtered, selected, search, setSearch, activeTag, setActiveTag, allTags, dark, setDark, createNote, selectNote, deleteNote, togglePin, setShowTemplates, dragOver, onDragStart, onDragOver, onDrop, sortBy, setSortBy}} />
      </aside>

      <main className="main">
        {selected ? (
          <>
            <div className="toolbar">
              <button className="toggle-sidebar" onClick={()=>setSidebarOpen(v=>!v)}>☰</button>
              <input className="title-input" value={selected.title} onChange={e=>updateNote('title',e.target.value)} placeholder="Titre..."/>
              <div className="toolbar-actions">
                <button className="tool-action-btn" onClick={()=>togglePin(selected.id)} title={selected.pinned?'Désépingler':'Épingler'}>{selected.pinned?'📌':'📍'}</button>
                <button className="tool-action-btn" onClick={()=>setShowColorPicker(true)} title="Couleur">🎨</button>
                <button className="tool-action-btn" onClick={()=>shareNote(selected)} title="Partager">📤</button>
                <button className="tool-action-btn" onClick={()=>printNote(selected)} title="Imprimer">🖨️</button>
                <button className="tool-action-btn" onClick={()=>exportMd(selected)} title="Exporter .md">⬇</button>
              </div>
              <div className="view-switcher">
                {['edit','split','preview'].map(v=><button key={v} className={`view-btn${desktopView===v?' active':''}`} onClick={()=>setDesktopView(v)}>{v==='edit'?'✎ Éditer':v==='split'?'⊟ Split':'👁 Aperçu'}</button>)}
              </div>
            </div>

            {desktopView!=='preview' && <MarkdownToolbar textareaRef={textareaRef} onUpdate={v=>updateNote('content',v)} onTableOpen={()=>setShowTableBuilder(true)}/>}

            <div className="tag-manager">
              <span className="tag-label">tags :</span>
              {selected.tags.map(t=>{ const c=getTagColor(t,dark); return <span key={t} className="note-tag-pill" style={{background:c.bg,color:c.text}}>#{t}<button className="tag-remove" onClick={()=>removeTag(t)}>✕</button></span> })}
              {showTagInput?<input className="tag-input-inline" autoFocus value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addTag(tagInput);if(e.key==='Escape'){setShowTagInput(false);setTagInput('')}}} onBlur={()=>{if(tagInput)addTag(tagInput);else setShowTagInput(false)}} placeholder="nouveau-tag"/>:<button className="add-tag-btn" onClick={()=>setShowTagInput(true)}>+ tag</button>}
            </div>

            <div className="editor-area" style={selected.color?{background:getNoteColor(selected.color,dark)}:{}}>
              {desktopView!=='preview' && (
                <div className="editor-pane" style={selected.color?{background:getNoteColor(selected.color,dark)}:{}}>
                  <textarea ref={textareaRef} className="md-editor" value={selected.content} onChange={e=>updateNote('content',e.target.value)} placeholder="Commencez à écrire en Markdown..." spellCheck={false}/>
                </div>
              )}
              {desktopView!=='edit' && (
                <div className={`preview-pane${desktopView==='preview'?' full':''}`} style={selected.color?{background:getNoteColor(selected.color,dark)}:{}}>
                  <div className="md-preview" dangerouslySetInnerHTML={{__html:marked.parse(selected.content||'')}}/>
                </div>
              )}
            </div>

            <div className="status-bar">
              <span><span className="status-dot"/>Sauvegardé</span>
              <span>{wordCount} mots</span><span>{selected.content.length} car.</span>
              {selected.pinned && <span>📌 Épinglée</span>}
              <span style={{marginLeft:'auto'}}>Modifié le {formatDate(selected.updatedAt)}</span>
            </div>
          </>
        ):(
          <div className="no-note">
            <div className="no-note-icon">📝</div>
            <p>Sélectionnez ou créez une note</p>
            <div style={{display:'flex',gap:10,marginTop:12}}>
              <button className="new-note-btn" onClick={()=>createNote()}>+ Note</button>
              <button className="template-btn" onClick={()=>{}}>📋 Modèle</button>
            </div>
          </div>
        )}
      </main>
    </div>
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
/* Onboarding */
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
/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px}
.modal-card{background:var(--white);border-radius:16px;padding:24px;max-width:500px;width:100%;box-shadow:0 16px 48px rgba(0,0,0,.25)}
.modal-card.small{max-width:360px}
.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.modal-header h3{font-family:'Playfair Display',serif;font-size:18px;color:var(--ink)}
.modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--ink-muted);padding:4px 8px;border-radius:6px}
.modal-close:hover{background:var(--cream)}
/* Templates */
.templates-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.template-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 12px;border:1px solid var(--border);border-radius:12px;background:var(--cream);cursor:pointer;transition:all .15s;font-family:'Lora',serif}
.template-card:hover{border-color:var(--accent);background:var(--accent-light);transform:translateY(-2px)}
.template-icon{font-size:28px}
.template-label{font-size:12px;color:var(--ink-light);font-weight:500}
/* Color picker */
.color-grid{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;padding:8px 0}
.color-swatch{width:48px;height:48px;border-radius:50%;cursor:pointer;transition:transform .15s;display:flex;align-items:center;justify-content:center;font-size:18px}
.color-swatch:hover{transform:scale(1.1)}
.color-check{font-size:20px}
/* Table builder */
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
/* Toolbar Markdown */
.md-toolbar{display:flex;flex-wrap:wrap;gap:4px;padding:8px 12px;background:var(--cream-dark);border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}
.md-tool-btn{padding:4px 8px;background:var(--white);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:11px;font-family:'Lora',serif;color:var(--ink-light);transition:all .1s;white-space:nowrap;min-height:28px}
.md-tool-btn:hover{background:var(--accent-light);border-color:var(--accent);color:var(--accent)}
.md-tool-btn:active{transform:scale(.95)}
.md-tool-btn.italic{font-style:italic}
.md-tool-btn.mono{font-family:'JetBrains Mono',monospace}
.md-tool-btn.special{background:var(--accent-light);border-color:var(--accent);color:var(--accent);font-weight:500}
/* Markdown preview */
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
/* Shared */
.note-tag-pill{display:flex;align-items:center;gap:4px;font-size:11px;font-family:'JetBrains Mono',monospace;padding:3px 8px;border-radius:20px}
.tag-remove{background:none;border:none;cursor:pointer;font-size:12px;padding:0;opacity:.6;color:inherit}
.tag-remove:hover{opacity:1}
.add-tag-btn{font-size:11px;padding:3px 8px;background:none;border:1px dashed var(--border);border-radius:20px;cursor:pointer;color:var(--ink-muted);font-family:'Lora',serif}
.add-tag-btn:hover{border-color:var(--accent);color:var(--accent)}
.tag-input-inline{font-size:11px;font-family:'JetBrains Mono',monospace;border:1px solid var(--accent);border-radius:20px;padding:3px 10px;outline:none;color:var(--ink);background:var(--white);width:100px}
.status-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#4CAF50;margin-right:5px}
.note-item-title-row{display:flex;align-items:center;gap:4px;margin-bottom:3px}
.pin-badge{font-size:11px;flex-shrink:0}
.note-item-title{font-family:'Playfair Display',serif;font-size:14px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.note-item-date{font-size:11px;color:var(--ink-muted);font-style:italic}
.note-item-tags{display:flex;gap:4px;margin-top:5px;flex-wrap:wrap}
.note-tag{font-size:10px;font-family:'JetBrains Mono',monospace;padding:2px 6px;border-radius:12px}
.search-bar{display:flex;align-items:center;gap:8px;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-bottom:10px}
.search-bar input{border:none;background:transparent;font-family:'Lora',serif;font-size:13px;color:var(--ink);width:100%;outline:none}
.search-bar input::placeholder{color:var(--ink-muted)}
.search-icon{color:var(--ink-muted);font-size:14px}
.tags-row{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}
.tag-filter{font-size:11px;font-family:'JetBrains Mono',monospace;padding:3px 8px;border-radius:20px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--ink-light);transition:all .15s}
.tag-filter:hover{border-color:var(--accent);color:var(--accent)}
.tag-filter.active{background:var(--ink);color:var(--cream);border-color:var(--ink)}
.sort-row{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.sort-label{font-size:11px;color:var(--ink-muted);font-style:italic;font-family:'Lora',serif}
.sort-btn{font-size:10px;font-family:'JetBrains Mono',monospace;padding:2px 7px;border-radius:20px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--ink-muted);transition:all .15s}
.sort-btn:hover{color:var(--accent);border-color:var(--accent)}
.sort-btn.active{background:var(--accent);color:white;border-color:var(--accent)}
.empty-list{text-align:center;padding:40px 20px;color:var(--ink-muted);font-size:13px;font-style:italic}
.logo{display:flex;align-items:center;gap:8px}
.logo-mark{width:28px;height:28px;background:var(--ink);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--cream);font-family:'Playfair Display',serif;font-size:14px;font-style:italic}
.logo-text{font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:var(--ink)}
.logo-text span{color:var(--accent)}
.drag-handle{color:var(--ink-muted);cursor:grab;font-size:14px;padding:0 3px;flex-shrink:0;opacity:.3;user-select:none;margin-top:2px}
.drag-handle:hover{opacity:1}
.drag-over{border-top:2px solid var(--accent)!important}
.note-item-actions{display:flex;flex-direction:column;gap:2px;flex-shrink:0;opacity:0;transition:opacity .15s}
.note-item:hover .note-item-actions{opacity:1}
.note-pin-btn{background:none;border:none;cursor:pointer;font-size:12px;padding:2px;border-radius:4px}
.note-pin-btn:hover{background:var(--cream-dark)}
/* Desktop */
.app{display:flex;height:100vh;background:var(--cream);font-family:'Lora',serif;color:var(--ink);overflow:hidden}
.sidebar{width:280px;min-width:280px;background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;transition:margin-left .3s ease}
.sidebar.closed{margin-left:-280px}
.sidebar-header{padding:18px 18px 12px;border-bottom:1px solid var(--border);flex-shrink:0}
.logo-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.theme-toggle{background:none;border:1px solid var(--border);border-radius:8px;padding:4px 8px;cursor:pointer;font-size:16px}
.theme-toggle:hover{background:var(--cream)}
.sidebar-controls{margin-top:4px}
.new-note-row{display:flex;gap:8px;padding:10px 18px;flex-shrink:0}
.new-note-btn{flex:1;padding:9px;background:var(--accent);color:white;border:none;border-radius:8px;cursor:pointer;font-family:'Lora',serif;font-size:13px;font-weight:500;transition:background .15s}
.new-note-btn:hover{background:var(--accent-hover)}
.template-btn{flex:1;padding:9px;background:var(--cream);color:var(--ink-light);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-family:'Lora',serif;font-size:12px;transition:all .15s}
.template-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light)}
.note-list{flex:1;overflow-y:auto;padding:6px 0}
.note-list::-webkit-scrollbar{width:3px}
.note-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
.note-item{padding:10px 10px 10px 8px;cursor:pointer;border-left:3px solid transparent;transition:all .15s;display:flex;align-items:flex-start;gap:4px}
.note-item:hover{background:var(--cream)}
.note-item.active{background:var(--accent-light);border-left-color:var(--accent)}
.note-item-body{flex:1;min-width:0}
.note-delete{background:none;border:none;cursor:pointer;color:var(--ink-muted);font-size:13px;padding:3px;border-radius:4px;display:block}
.note-delete:hover{color:#B01A1A;background:#FEF0F0}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.toolbar{display:flex;align-items:center;gap:8px;padding:11px 18px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0}
.toggle-sidebar{background:none;border:1px solid var(--border);border-radius:6px;padding:6px 10px;cursor:pointer;font-size:16px;color:var(--ink-light);transition:all .15s;flex-shrink:0}
.toggle-sidebar:hover{background:var(--cream)}
.title-input{flex:1;border:none;background:transparent;font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:var(--ink);outline:none;min-width:0}
.toolbar-actions{display:flex;gap:4px;flex-shrink:0}
.tool-action-btn{padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:14px;transition:all .15s;color:var(--ink-light)}
.tool-action-btn:hover{background:var(--accent-light);border-color:var(--accent)}
.view-switcher{display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;flex-shrink:0}
.view-btn{padding:6px 10px;background:none;border:none;cursor:pointer;font-size:11px;font-family:'Lora',serif;color:var(--ink-light);transition:all .15s;border-right:1px solid var(--border);white-space:nowrap}
.view-btn:last-child{border-right:none}
.view-btn.active{background:var(--ink);color:var(--cream)}
.view-btn:not(.active):hover{background:var(--cream)}
.tag-manager{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:7px 18px;background:var(--cream);border-bottom:1px solid var(--border);flex-shrink:0}
.tag-label{font-size:11px;color:var(--ink-muted);font-style:italic}
.editor-area{flex:1;display:flex;overflow:hidden;transition:background .2s}
.editor-pane,.preview-pane{flex:1;overflow-y:auto;padding:28px 36px;transition:background .2s}
.editor-pane{background:var(--white);border-right:1px solid var(--border)}
.preview-pane{background:var(--cream)}
.preview-pane.full{background:var(--white)}
textarea.md-editor{width:100%;height:100%;border:none;outline:none;resize:none;font-family:'JetBrains Mono',monospace;font-size:14px;line-height:1.8;color:var(--ink);background:transparent}
.status-bar{padding:5px 18px;background:var(--cream-dark);border-top:1px solid var(--border);display:flex;align-items:center;gap:14px;font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;flex-shrink:0}
.no-note{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:var(--ink-muted)}
.no-note-icon{font-size:48px;opacity:.3}
/* Mobile */
.mobile-app{height:100dvh;background:var(--cream);font-family:'Lora',serif;color:var(--ink);display:flex;flex-direction:column;overflow:hidden}
.mobile-screen{display:flex;flex-direction:column;height:100%;overflow:hidden}
.mobile-header{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0;min-height:58px}
.mobile-icon-btn{min-width:40px;min-height:40px;border:1px solid var(--border);border-radius:10px;background:var(--cream);cursor:pointer;font-size:16px;color:var(--ink-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.mobile-icon-btn.small{min-width:34px;min-height:34px;font-size:13px}
.mobile-icon-btn:active{transform:scale(.92)}
.mobile-icon-btn.accent{background:var(--accent);color:white;border-color:var(--accent);font-size:20px}
.mobile-title-input{flex:1;border:none;background:transparent;font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:var(--ink);outline:none;min-width:0}
.mobile-search-wrap{padding:10px 14px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0}
.mobile-note-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.mobile-note-item{display:flex;align-items:center;padding:13px 14px;border-bottom:1px solid var(--border);background:var(--white);cursor:pointer;gap:8px;transition:background .1s}
.mobile-note-item:active{background:var(--accent-light)}
.mobile-note-main{flex:1;min-width:0}
.mobile-note-item .note-item-actions{opacity:1;flex-direction:row}
.mobile-delete-btn{min-width:34px;min-height:34px;border:none;background:none;cursor:pointer;color:var(--ink-muted);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mobile-delete-btn:active{background:#FEF0F0;color:#B01A1A}
.mobile-tags{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:7px 14px;background:var(--cream);border-bottom:1px solid var(--border);flex-shrink:0}
.mobile-content{flex:1;overflow:hidden;display:flex;min-height:0}
.mobile-editor{flex:1;width:100%;border:none;outline:none;resize:none;font-family:'JetBrains Mono',monospace;font-size:14px;line-height:1.8;color:var(--ink);background:var(--white);padding:14px}
.mobile-preview{flex:1;overflow-y:auto;padding:14px;background:var(--cream);-webkit-overflow-scrolling:touch}
.mobile-status{display:flex;justify-content:space-between;padding:5px 14px;background:var(--cream-dark);border-top:1px solid var(--border);font-size:11px;color:var(--ink-muted);font-family:'JetBrains Mono',monospace;flex-shrink:0}
/* Mobile sidebar-like list */
.mobile-screen .sidebar-header{padding:14px 14px 10px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--white)}
.mobile-screen .new-note-row{padding:8px 14px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0}
.mobile-screen .note-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
`
