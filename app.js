/* ========================================================================
   课程管理系统 - React Hooks 完整版
   技术栈：React 18 + JSX + useState + useEffect + useRef + useMemo + useCallback
   自定义 Hook：useLocalStorage、useDebounce
   ======================================================================== */

const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;


/* ========================================================================
   常量数据
   ======================================================================== */

/* 默认课程数据 */
const DEFAULT_COURSES = [
  {
    id: 1,
    name: "React 前端开发",
    desc: "深入学习 React 框架，掌握组件化开发、Hooks、状态管理等核心技术，构建现代化 Web 应用。",
    category: "前端开发",
    color: "#FF6B6B",
  },
  {
    id: 2,
    name: "Python 数据分析",
    desc: "使用 Python 进行数据处理与分析，涵盖 Pandas、NumPy、Matplotlib 等主流库的实战应用。",
    category: "数据科学",
    color: "#4ECDC4",
  },
  {
    id: 3,
    name: "算法与数据结构",
    desc: "系统学习常用数据结构与经典算法，提升编程思维与问题解决能力，备战技术面试。",
    category: "计算机基础",
    color: "#45B7D1",
  },
  {
    id: 4,
    name: "UI/UX 设计基础",
    desc: "掌握用户界面与体验设计原则，学习 Figma 工具，打造美观且易用的数字产品。",
    category: "设计",
    color: "#96CEB4",
  },
  {
    id: 5,
    name: "Node.js 后端开发",
    desc: "使用 Node.js 和 Express 搭建 RESTful API，了解中间件、数据库连接与部署流程。",
    category: "后端开发",
    color: "#F0B27A",
  },
  {
    id: 6,
    name: "机器学习入门",
    desc: "从零开始学习机器学习基础，包括线性回归、决策树、神经网络等核心概念与实践。",
    category: "人工智能",
    color: "#DDA0DD",
  },
];

/* 分类列表 */
const CATEGORIES = ["全部", "前端开发", "后端开发", "数据科学", "计算机基础", "人工智能", "设计"];

/* 课程卡片颜色池 */
const CARD_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#F0B27A", "#82E0AA"];


/* ========================================================================
   自定义 Hook：useLocalStorage
   用途：将状态自动同步到 localStorage，页面刷新后数据持久化
   参数：key (localStorage 键名), initialValue (初始值)
   返回：[value, setValue] — 与 useState 用法一致
   ======================================================================== */
function useLocalStorage(key, initialValue) {
  /* useState 初始化函数：页面首次加载时从 localStorage 读取数据 */
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`[useLocalStorage] 读取 ${key} 失败:`, error);
      return initialValue;
    }
  });

  /* useEffect：当 storedValue 变化时自动写入 localStorage */
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`[useLocalStorage] 写入 ${key} 失败:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}


/* ========================================================================
   自定义 Hook：useDebounce
   用途：对频繁变化的值进行防抖处理，延迟更新直到用户停止输入
   参数：value (需要防抖的值), delay (延迟毫秒数，默认 300ms)
   返回：debouncedValue — 防抖后的值
   ======================================================================== */
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    /* 每次输入变化后启动定时器 */
    const timerId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    /* 如果 delay 时间内 value 再次变化，清除上一次定时器重新计时 */
    return () => clearTimeout(timerId);
  }, [value, delay]);

  return debouncedValue;
}


/* ========================================================================
   工具函数：生成随机颜色
   ======================================================================== */
function getRandomColor() {
  return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
}


/* ========================================================================
   工具函数：表单校验（可复用）
   ======================================================================== */
function validateCourseForm(data) {
  const errors = {};
  if (!data.name.trim()) {
    errors.name = "课程名称不能为空";
  } else if (data.name.trim().length < 2) {
    errors.name = "课程名称至少 2 个字符";
  } else if (data.name.trim().length > 30) {
    errors.name = "课程名称不能超过 30 个字符";
  }
  if (!data.desc.trim()) {
    errors.desc = "课程简介不能为空";
  } else if (data.desc.trim().length < 5) {
    errors.desc = "课程简介至少 5 个字符";
  } else if (data.desc.trim().length > 200) {
    errors.desc = "课程简介不能超过 200 个字符";
  }
  return errors;
}


/* ========================================================================
   组件：Toast — 提示消息（使用 memo 优化，避免不必要的重渲染）
   props: message, type, visible
   ======================================================================== */
const Toast = memo(function Toast({ message, type, visible }) {
  return (
    <div className={`toast toast-${type} ${visible ? "toast-visible" : ""}`}>
      <span className="toast-icon">{type === "success" ? "\u2713" : type === "error" ? "\u2715" : "\u2139"}</span>
      <span className="toast-msg">{message}</span>
    </div>
  );
});


/* ========================================================================
   组件：Header — 页面顶部（memo 优化）
   props: courseCount
   ======================================================================== */
const Header = memo(function Header({ courseCount }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🎓</span>
            <h1 className="logo-text">课程管理系统</h1>
          </div>
          <p className="header-subtitle">React Hooks 实验项目</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{courseCount}</span>
            <span className="stat-label">门课程</span>
          </div>
        </div>
      </div>
    </header>
  );
});


/* ========================================================================
   组件：SearchBar — 搜索栏
   props: value, onChange
   特性：使用 useRef 获取 input DOM 引用，实现清除后自动聚焦
   ======================================================================== */
function SearchBar({ value, onChange }) {
  const inputRef = useRef(null);  /* useRef 引用 DOM 元素 */

  /* 清除搜索内容并自动聚焦输入框 */
  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();  /* 通过 ref 直接操作 DOM 聚焦 */
  }, [onChange]);

  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        ref={inputRef}  /* 将 ref 绑定到 input 元素 */
        type="text"
        className="search-input"
        placeholder="搜索课程名称或描述..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="search-clear" onClick={handleClear}>✕</button>
      )}
    </div>
  );
}


/* ========================================================================
   组件：FilterBar — 分类筛选 + 课程数量统计
   props: activeCategory, onFilter, courseCount, categoryStats
   ======================================================================== */
const FilterBar = memo(function FilterBar({ activeCategory, onFilter, courseCount, categoryStats }) {
  return (
    <div className="filter-section">
      <div className="filter-label">
        <span className="filter-title">课程分类</span>
        <span className="course-count">共 {courseCount} 门课程</span>
      </div>
      <div className="filter-tags">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-tag ${activeCategory === cat ? "filter-tag-active" : ""}`}
            onClick={() => onFilter(cat)}
          >
            {cat}
            {cat !== "全部" && categoryStats[cat] > 0 && (
              <span className="tag-count">{categoryStats[cat]}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
});


/* ========================================================================
   组件：CourseItem — 课程卡片
   props: course, onDelete, onEdit, onLearn
   特性：使用 memo 优化避免父组件更新时不必要的重渲染
   ======================================================================== */
const CourseItem = memo(function CourseItem({ course, onDelete, onEdit, onLearn }) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isLearning, setIsLearning] = useState(false);

  /* 删除动画：先播放动画，动画结束后再调用真正的删除 */
  const handleDelete = () => {
    setIsLeaving(true);
    setTimeout(() => onDelete(course.id), 350);
  };

  /* 学习按钮交互 */
  const handleLearn = () => {
    setIsLearning(true);
    onLearn(course);
    setTimeout(() => setIsLearning(false), 1500);
  };

  return (
    <div className={`course-card ${isLeaving ? "card-leaving" : ""}`} style={{ "--card-color": course.color }}>
      <div className="card-accent-line"></div>
      <div className="card-header">
        <span className="card-category">{course.category}</span>
        <div className="card-actions">
          <button className="btn-icon btn-edit" onClick={() => onEdit(course)} title="编辑课程">✎</button>
          <button className="btn-icon btn-delete" onClick={handleDelete} title="删除课程">✕</button>
        </div>
      </div>
      <h3 className="card-title">{course.name}</h3>
      <p className="card-desc">{course.desc}</p>
      <button
        className={`btn-learn ${isLearning ? "btn-learn-active" : ""}`}
        onClick={handleLearn}
      >
        {isLearning ? "✓ 学习中..." : "开始学习"}
      </button>
    </div>
  );
});


/* ========================================================================
   组件：CourseList — 课程列表
   props: courses, onDelete, onEdit, onLearn, searchQuery
   特性：使用 map 列表渲染 + 条件渲染空状态
   ======================================================================== */
function CourseList({ courses, onDelete, onEdit, onLearn, searchQuery }) {
  /* 条件渲染：空列表时显示提示 */
  if (courses.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📚</div>
        <h3>{searchQuery ? "没有找到匹配的课程" : "暂无课程"}</h3>
        <p>{searchQuery ? "试试其他关键词吧" : "点击上方「新增课程」添加你的第一门课程"}</p>
      </div>
    );
  }

  return (
    <div className="course-grid">
      {courses.map((course) => (
        <CourseItem
          key={course.id}
          course={course}
          onDelete={onDelete}
          onEdit={onEdit}
          onLearn={onLearn}
        />
      ))}
    </div>
  );
}


/* ========================================================================
   组件：AddCourse — 新增课程表单
   props: onAdd, categories
   特性：受控组件 + useRef 自动聚焦 + 输入校验
   ======================================================================== */
function AddCourse({ onAdd, categories }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", desc: "", category: "前端开发" });
  const [errors, setErrors] = useState({ name: "", desc: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* useRef：引用课程名称输入框，用于表单打开后自动聚焦 */
  const nameInputRef = useRef(null);

  /* useEffect：当表单打开时，自动聚焦到课程名称输入框 */
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isOpen]);

  /* 提交表单 */
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const newErrors = validateCourseForm(formData);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    /* 模拟异步提交，展示加载状态 */
    setTimeout(() => {
      onAdd({
        id: Date.now(),
        name: formData.name.trim(),
        desc: formData.desc.trim(),
        category: formData.category,
        color: getRandomColor(),
      });
      setFormData({ name: "", desc: "", category: "前端开发" });
      setErrors({ name: "", desc: "" });
      setIsOpen(false);
      setIsSubmitting(false);
    }, 400);
  }, [formData, onAdd]);

  /* 受控组件输入处理 */
  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  /* 关闭表单 */
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setErrors({ name: "", desc: "" });
  }, []);

  return (
    <div className="add-course-section">
      {!isOpen ? (
        <button className="btn-add" onClick={() => setIsOpen(true)}>
          <span className="btn-add-icon">+</span> 新增课程
        </button>
      ) : (
        <form className="add-course-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <h3>新增课程</h3>
            <button type="button" className="btn-close" onClick={handleClose}>✕</button>
          </div>
          <div className={`form-group ${errors.name ? "form-group-error" : ""}`}>
            <label htmlFor="course-name">课程名称 <span className="required">*</span></label>
            <input
              ref={nameInputRef}  // useRef 绑定：表单打开后自动聚焦
              id="course-name"
              type="text"
              className="form-input"
              placeholder="例如：Vue.js 实战开发"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              maxLength={30}
            />
            {errors.name && <span className="error-msg">{errors.name}</span>}
            <span className="char-count">{formData.name.length}/30</span>
          </div>
          <div className={`form-group ${errors.desc ? "form-group-error" : ""}`}>
            <label htmlFor="course-desc">课程简介 <span className="required">*</span></label>
            <textarea
              id="course-desc"
              className="form-textarea"
              placeholder="简要描述课程内容、适合人群和学习目标..."
              value={formData.desc}
              onChange={(e) => handleInputChange("desc", e.target.value)}
              maxLength={200}
              rows={3}
            ></textarea>
            {errors.desc && <span className="error-msg">{errors.desc}</span>}
            <span className="char-count">{formData.desc.length}/200</span>
          </div>
          <div className="form-group">
            <label htmlFor="course-category">课程分类</label>
            <select
              id="course-category"
              className="form-select"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
            >
              {categories.filter((c) => c !== "全部").map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>取消</button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? "添加中..." : "确认添加"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


/* ========================================================================
   组件：EditModal — 编辑课程弹窗
   props: course, onSave, onClose
   特性：useRef 自动聚焦 + 受控组件 + 输入校验
   ======================================================================== */
function EditModal({ course, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: course.name,
    desc: course.desc,
    category: course.category,
  });
  const [errors, setErrors] = useState({ name: "", desc: "" });

  /* useRef：弹窗打开后自动聚焦到课程名称输入框 */
  const editNameRef = useRef(null);

  useEffect(() => {
    if (editNameRef.current) {
      editNameRef.current.focus();
    }
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const newErrors = validateCourseForm(formData);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave({
      ...course,
      name: formData.name.trim(),
      desc: formData.desc.trim(),
      category: formData.category,
    });
  }, [formData, course, onSave]);

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  /* ESC 键关闭弹窗 */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="form-header">
          <h3>编辑课程</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={`form-group ${errors.name ? "form-group-error" : ""}`}>
            <label htmlFor="edit-name">课程名称 <span className="required">*</span></label>
            <input
              ref={editNameRef}
              id="edit-name"
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              maxLength={30}
            />
            {errors.name && <span className="error-msg">{errors.name}</span>}
            <span className="char-count">{formData.name.length}/30</span>
          </div>
          <div className={`form-group ${errors.desc ? "form-group-error" : ""}`}>
            <label htmlFor="edit-desc">课程简介 <span className="required">*</span></label>
            <textarea
              id="edit-desc"
              className="form-textarea"
              value={formData.desc}
              onChange={(e) => handleInputChange("desc", e.target.value)}
              maxLength={200}
              rows={3}
            ></textarea>
            {errors.desc && <span className="error-msg">{errors.desc}</span>}
            <span className="char-count">{formData.desc.length}/200</span>
          </div>
          <div className="form-group">
            <label htmlFor="edit-category">课程分类</label>
            <select
              id="edit-category"
              className="form-select"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
            >
              {CATEGORIES.filter((c) => c !== "全部").map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>取消</button>
            <button type="submit" className="btn-submit">保存修改</button>
          </div>
        </form>
      </div>
    </div>
  );
}


/* ========================================================================
   主组件：App — 状态管理中心
   Hooks 使用：
     - useState    ：管理 courses / searchQuery / activeCategory / editingCourse / toast
     - useEffect   ：localStorage 读写同步
     - useRef      ：保存 toast 定时器引用，避免内存泄漏
     - useMemo     ：缓存搜索筛选结果和分类统计
     - useCallback ：缓存事件处理函数引用
   ======================================================================== */
function App() {
  /* ---- useState：核心状态管理 ---- */

  /* 使用自定义 Hook useLocalStorage 替代 useState + useEffect */
  const [courses, setCourses] = useLocalStorage("course-manager-data", DEFAULT_COURSES);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [editingCourse, setEditingCourse] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success", visible: false });

  /* ---- useRef：保存 toast 定时器 ID，用于清理 ---- */
  const toastTimerRef = useRef(null);


  /* ---- useDebounce：对搜索关键词进行防抖处理 ---- */
  const debouncedSearch = useDebounce(searchQuery, 300);


  /* ---- useMemo：缓存搜索 + 筛选后的课程列表 ----
     只有当 courses / debouncedSearch / activeCategory 变化时才重新计算
     避免每次父组件 render 都重新 filter 整个列表 */
  const filteredCourses = useMemo(() => {
    const keyword = debouncedSearch.toLowerCase();
    return courses.filter((course) => {
      const matchSearch =
        !keyword ||
        course.name.toLowerCase().includes(keyword) ||
        course.desc.toLowerCase().includes(keyword);
      const matchCategory = activeCategory === "全部" || course.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [courses, debouncedSearch, activeCategory]);


  /* ---- useMemo：缓存各分类的课程数量统计 ---- */
  const categoryStats = useMemo(() => {
    const stats = {};
    courses.forEach((c) => {
      stats[c.category] = (stats[c.category] || 0) + 1;
    });
    return stats;
  }, [courses]);


  /* ---- useCallback：缓存 showToast 函数 ----
     避免传递给子组件时引起不必要的重渲染 */
  const showToast = useCallback((message, type = "success") => {
    /* 清除上一次的定时器，避免多次快速触发时 toast 显示异常 */
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
      toastTimerRef.current = null;
    }, 2500);
  }, []);


  /* ---- useCallback：缓存新增课程函数 ---- */
  const handleAddCourse = useCallback((newCourse) => {
    setCourses((prev) => [newCourse, ...prev]);
    showToast(`「${newCourse.name}」添加成功`);
  }, [setCourses, showToast]);


  /* ---- useCallback：缓存删除课程函数 ---- */
  const handleDeleteCourse = useCallback((id) => {
    setCourses((prev) => {
      const course = prev.find((c) => c.id === id);
      if (course) showToast(`「${course.name}」已删除`, "error");
      return prev.filter((c) => c.id !== id);
    });
  }, [setCourses, showToast]);


  /* ---- useCallback：缓存编辑课程函数 ---- */
  const handleEditCourse = useCallback((course) => {
    setEditingCourse(course);
  }, []);

  const handleSaveEdit = useCallback((updatedCourse) => {
    setCourses((prev) => prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c)));
    setEditingCourse(null);
    showToast(`「${updatedCourse.name}」修改成功`);
  }, [setCourses, showToast]);

  const handleCloseEdit = useCallback(() => {
    setEditingCourse(null);
  }, []);


  /* ---- useCallback：缓存学习按钮回调 ---- */
  const handleLearn = useCallback((course) => {
    showToast(`开始学习「${course.name}」`, "info");
  }, [showToast]);


  /* ---- useCallback：缓存搜索输入回调 ---- */
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);


  /* ---- useCallback：缓存分类筛选回调 ---- */
  const handleFilterChange = useCallback((category) => {
    setActiveCategory(category);
  }, []);


  /* ---- useEffect：组件卸载时清理 toast 定时器 ---- */
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);


  /* ---- 渲染 ---- */
  return (
    <div className="app">
      {/* 顶部导航 - props 传递 courseCount */}
      <Header courseCount={courses.length} />

      <main className="main-content">
        {/* 工具栏：搜索 + 新增 */}
        <div className="toolbar">
          <SearchBar value={searchQuery} onChange={handleSearchChange} />
          <AddCourse onAdd={handleAddCourse} categories={CATEGORIES} />
        </div>

        {/* 分类筛选 + 统计 - props 传递筛选状态和统计数据 */}
        <FilterBar
          activeCategory={activeCategory}
          onFilter={handleFilterChange}
          courseCount={filteredCourses.length}
          categoryStats={categoryStats}
        />

        {/* 课程列表 - props 传递过滤后的课程和操作函数 */}
        <CourseList
          courses={filteredCourses}
          onDelete={handleDeleteCourse}
          onEdit={handleEditCourse}
          onLearn={handleLearn}
          searchQuery={debouncedSearch}
        />
      </main>

      <footer className="app-footer">
        <p>React 课程管理系统 &copy; 2026 — React 18 + useState + useEffect + useRef + useMemo + useCallback</p>
      </footer>

      {/* 条件渲染：编辑弹窗 */}
      {editingCourse && (
        <EditModal
          course={editingCourse}
          onSave={handleSaveEdit}
          onClose={handleCloseEdit}
        />
      )}

      {/* Toast 提示 */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
}


/* ========================================================================
   渲染挂载
   ======================================================================== */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
