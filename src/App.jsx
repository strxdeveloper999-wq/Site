import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Bot, Check, CheckSquare, ChevronDown, ChevronRight, CircleHelp,
  Code2, Copy, File, FileCode2, FilePlus2, Folder, FolderPlus, GitBranch,
  LayoutDashboard, LoaderCircle, Menu, MessageSquare, Moon, MoreHorizontal,
  PanelLeftClose, Play, Plus, RefreshCw, Send, Settings, ShieldCheck,
  Sparkles, Sun, Terminal, Trash2, X
} from "lucide-react";

const STORAGE_KEY = "code-studio-v1";
const starterFiles = () => [
  { id: crypto.randomUUID(), name: "index.html", language: "html", content: "<!doctype html>\n<html lang=\"pt-BR\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>Meu projeto</title>\n  </head>\n  <body>\n    <h1>Olá, mundo!</h1>\n  </body>\n</html>\n" },
  { id: crypto.randomUUID(), name: "style.css", language: "css", content: "body {\n  font-family: system-ui, sans-serif;\n  margin: 3rem;\n  color: #202435;\n}\n" },
  { id: crypto.randomUUID(), name: "README.md", language: "markdown", content: "# Meu projeto\n\nComece a construir algo incrível.\n" }
];
const initialProject = () => ({ id: crypto.randomUUID(), name: "Meu primeiro projeto", updatedAt: Date.now(), files: starterFiles(), tasks: [
  { id: crypto.randomUUID(), text: "Explorar o editor", done: true },
  { id: crypto.randomUUID(), text: "Personalizar o projeto", done: false }
] });
function loadState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (value?.projects?.length) return value;
  } catch {}
  const project = initialProject();
  return { projects: [project], activeProjectId: project.id, activeFileId: project.files[0].id, conversations: {}, theme: "dark" };
}
const uid = () => crypto.randomUUID();
const languageFor = (name) => ({ js:"javascript", jsx:"javascript", ts:"typescript", tsx:"typescript", py:"python", html:"html", css:"css", json:"json", md:"markdown", yml:"yaml", yaml:"yaml", sh:"shell" }[name.split(".").pop()?.toLowerCase()] || "text");
const prettyTime = (timestamp) => new Intl.DateTimeFormat("pt-BR", { hour:"2-digit", minute:"2-digit" }).format(timestamp);

export default function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [health, setHealth] = useState({ loading: true, ok: false, aiConfigured: false });
  const [toast, setToast] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalText, setTerminalText] = useState("Code Studio terminal de demonstração\nExecução de comandos arbitrários está desativada por segurança.\n");
  const [terminalInput, setTerminalInput] = useState("");
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(false);
  const [light, setLight] = useState(false);
  const editorRef = useRef(null);
  const chatEndRef = useRef(null);

  const project = state.projects.find(p => p.id === state.activeProjectId) || state.projects[0];
  const file = project?.files.find(f => f.id === state.activeFileId) || project?.files[0];
  const messages = state.conversations[project?.id] || [];
  const completedTasks = project?.tasks.filter(t => t.done).length || 0;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(data => setHealth({ loading:false, ok:!!data.ok, aiConfigured:!!data.aiConfigured }))
      .catch(() => setHealth({ loading:false, ok:false, aiConfigured:false }));
  }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages.length, chatLoading]);
  useEffect(() => { document.documentElement.dataset.theme = light ? "light" : "dark"; }, [light]);

  function notify(message) { setToast(message); window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => setToast(""), 2800); }
  function updateProject(updater) {
    setState(prev => ({ ...prev, projects: prev.projects.map(p => p.id === project.id ? { ...updater(p), updatedAt:Date.now() } : p) }));
  }
  function updateFile(content) { updateProject(p => ({ ...p, files:p.files.map(f => f.id === file.id ? { ...f, content } : f) })); }
  function updateConversation(next) { setState(prev => ({ ...prev, conversations:{ ...prev.conversations, [project.id]:next } })); }

  async function sendMessage(text = prompt) {
    const content = text.trim();
    if (!content || chatLoading) return;
    const next = [...messages, { id:uid(), role:"user", content, createdAt:Date.now() }];
    updateConversation(next); setPrompt(""); setView("chat"); setChatLoading(true);
    try {
      const context = project.files.map(f => `FILE: ${f.name}\n${f.content}`).join("\n\n").slice(0,12000);
      const response = await fetch("/api/chat", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ messages:next.slice(-20).map(m => ({ role:m.role, content:m.content })), projectContext:context })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao consultar a IA.");
      updateConversation([...next, { id:uid(), role:"assistant", content:data.reply, createdAt:Date.now() }]);
    } catch (error) {
      updateConversation([...next, { id:uid(), role:"assistant", content:`Não consegui consultar a IA. ${error.message}\n\nConfira a configuração do servidor e o endpoint do provedor em .env.`, createdAt:Date.now(), error:true }]);
    } finally { setChatLoading(false); }
  }

  function createProject() {
    const name = projectName.trim();
    if (!name) return;
    const p = { ...initialProject(), id:uid(), name, files:starterFiles(), tasks:[] };
    setState(prev => ({ ...prev, projects:[...prev.projects,p], activeProjectId:p.id, activeFileId:p.files[0].id }));
    setProjectName(""); setShowNewProject(false); setView("editor"); notify("Projeto criado.");
  }
  function createFile() {
    const name = newFileName.trim();
    if (!name || name.includes("/") || name.includes("\\") || name === "." || name === "..") return notify("Digite um nome de arquivo válido, sem pastas.");
    if (project.files.some(f => f.name === name)) return notify("Já existe um arquivo com esse nome.");
    const next = { id:uid(), name, language:languageFor(name), content:"" };
    updateProject(p => ({ ...p, files:[...p.files,next] }));
    setState(prev => ({ ...prev, activeFileId:next.id }));
    setNewFileName(""); setShowNewFile(false); setView("editor"); notify("Arquivo criado.");
  }
  function deleteFile(target) {
    if (project.files.length <= 1) return notify("O projeto precisa manter pelo menos um arquivo.");
    if (!confirm(`Excluir ${target.name}? Esta ação não pode ser desfeita.`)) return;
    updateProject(p => ({ ...p, files:p.files.filter(f => f.id !== target.id) }));
    if (file.id === target.id) setState(prev => ({ ...prev, activeFileId:project.files.find(f => f.id !== target.id).id }));
    notify("Arquivo removido.");
  }
  function addTask(e) {
    e.preventDefault(); if (!newTask.trim()) return;
    updateProject(p => ({ ...p, tasks:[...p.tasks,{ id:uid(), text:newTask.trim(), done:false }] }));
    setNewTask(""); notify("Tarefa adicionada.");
  }
  function downloadProject() {
    const payload = project.files.map(f => `===== ${f.name} =====\n${f.content}`).join("\n\n");
    const blob = new Blob([payload], { type:"text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${project.name.replace(/[^a-z0-9-_]/gi,"-")}-files.txt`; a.click(); URL.revokeObjectURL(url);
    notify("Arquivos exportados em um único arquivo de texto.");
  }
  function runChecks() {
    const issues = [];
    for (const f of project.files) {
      if (f.name.endsWith(".json")) { try { JSON.parse(f.content); } catch { issues.push(`${f.name}: JSON inválido — ${"verifique vírgulas, aspas e chaves."}`); } }
      if (f.name.endsWith(".html")) {
        if (!/<html[\s>]/i.test(f.content)) issues.push(`${f.name}: tag <html> não encontrada.`);
        if (!/<\/html>/i.test(f.content)) issues.push(`${f.name}: fechamento </html> não encontrado.`);
      }
      if (f.name.endsWith(".js") || f.name.endsWith(".jsx")) {
        if ((f.content.match(/\{/g)||[]).length !== (f.content.match(/\}/g)||[]).length) issues.push(`${f.name}: quantidade de chaves { } não corresponde.`);
      }
    }
    setTerminalText(`Verificação estática local — ${new Date().toLocaleString("pt-BR")}\nProjeto: ${project.name}\nArquivos verificados: ${project.files.length}\n\n${issues.length ? "Avisos encontrados:\n• "+issues.join("\n• ") : "Nenhum problema simples foi detectado."}\n\nIsto não substitui um compilador, testes automatizados ou execução isolada.`);
    setShowTerminal(true); notify(issues.length ? `${issues.length} aviso(s) encontrado(s).` : "Verificação básica concluída.");
  }
  function terminalCommand(e) {
    e.preventDefault(); const cmd = terminalInput.trim(); if (!cmd) return;
    const safeCommands = {
      help:"Comandos disponíveis: help, files, clear, check, time",
      files:project.files.map(f=>f.name).join("\n"),
      time:new Date().toLocaleString("pt-BR"),
      clear:"__CLEAR__",
      check:"__CHECK__"
    };
    setTerminalInput("");
    if (cmd === "clear") { setTerminalText(""); return; }
    if (cmd === "check") { runChecks(); return; }
    setTerminalText(prev => `${prev}\n$ ${cmd}\n${safeCommands[cmd] || "Comando não permitido. Este terminal é simulado e não executa comandos do sistema."}\n`);
  }
  const filteredFiles = useMemo(() => project.files.filter(f => f.name.toLowerCase().includes(search.toLowerCase())), [project.files,search]);
  const previewDoc = useMemo(() => {
    const html = project.files.find(f => f.name.endsWith(".html"))?.content || "<h1>Nenhum arquivo HTML encontrado</h1>";
    const css = project.files.find(f => f.name.endsWith(".css"))?.content || "";
    const safeCss = css.replace(/<\/style/gi,"<\\/style");
    return html.includes("</head>") ? html.replace("</head>", `<style>${safeCss}</style></head>`) : `<style>${safeCss}</style>${html}`;
  }, [project.files]);

  return <div className={`app-shell ${compact ? "compact" : ""}`}>
    <header className="topbar">
      <div className="brand-area">
        <button className="icon-button mobile-only" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Abrir menu"><Menu size={18}/></button>
        <div className="brand-mark"><Code2 size={19}/></div><span className="brand-name">Code Studio</span><span className="beta-tag">BETA</span>
      </div>
      <div className="top-actions">
        <span className={`connection ${health.aiConfigured ? "connected" : ""}`}><span className="status-dot"/>{health.loading ? "Verificando servidor" : health.aiConfigured ? "IA configurada" : "IA não configurada"}</span>
        <button className="icon-button" onClick={() => setLight(!light)} title="Alternar tema">{light ? <Moon size={17}/> : <Sun size={17}/>}</button>
        <div className="avatar">CS</div>
      </div>
    </header>
    <div className="workspace">
      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"} ${mobileMenu ? "mobile-open" : ""}`}>
        <button className="new-task-button" onClick={() => {setView("home");setPrompt("");setMobileMenu(false)}}><Plus size={16}/> Nova tarefa</button>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          {[["home","Início",LayoutDashboard],["chat","Chat com IA",MessageSquare],["editor","Editor de código",Code2],["projects","Projetos",Folder],["tasks","Tarefas",CheckSquare],["tests","Testes",Activity]].map(([id,label,Icon])=><button key={id} className={`nav-item ${view===id?"selected":""}`} onClick={()=>{setView(id);setMobileMenu(false)}}><Icon size={17}/><span>{label}</span>{id==="tasks" && project.tasks.some(t=>!t.done) && <span className="nav-count">{project.tasks.filter(t=>!t.done).length}</span>}</button>)}
        </nav>
        <div className="nav-label project-label">PROJETOS <button className="mini-icon" onClick={()=>setShowNewProject(true)} title="Novo projeto"><Plus size={14}/></button></div>
        <div className="project-nav">{state.projects.map(p=><button key={p.id} className={`project-nav-item ${p.id===project.id?"selected":""}`} onClick={()=>{setState(prev=>({...prev,activeProjectId:p.id,activeFileId:p.files[0]?.id}));setView("editor");setMobileMenu(false)}}><Folder size={15}/><span>{p.name}</span></button>)}</div>
        <div className="sidebar-bottom"><div className="security-note"><ShieldCheck size={16}/><span>Seus dados ficam neste navegador</span></div><button className="nav-item" onClick={()=>setView("settings")}><Settings size={17}/><span>Configurações</span></button><div className="user-row"><div className="avatar small">CS</div><div><strong>Meu workspace</strong><small>Ambiente pessoal</small></div><MoreHorizontal size={17}/></div></div>
      </aside>
      <main className="main-area">
        <div className="page-topline"><div className="breadcrumb"><span>{view === "home" ? "Workspace" : view === "chat" ? "Assistente" : view === "editor" ? "Desenvolvimento" : "Workspace"}</span><ChevronRight size={14}/><strong>{{home:"Início",chat:"Chat com IA",editor:"Editor",projects:"Projetos",tasks:"Tarefas",tests:"Testes",settings:"Configurações"}[view] || "Início"}</strong></div><div className="page-tools"><span className="project-chip"><Folder size={13}/>{project.name}</span><button className="icon-button" onClick={downloadProject} title="Exportar arquivos"><MoreHorizontal size={17}/></button></div></div>
        {view === "home" && <section className="home-view">
          <div className="welcome-mark"><Sparkles size={25}/></div><h1>O que vamos construir?</h1><p className="welcome-subtitle">Seu espaço para pensar, programar e transformar ideias em software.</p>
          <div className="prompt-card"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")sendMessage()}} placeholder="Descreva uma ideia, peça ajuda com código ou investigue um problema..." rows={3}/><div className="prompt-bottom"><span className="prompt-hint"><Bot size={15}/> Assistente configurável</span><span className="prompt-hint">Ctrl + Enter</span><button className="primary-button" onClick={()=>sendMessage()} disabled={!prompt.trim()||chatLoading}>{chatLoading?<LoaderCircle className="spin" size={16}/>:<Send size={16}/>} Enviar</button></div></div>
          <div className="section-title-row"><h2>Comece por aqui</h2><span>Atalhos de trabalho</span></div>
          <div className="action-grid">
            {[
              [Code2,"Criar um projeto","Comece com arquivos HTML, CSS e JavaScript","editor"],
              [MessageSquare,"Conversar com a IA","Peça explicações, ideias e sugestões","chat"],
              [CheckSquare,"Organizar tarefas","Divida seu trabalho em etapas","tasks"],
              [Play,"Validar arquivos","Execute verificações estáticas básicas","tests"]
            ].map(([Icon,title,desc,target])=><button className="action-card" key={title} onClick={()=>{setView(target);if(target==="chat"&&!messages.length)setPrompt("Ajude-me a planejar este projeto: "+project.name)}}><span className="action-icon"><Icon size={19}/></span><span className="action-copy"><strong>{title}</strong><small>{desc}</small></span><ChevronRight size={16} className="action-arrow"/></button>)}
          </div>
          <div className="home-bottom-note"><ShieldCheck size={16}/><span>A IA usa um endpoint configurado no servidor. Nunca coloque chaves secretas no código do navegador.</span></div>
        </section>}

        {view === "chat" && <section className="content-view chat-view">
          <div className="content-heading"><div><h1>Chat com IA</h1><p>Converse sobre código usando seu provedor compatível.</p></div><button className="secondary-button" onClick={()=>{updateConversation([]);notify("Conversa limpa.")}}><RefreshCw size={15}/> Nova conversa</button></div>
          <div className="chat-messages">
            {!messages.length && <div className="chat-empty"><div className="welcome-mark"><Bot size={24}/></div><h3>Como posso ajudar?</h3><p>Peça para explicar código, sugerir uma arquitetura ou revisar uma ideia.</p><div className="suggestion-pills">{["Explique a estrutura deste projeto","Sugira melhorias para o código","Crie testes para uma função"].map(s=><button key={s} onClick={()=>setPrompt(s)}>{s}</button>)}</div></div>}
            {messages.map(m=><article key={m.id} className={`message ${m.role}`}><div className="message-avatar">{m.role==="assistant"?<Bot size={17}/>:<span>CS</span>}</div><div className="message-content"><div className="message-meta">{m.role==="assistant"?"Assistente":"Você"} <span>{prettyTime(m.createdAt)}</span></div><div className="message-text">{m.content}</div><button className="copy-button" onClick={()=>{navigator.clipboard?.writeText(m.content);notify("Texto copiado.")}}><Copy size={13}/> Copiar</button></div></article>)}
            {chatLoading && <div className="message assistant"><div className="message-avatar"><Bot size={17}/></div><div className="message-content"><div className="message-meta">Assistente</div><div className="typing"><span/><span/><span/></div></div></div>}
            <div ref={chatEndRef}/>
          </div>
          <div className="chat-composer"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}}} placeholder="Envie uma mensagem... (Enter para enviar, Shift+Enter para nova linha)" rows={2}/><div className="chat-compose-footer"><span><ShieldCheck size={13}/> Revise o código sugerido antes de executar.</span><button className="primary-button" disabled={!prompt.trim()||chatLoading} onClick={()=>sendMessage()}>{chatLoading?<LoaderCircle className="spin" size={16}/>:<Send size={16}/>} Enviar</button></div></div>
        </section>}

        {view === "editor" && <section className="editor-view">
          <div className="content-heading editor-heading"><div><h1>Editor de código</h1><p>Edite os arquivos do projeto atual.</p></div><div className="editor-actions"><button className="secondary-button" onClick={()=>setShowTerminal(!showTerminal)}><Terminal size={15}/> Terminal</button><button className="primary-button" onClick={()=>setShowPreview(!showPreview)}><Play size={15}/>{showPreview?"Fechar prévia":"Pré-visualizar"}</button></div></div>
          <div className="ide">
            <aside className="file-tree"><div className="tree-head"><span>ARQUIVOS</span><button className="mini-icon" onClick={()=>setShowNewFile(true)} title="Novo arquivo"><FilePlus2 size={15}/></button></div><div className="tree-project"><ChevronDown size={13}/><Folder size={15}/><strong>{project.name}</strong></div><div className="file-list">{filteredFiles.map(f=><button key={f.id} className={`file-item ${f.id===file?.id?"active":""}`} onClick={()=>setState(prev=>({...prev,activeFileId:f.id}))}><FileCode2 size={14}/><span>{f.name}</span><span className="file-delete" onClick={e=>{e.stopPropagation();deleteFile(f)}} title="Excluir arquivo"><X size={12}/></span></button>)}</div><button className="tree-add" onClick={()=>setShowNewFile(true)}><Plus size={14}/> Novo arquivo</button></aside>
            <div className="code-pane"><div className="editor-tab"><FileCode2 size={14}/><span>{file?.name}</span><span className="language-pill">{file?.language || "text"}</span><button className="mini-icon" onClick={()=>{navigator.clipboard?.writeText(file?.content||"");notify("Conteúdo copiado.")}} title="Copiar arquivo"><Copy size={14}/></button></div><div className="editor-input-wrap"><div className="line-numbers">{(file?.content||"").split("\n").map((_,i)=><div key={i}>{i+1}</div>)}</div><textarea ref={editorRef} className="code-editor" spellCheck="false" value={file?.content||""} onChange={e=>updateFile(e.target.value)} aria-label="Conteúdo do arquivo"/></div><div className="editor-status"><span><span className="status-dot green-dot"/> Salvo localmente</span><span>{file?.language || "text"} · {(file?.content||"").split("\n").length} linhas</span></div></div>
            {showPreview && <div className="preview-pane"><div className="preview-head"><span>Pré-visualização local</span><button className="mini-icon" onClick={()=>setShowPreview(false)}><X size={14}/></button></div><iframe title="Pré-visualização do projeto" sandbox="" srcDoc={previewDoc}/></div>}
          </div>
          {showTerminal && <div className="terminal-panel"><div className="terminal-head"><span><Terminal size={14}/> Terminal de demonstração</span><button className="mini-icon" onClick={()=>setShowTerminal(false)}><X size={14}/></button></div><pre>{terminalText}</pre><form onSubmit={terminalCommand} className="terminal-form"><span>$</span><input value={terminalInput} onChange={e=>setTerminalInput(e.target.value)} placeholder="help, files, check, time ou clear"/><button className="mini-icon" type="submit"><Send size={14}/></button></form></div>}
          <div className="editor-footnote"><CircleHelp size={14}/> Este editor salva no navegador. Não executa comandos arbitrários nem compila projetos.</div>
        </section>}

        {view === "projects" && <section className="content-view"><div className="content-heading"><div><h1>Projetos</h1><p>Seus espaços de trabalho, salvos neste navegador.</p></div><button className="primary-button" onClick={()=>setShowNewProject(true)}><FolderPlus size={16}/> Novo projeto</button></div><div className="project-grid">{state.projects.map(p=><button key={p.id} className="project-card" onClick={()=>{setState(prev=>({...prev,activeProjectId:p.id,activeFileId:p.files[0]?.id}));setView("editor")}}><div className="project-card-top"><span className="action-icon"><Folder size={19}/></span><MoreHorizontal size={17}/></div><strong>{p.name}</strong><small>{p.files.length} arquivo(s) · {p.tasks.length} tarefa(s)</small><div className="project-card-foot"><span><GitBranch size={13}/> Workspace local</span><span>{new Date(p.updatedAt).toLocaleDateString("pt-BR")}</span></div></button>)}</div><div className="callout"><ShieldCheck size={18}/><div><strong>Armazenamento local</strong><p>Os projetos ficam no localStorage deste navegador. Para sincronizar entre dispositivos, será necessário adicionar autenticação e um banco de dados remoto.</p></div></div></section>}

        {view === "tasks" && <section className="content-view"><div className="content-heading"><div><h1>Tarefas</h1><p>Organize o trabalho em {project.name}.</p></div><span className="completion-pill">{completedTasks}/{project.tasks.length} concluídas</span></div><div className="task-panel"><div className="task-progress"><span style={{width:`${project.tasks.length ? completedTasks/project.tasks.length*100 : 0}%`}}/></div><form className="task-add-form" onSubmit={addTask}><input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Adicionar uma tarefa..." maxLength={180}/><button className="primary-button" disabled={!newTask.trim()}><Plus size={16}/> Adicionar</button></form>{project.tasks.map(t=><div className={`task-row ${t.done?"done":""}`} key={t.id}><input type="checkbox" checked={t.done} onChange={e=>updateProject(p=>({...p,tasks:p.tasks.map(x=>x.id===t.id?{...x,done:e.target.checked}:x)}))}/><span>{t.text}</span><button className="mini-icon" onClick={()=>updateProject(p=>({...p,tasks:p.tasks.filter(x=>x.id!==t.id)}))} title="Excluir tarefa"><Trash2 size={14}/></button></div>)}{!project.tasks.length&&<div className="empty-inline">Nenhuma tarefa ainda. Adicione a primeira acima.</div>}</div></section>}

        {view === "tests" && <section className="content-view"><div className="content-heading"><div><h1>Testes e verificações</h1><p>Verificações estáticas simples para os arquivos atuais.</p></div><button className="primary-button" onClick={runChecks}><Play size={15}/> Executar verificações</button></div><div className="test-card"><div className="test-icon"><Check size={19}/></div><div><strong>Validação básica de arquivos</strong><p>Verifica JSON, tags HTML comuns e balanceamento simples de chaves em JS/JSX.</p><span className="subtle-tag">Local · sem execução de código</span></div></div><div className="callout warning"><ShieldCheck size={18}/><div><strong>Limites de segurança</strong><p>O site não executa comandos de terminal arbitrários. Para testes reais, configure um backend com isolamento por contêiner, limites de CPU/memória, tempo máximo e permissões mínimas.</p></div></div></section>}

        {view === "settings" && <section className="content-view"><div className="content-heading"><div><h1>Configurações</h1><p>Preferências e estado da integração.</p></div></div><div className="settings-panel"><div className="setting-row"><div className="setting-icon"><Bot size={18}/></div><div className="setting-copy"><strong>Provedor de IA</strong><p>{health.aiConfigured?"O servidor informa que a IA está configurada.":"Nenhuma configuração de IA foi detectada pelo servidor."} Configure <code>AI_BASE_URL</code>, <code>AI_API_KEY</code> e <code>AI_MODEL</code> no arquivo <code>.env</code> do servidor.</p></div><span className={`state-pill ${health.aiConfigured?"ok":""}`}>{health.aiConfigured?"Configurada":"Pendente"}</span></div><div className="setting-row"><div className="setting-icon"><ShieldCheck size={18}/></div><div className="setting-copy"><strong>Privacidade</strong><p>O navegador armazena os projetos localmente. Mensagens enviadas ao chat e o contexto dos arquivos ativos são enviados ao endpoint de IA configurado.</p></div></div><div className="setting-row"><div className="setting-icon"><Sun size={18}/></div><div className="setting-copy"><strong>Aparência compacta</strong><p>Reduz o espaçamento da interface.</p></div><label className="switch"><input type="checkbox" checked={compact} onChange={e=>setCompact(e.target.checked)}/><span/></label></div><div className="setting-row"><div className="setting-icon"><RefreshCw size={18}/></div><div className="setting-copy"><strong>Exportar projeto</strong><p>Baixe os conteúdos dos arquivos atuais em um único arquivo de texto.</p></div><button className="secondary-button" onClick={downloadProject}>Exportar</button></div><div className="setting-row danger-row"><div className="setting-icon"><Trash2 size={18}/></div><div className="setting-copy"><strong>Apagar dados locais</strong><p>Remove todos os projetos e conversas salvos neste navegador.</p></div><button className="secondary-button danger-button" onClick={()=>{if(confirm("Apagar todos os dados locais? Esta ação não pode ser desfeita.")){localStorage.removeItem(STORAGE_KEY);location.reload()}}}>Apagar dados</button></div></div></section>}
      </main>
    </div>
    {showNewProject && <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setShowNewProject(false)}}><form className="modal" onSubmit={e=>{e.preventDefault();createProject()}}><div className="modal-title"><h2>Novo projeto</h2><button type="button" className="icon-button" onClick={()=>setShowNewProject(false)}><X size={17}/></button></div><p>Crie um workspace com arquivos iniciais de exemplo.</p><label>Nome do projeto<input autoFocus value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Ex.: Meu site" maxLength={80}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowNewProject(false)}>Cancelar</button><button className="primary-button" disabled={!projectName.trim()}><FolderPlus size={15}/> Criar projeto</button></div></form></div>}
    {showNewFile && <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setShowNewFile(false)}}><form className="modal" onSubmit={e=>{e.preventDefault();createFile()}}><div className="modal-title"><h2>Novo arquivo</h2><button type="button" className="icon-button" onClick={()=>setShowNewFile(false)}><X size={17}/></button></div><p>O arquivo será criado no projeto atual.</p><label>Nome do arquivo<input autoFocus value={newFileName} onChange={e=>setNewFileName(e.target.value)} placeholder="ex.: app.js" maxLength={120}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowNewFile(false)}>Cancelar</button><button className="primary-button" disabled={!newFileName.trim()}><FilePlus2 size={15}/> Criar arquivo</button></div></form></div>}
    {toast && <div className="toast"><Check size={15}/>{toast}</div>}
  </div>;
}