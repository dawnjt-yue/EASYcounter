import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Trash2, 
  Download, 
  Calculator, 
  ChevronRight, 
  ChevronLeft,
  LayoutGrid,
  FolderPlus,
  X,
  Sun,
  Moon,
  Menu,
  Home,
  RotateCcw,
  Minus,
  Copy,
  ArrowLeft,
  BookOpen
} from "lucide-react";
import { toPng } from "html-to-image";
import { cn } from "./lib/utils";
import { Project, CounterItem, Template } from "./types";

const EMOJIS = ["📊", "📈", "📉", "📦", "📁", "📂", "📅", "🕒", "✅", "❌", "🔥", "💡", "🚀", "🛠️", "⚙️", "📱", "💻", "🖥️", "🖱️", "⌨️"];

export default function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "project" | "templates">("home");
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem("tech-counter-projects");
    return saved ? JSON.parse(saved) : [];
  });
  const [templates, setTemplates] = useState<Template[]>(() => {
    const saved = localStorage.getItem("tech-counter-templates");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [newItem, setNewItem] = useState({ name: "", icon: EMOJIS[0] });
  const [selectedForCalc, setSelectedForCalc] = useState<string[]>([]);
  const [calcResult, setCalcResult] = useState<number | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("tech-counter-theme");
    return (saved as "light" | "dark") || "dark";
  });
  
  // Home page simple counter
  const [simpleCount, setSimpleCount] = useState(() => {
    const saved = localStorage.getItem("tech-counter-simple");
    return saved ? parseInt(saved) : 0;
  });

  // Long press / Edit count
  const [editingItem, setEditingItem] = useState<{ id: string, count: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("tech-counter-projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("tech-counter-templates", JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem("tech-counter-simple", simpleCount.toString());
  }, [simpleCount]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tech-counter-theme", theme);
  }, [theme]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  const addProject = () => {
    if (!newProjectName.trim()) return;
    
    let items: CounterItem[] = [];
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        items = template.items.map(i => ({
          ...i,
          id: crypto.randomUUID(),
          count: 0
        }));
      }
    }

    const newProj: Project = {
      id: crypto.randomUUID(),
      name: newProjectName,
      items,
      createdAt: Date.now()
    };
    setProjects([...projects, newProj]);
    setActiveProjectId(newProj.id);
    setNewProjectName("");
    setSelectedTemplateId("");
    setIsAddingProject(false);
    setCurrentPage("project");
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const saveAsTemplate = () => {
    if (!activeProject) return;
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: `${activeProject.name} 模板`,
      items: activeProject.items.map(({ name, icon }) => ({ name, icon }))
    };
    setTemplates([...templates, newTemplate]);
    alert("已保存为预制方案！");
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectId(null);
      setCurrentPage("home");
    }
  };

  const addItem = () => {
    if (!newItem.name.trim() || !activeProjectId) return;
    const item: CounterItem = {
      id: crypto.randomUUID(),
      name: newItem.name,
      icon: newItem.icon,
      count: 0
    };
    setProjects(projects.map(p => 
      p.id === activeProjectId ? { ...p, items: [...p.items, item] } : p
    ));
    setNewItem({ name: "", icon: EMOJIS[0] });
    setIsAddingItem(false);
  };

  const incrementItem = (itemId: string) => {
    setProjects(projects.map(p => 
      p.id === activeProjectId 
        ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, count: i.count + 1 } : i) } 
        : p
    ));
  };

  const updateItemCount = () => {
    if (!editingItem || !activeProjectId) return;
    setProjects(projects.map(p => 
      p.id === activeProjectId 
        ? { ...p, items: p.items.map(i => i.id === editingItem.id ? { ...i, count: editingItem.count } : i) } 
        : p
    ));
    setEditingItem(null);
  };

  const deleteItem = (itemId: string) => {
    setProjects(projects.map(p => 
      p.id === activeProjectId 
        ? { ...p, items: p.items.filter(i => i.id !== itemId) } 
        : p
    ));
    setSelectedForCalc(prev => prev.filter(id => id !== itemId));
  };

  const toggleSelection = (itemId: string) => {
    setSelectedForCalc(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const calculate = (op: "add" | "sub") => {
    if (!activeProject) return;
    const selectedItems = activeProject.items.filter(i => selectedForCalc.includes(i.id));
    if (selectedItems.length === 0) return;
    
    const result = selectedItems.reduce((acc, item, idx) => {
      if (idx === 0) return item.count;
      return op === "add" ? acc + item.count : acc - item.count;
    }, 0);
    setCalcResult(result);
  };

  const exportImage = async () => {
    if (exportRef.current) {
      const dataUrl = await toPng(exportRef.current, { cacheBust: true });
      const link = document.createElement("a");
      link.download = `${activeProject?.name || "计数器"}-统计.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleLongPressStart = (item: CounterItem) => {
    longPressTimer.current = setTimeout(() => {
      setEditingItem({ id: item.id, count: item.count });
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg font-sans transition-colors duration-300">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth <= 768 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (window.innerWidth <= 768 ? "42.5%" : 140) : 0,
          x: isSidebarOpen ? 0 : (window.innerWidth <= 768 ? -300 : 0)
        }}
        className={cn(
          "frosted-glass m-4 mr-0 overflow-hidden relative flex flex-col z-50 transition-all duration-300",
          window.innerWidth <= 768 && "fixed inset-y-0 left-0 m-0 rounded-r-2xl rounded-l-none"
        )}
      >
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <h2 className="font-bold text-xl tracking-tight text-primary">项目列表</h2>
          <div className="flex gap-2">
            <button onClick={toggleTheme} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button onClick={() => { setCurrentPage("home"); if(window.innerWidth <= 768) setIsSidebarOpen(false); }} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Home size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {projects.length === 0 && (
            <div className="text-center py-10 text-text/40 text-sm">暂无项目</div>
          )}
          {projects.map(p => (
            <div 
              key={p.id}
              onClick={() => {
                setActiveProjectId(p.id);
                setCurrentPage("project");
                if (window.innerWidth <= 768) setIsSidebarOpen(false);
              }}
              className={cn(
                "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                activeProjectId === p.id && currentPage === "project"
                  ? "bg-primary/20 border-primary/30 text-primary" 
                  : "hover:bg-white/5 border-transparent text-text/70"
              )}
            >
              <span className="truncate font-medium">{p.name}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {window.innerWidth > 768 && (
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-4 top-1/2 -translate-y-1/2 bg-surface border border-white/10 p-1 rounded-full z-10 text-text hover:text-primary transition-colors shadow-lg"
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 overflow-y-auto relative">
        {/* Mobile Header Toggle */}
        {window.innerWidth <= 768 && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-30 p-2 bg-surface/80 rounded-lg border border-white/10 text-text"
          >
            <Menu size={24} />
          </button>
        )}

        {currentPage === "home" ? (
          <div className="flex-1 flex flex-col items-center justify-between py-12">
            <h1 className="text-2xl font-black tracking-[0.2em] text-primary text-center">EASY COUNTER</h1>
            
            <div className="flex flex-col items-center gap-8">
              {/* Simple Counter Circle */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSimpleCount(prev => prev + 1)}
                className="w-64 h-64 sm:w-80 sm:h-80 rounded-full frosted-glass metallic-card flex items-center justify-center text-6xl sm:text-8xl font-black font-mono text-primary shadow-2xl"
              >
                {simpleCount}
              </motion.button>

              <div className="flex gap-8">
                {/* Minus Button */}
                <button 
                  onClick={() => setSimpleCount(prev => Math.max(0, prev - 1))}
                  className="p-4 rounded-full frosted-glass metallic-card text-text/60 hover:text-primary transition-colors shadow-lg"
                >
                  <Minus size={24} />
                </button>
                {/* Reset Button */}
                <button 
                  onClick={() => setSimpleCount(0)}
                  className="p-4 rounded-full frosted-glass metallic-card text-text/60 hover:text-red-400 transition-colors shadow-lg"
                >
                  <RotateCcw size={24} />
                </button>
              </div>
            </div>

            <div className="flex gap-6 sm:gap-12">
              <button 
                onClick={() => setIsAddingProject(true)}
                className="w-20 h-20 sm:w-24 sm:h-24 frosted-glass metallic-card flex flex-col items-center justify-center gap-2 group hover:border-primary/50 transition-all"
              >
                <Plus size={24} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">新建项目</span>
              </button>
              <button 
                onClick={() => setCurrentPage("templates")}
                className="w-20 h-20 sm:w-24 sm:h-24 frosted-glass metallic-card flex flex-col items-center justify-center gap-2 group hover:border-primary/50 transition-all"
              >
                <BookOpen size={24} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">预制方案</span>
              </button>
              <div className="w-20 h-20 sm:w-24 sm:h-24 frosted-glass metallic-card opacity-20 border-dashed" />
            </div>
          </div>
        ) : currentPage === "templates" ? (
          <div className="flex-1 flex flex-col space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentPage("home")} className="p-2 hover:bg-white/5 rounded-lg">
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold">预制方案管理</h1>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
              {templates.map(t => (
                <div key={t.id} className="frosted-glass metallic-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{t.name}</h3>
                    <button 
                      onClick={() => setTemplates(templates.filter(temp => temp.id !== t.id))}
                      className="text-text/40 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.items.map((item, idx) => (
                      <span key={idx} className="text-xs bg-surface/30 px-2 py-1 rounded-full">{item.icon} {item.name}</span>
                    ))}
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full py-20 text-center text-text/30 italic">
                  暂无预制方案。您可以在项目页将当前方案保存为模板。
                </div>
              )}
            </div>
          </div>
        ) : activeProject ? (
          <div className="flex flex-col h-full space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between frosted-glass p-4 sm:p-6 gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentPage("home")} className="p-2 hover:bg-white/5 rounded-lg sm:hidden">
                  <ArrowLeft size={20} />
                </button>
                <div className={cn(window.innerWidth <= 768 && !isSidebarOpen && "pl-8")}>
                  <h1 className="text-2xl font-bold text-text">{activeProject.name}</h1>
                  <p className="text-xs opacity-50 font-mono">
                    {new Date(activeProject.createdAt).toLocaleDateString()} • {activeProject.items.length} 个条目
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={saveAsTemplate} className="tech-button-secondary p-2.5" title="保存为预制方案">
                  <Copy size={18} />
                </button>
                <button onClick={() => setIsAddingItem(true)} className="tech-button-primary flex-1 sm:flex-none flex items-center justify-center gap-2">
                  <Plus size={18} /> 添加条目
                </button>
                <button onClick={exportImage} className="tech-button-secondary p-2.5">
                  <Download size={18} />
                </button>
              </div>
            </div>

            {/* Grid & Stats */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4">
              {/* Counter Grid */}
              <div ref={exportRef} className="flex-1 frosted-glass p-4 sm:p-6 bg-surface/10">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  <AnimatePresence>
                    {activeProject.items.map(item => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={item.id}
                        className={cn(
                          "metallic-card p-4 sm:p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group select-none",
                          selectedForCalc.includes(item.id) ? "ring-2 ring-primary border-transparent" : "hover:border-white/20"
                        )}
                        onMouseDown={() => handleLongPressStart(item)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(item)}
                        onTouchEnd={handleLongPressEnd}
                        onClick={() => incrementItem(item.id)}
                      >
                        {/* Top Left: Stats */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
                          className={cn(
                            "absolute top-2 left-2 p-1.5 rounded-lg transition-all",
                            selectedForCalc.includes(item.id) ? "text-primary bg-primary/10" : "text-text/20 hover:text-text/60 hover:bg-white/5"
                          )}
                        >
                          <Calculator size={14} />
                        </button>

                        {/* Top Right: Delete */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg text-text/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                        
                        <span className="text-4xl sm:text-5xl drop-shadow-lg">{item.icon}</span>
                        <h3 className="font-medium text-text/80 text-center truncate w-full text-sm sm:text-base">{item.name}</h3>
                        <div className="text-3xl sm:text-4xl font-bold font-mono text-primary">{item.count}</div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Calculation Panel */}
              <div className="w-full lg:w-80 frosted-glass p-6 flex flex-col gap-6 shrink-0">
                <div className="flex items-center gap-2 text-primary">
                  <Calculator size={20} />
                  <h2 className="font-bold uppercase tracking-widest text-sm">统计面板</h2>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto min-h-[100px] lg:min-h-0">
                  <div className="text-xs text-text/40 uppercase font-bold tracking-tighter">已选条目</div>
                  {selectedForCalc.length === 0 ? (
                    <div className="text-sm text-text/30 italic">点击卡片左上角的计算图标进行选择...</div>
                  ) : (
                    <div className="space-y-2">
                      {activeProject.items.filter(i => selectedForCalc.includes(i.id)).map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm metallic-card p-2 px-3">
                          <span className="truncate">{item.icon} {item.name}</span>
                          <span className="font-mono font-bold text-primary">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedForCalc.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex gap-2">
                      <button onClick={() => calculate("add")} className="flex-1 tech-button-secondary text-xl">+</button>
                      <button onClick={() => calculate("sub")} className="flex-1 tech-button-secondary text-xl">-</button>
                    </div>
                    {calcResult !== null && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 metallic-card text-center border-primary/30"
                      >
                        <div className="text-xs text-primary uppercase font-bold mb-1 tracking-widest">计算结果</div>
                        <div className="text-4xl font-bold font-mono text-text">{calcResult}</div>
                      </motion.div>
                    )}
                    <button 
                      onClick={() => { setSelectedForCalc([]); setCalcResult(null); }}
                      className="w-full text-xs text-text/40 hover:text-text transition-colors"
                    >
                      清除选择
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="p-10 rounded-full frosted-glass text-primary shadow-2xl shadow-primary/10">
              <LayoutGrid size={64} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-text">欢迎使用 TechCounter</h2>
              <p className="text-text/50 mt-2 max-w-md">创建您的第一个项目，开始高效、简约的计数体验。</p>
            </div>
            <button onClick={() => setIsAddingProject(true)} className="tech-button-primary px-8 py-3 text-lg">
              创建新项目
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAddingProject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="frosted-glass w-full max-w-md p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">新建项目</h3>
                <button onClick={() => setIsAddingProject(false)} className="text-text/40 hover:text-text">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-text/40 uppercase font-bold tracking-widest">项目名称</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-bg/50 border border-white/10 rounded-xl p-4 focus:border-primary outline-none transition-all text-text"
                    placeholder="例如：库存统计、健身记录..."
                  />
                </div>
                
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-text/40 uppercase font-bold tracking-widest">选择预制方案 (可选)</label>
                    <select 
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full bg-bg/50 border border-white/10 rounded-xl p-4 focus:border-primary outline-none transition-all text-text appearance-none"
                    >
                      <option value="">不使用模板</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsAddingProject(false)} className="flex-1 tech-button-secondary">取消</button>
                <button onClick={addProject} className="flex-1 tech-button-primary">确定创建</button>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="frosted-glass w-full max-w-md p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">添加新条目</h3>
                <button onClick={() => setIsAddingItem(false)} className="text-text/40 hover:text-text">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-text/40 uppercase font-bold tracking-widest">条目名称</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addItem()}
                    className="w-full bg-bg/50 border border-white/10 rounded-xl p-4 focus:border-primary outline-none transition-all text-text"
                    placeholder="条目名称..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-text/40 uppercase font-bold tracking-widest">选择图标</label>
                  <div className="grid grid-cols-5 gap-2 p-3 bg-bg/50 rounded-xl border border-white/5 max-h-[200px] overflow-y-auto">
                    {EMOJIS.map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => setNewItem({ ...newItem, icon: emoji })}
                        className={cn(
                          "p-2 text-2xl rounded-xl transition-all",
                          newItem.icon === emoji ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-white/5"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setIsAddingItem(false)} className="tech-button-secondary flex-1">取消</button>
                <button onClick={addItem} className="tech-button-primary flex-1">确定添加</button>
              </div>
            </motion.div>
          </div>
        )}

        {editingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="frosted-glass w-full max-w-md p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">修改数值</h3>
                <button onClick={() => setEditingItem(null)} className="text-text/40 hover:text-text">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-text/40 uppercase font-bold tracking-widest">当前数值</label>
                <input 
                  autoFocus
                  type="number" 
                  value={editingItem.count}
                  onChange={(e) => setEditingItem({ ...editingItem, count: parseInt(e.target.value) || 0 })}
                  onKeyDown={(e) => e.key === "Enter" && updateItemCount()}
                  className="w-full bg-bg/50 border border-white/10 rounded-xl p-4 focus:border-primary outline-none transition-all text-text text-center text-4xl font-mono"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditingItem(null)} className="flex-1 tech-button-secondary">取消</button>
                <button onClick={updateItemCount} className="flex-1 tech-button-primary">保存修改</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
