'use client'

import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'gtd-local-pro-state'
const LEGACY_STORAGE_KEY = 'codex-todo-reminders'

const priorityLabels = {
  low: '低',
  medium: '中',
  high: '高',
}

const repeatLabels = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
}

const defaultPerspectiveForm = {
  name: '',
  projectId: 'any',
  tagId: 'any',
  flagged: 'any',
  status: 'active',
  priority: 'any',
  dateRange: 'any',
}

function todayInput(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function addDays(value, days) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeTask(task) {
  return {
    id: task.id || createId('task'),
    title: task.title || '未命名任务',
    note: task.note || '',
    projectId: task.projectId || '',
    tagIds: Array.isArray(task.tagIds) ? task.tagIds : [],
    flagged: Boolean(task.flagged),
    priority: task.priority || 'medium',
    status: task.status || (task.done ? 'completed' : 'active'),
    dueDate: task.dueDate || (task.dueAt ? task.dueAt.slice(0, 10) : ''),
    deferDate: task.deferDate || '',
    plannedDate: task.plannedDate || '',
    repeat: task.repeat || 'none',
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || (task.done ? new Date().toISOString() : ''),
  }
}

function createInitialState() {
  const projects = [
    {
      id: 'project-launch',
      name: '产品发布',
      folder: '工作',
      type: 'sequential',
      status: 'active',
      reviewEveryDays: 7,
      nextReviewDate: todayInput(),
      lastReviewedAt: '',
    },
    {
      id: 'project-home',
      name: '家庭整理',
      folder: '生活',
      type: 'parallel',
      status: 'active',
      reviewEveryDays: 14,
      nextReviewDate: todayInput(3),
      lastReviewedAt: '',
    },
  ]

  const tags = [
    { id: 'tag-focus', name: '深度工作', color: '#2f6fed' },
    { id: 'tag-quick', name: '15 分钟', color: '#16825d' },
    { id: 'tag-errand', name: '外出', color: '#c66a00' },
  ]

  return {
    tasks: [
      {
        id: createId('task'),
        title: '整理发布前检查清单',
        note: '确认文案、截图、上线步骤和负责人。',
        projectId: 'project-launch',
        tagIds: ['tag-focus'],
        flagged: true,
        priority: 'high',
        status: 'active',
        dueDate: todayInput(),
        deferDate: '',
        plannedDate: todayInput(),
        repeat: 'none',
        createdAt: new Date().toISOString(),
        completedAt: '',
      },
      {
        id: createId('task'),
        title: '把杂物柜分区标记',
        note: '先做一个可维持的小版本。',
        projectId: 'project-home',
        tagIds: ['tag-quick'],
        flagged: false,
        priority: 'medium',
        status: 'active',
        dueDate: todayInput(2),
        deferDate: todayInput(1),
        plannedDate: todayInput(2),
        repeat: 'none',
        createdAt: new Date().toISOString(),
        completedAt: '',
      },
      {
        id: createId('task'),
        title: '捕捉一个还没整理的想法',
        note: 'Inbox 里只需要先记下来，稍后再分配项目和标签。',
        projectId: '',
        tagIds: [],
        flagged: false,
        priority: 'low',
        status: 'active',
        dueDate: '',
        deferDate: '',
        plannedDate: '',
        repeat: 'none',
        createdAt: new Date().toISOString(),
        completedAt: '',
      },
    ],
    projects,
    tags,
    perspectives: [
      {
        id: 'perspective-deep',
        name: '今天的深度工作',
        filters: {
          projectId: 'any',
          tagId: 'tag-focus',
          flagged: 'any',
          status: 'active',
          priority: 'any',
          dateRange: 'today',
        },
      },
    ],
  }
}

function migrateLegacyTasks() {
  if (typeof window === 'undefined') return null

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!legacy) return null

  try {
    const parsed = JSON.parse(legacy)
    if (!Array.isArray(parsed)) return null

    const initial = createInitialState()
    return {
      ...initial,
      tasks: parsed.map((task) =>
        normalizeTask({
          ...task,
          dueDate: task.dueAt ? task.dueAt.slice(0, 10) : '',
          status: task.done ? 'completed' : 'active',
        }),
      ),
    }
  } catch {
    return null
  }
}

function loadState() {
  if (typeof window === 'undefined') return createInitialState()

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return {
        ...createInitialState(),
        ...parsed,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        perspectives: Array.isArray(parsed.perspectives) ? parsed.perspectives : [],
      }
    } catch {
      return createInitialState()
    }
  }

  return migrateLegacyTasks() || createInitialState()
}

function isToday(value) {
  return value === todayInput()
}

function isPast(value) {
  return value && value < todayInput()
}

function isAvailable(task) {
  return !task.deferDate || task.deferDate <= todayInput()
}

function taskDate(task) {
  return task.dueDate || task.plannedDate || task.deferDate || ''
}

function formatDate(value) {
  if (!value) return '未设日期'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${value}T12:00:00`))
}

function getTaskBadges(task) {
  const badges = []
  if (task.flagged) badges.push('旗标')
  if (task.dueDate) badges.push(`到期 ${formatDate(task.dueDate)}`)
  if (task.plannedDate) badges.push(`计划 ${formatDate(task.plannedDate)}`)
  if (task.deferDate && !isAvailable(task)) badges.push(`延期至 ${formatDate(task.deferDate)}`)
  if (task.repeat !== 'none') badges.push(repeatLabels[task.repeat])
  return badges
}

function sortTasks(a, b) {
  if (a.status !== b.status) return a.status === 'completed' ? 1 : -1
  if (a.flagged !== b.flagged) return a.flagged ? -1 : 1
  const priorityScore = { high: 0, medium: 1, low: 2 }
  if (a.priority !== b.priority) return priorityScore[a.priority] - priorityScore[b.priority]
  return (taskDate(a) || '9999-12-31').localeCompare(taskDate(b) || '9999-12-31')
}

function applyPerspective(tasks, filters) {
  return tasks.filter((task) => {
    if (filters.status === 'active' && task.status !== 'active') return false
    if (filters.status === 'completed' && task.status !== 'completed') return false
    if (filters.projectId !== 'any' && task.projectId !== filters.projectId) return false
    if (filters.tagId !== 'any' && !task.tagIds.includes(filters.tagId)) return false
    if (filters.flagged === 'yes' && !task.flagged) return false
    if (filters.flagged === 'no' && task.flagged) return false
    if (filters.priority !== 'any' && task.priority !== filters.priority) return false
    if (filters.dateRange === 'today' && ![task.dueDate, task.plannedDate, task.deferDate].some(isToday)) return false
    if (filters.dateRange === 'overdue' && !isPast(task.dueDate)) return false
    if (filters.dateRange === 'week') {
      const date = taskDate(task)
      if (!date || date < todayInput() || date > todayInput(6)) return false
    }
    return true
  })
}

function nextRepeatDate(task) {
  if (task.repeat === 'daily') return addDays(task.dueDate || todayInput(), 1)
  if (task.repeat === 'weekly') return addDays(task.dueDate || todayInput(), 7)
  if (task.repeat === 'monthly') {
    const date = new Date(`${task.dueDate || todayInput()}T12:00:00`)
    date.setMonth(date.getMonth() + 1)
    return date.toISOString().slice(0, 10)
  }
  return ''
}

export default function TodoApp() {
  const [state, setState] = useState(loadState)
  const [view, setView] = useState('inbox')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [quickExpanded, setQuickExpanded] = useState(false)
  const [toast, setToast] = useState('')
  const [taskForm, setTaskForm] = useState({
    title: '',
    note: '',
    projectId: '',
    tagIds: [],
    flagged: false,
    priority: 'medium',
    dueDate: '',
    deferDate: '',
    plannedDate: '',
    repeat: 'none',
  })
  const [perspectiveForm, setPerspectiveForm] = useState(defaultPerspectiveForm)
  const [newProjectName, setNewProjectName] = useState('')
  const [newTagName, setNewTagName] = useState('')

  const { tasks, projects, tags, perspectives } = state
  const effectiveSelectedTaskId =
    selectedTaskId && tasks.some((task) => task.id === selectedTaskId)
      ? selectedTaskId
      : tasks[0]?.id || ''
  const selectedTask = tasks.find((task) => task.id === effectiveSelectedTaskId)

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const projectTaskMap = useMemo(() => {
    return projects.reduce((acc, project) => {
      const projectTasks = tasks
        .filter((task) => task.projectId === project.id && task.status === 'active')
        .sort(sortTasks)
      acc[project.id] = projectTasks
      return acc
    }, {})
  }, [projects, tasks])

  const availableTaskIds = useMemo(() => {
    const ids = new Set()
    projects.forEach((project) => {
      const projectTasks = projectTaskMap[project.id] || []
      if (project.type === 'sequential') {
        if (projectTasks[0]) ids.add(projectTasks[0].id)
      } else {
        projectTasks.forEach((task) => ids.add(task.id))
      }
    })
    tasks.filter((task) => !task.projectId).forEach((task) => ids.add(task.id))
    return ids
  }, [projectTaskMap, projects, tasks])

  const stats = useMemo(() => {
    const active = tasks.filter((task) => task.status === 'active')
    return {
      inbox: active.filter((task) => !task.projectId).length,
      active: active.length,
      flagged: active.filter((task) => task.flagged).length,
      overdue: active.filter((task) => isPast(task.dueDate)).length,
      review: projects.filter((project) => project.status === 'active' && project.nextReviewDate <= todayInput()).length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    }
  }, [projects, tasks])

  const forecastDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = todayInput(index)
      const dayTasks = tasks.filter(
        (task) =>
          task.status === 'active' &&
          !isPast(task.dueDate) &&
          [task.dueDate, task.plannedDate, task.deferDate].includes(date),
      )
      return { date, tasks: dayTasks }
    })
  }, [tasks])

  const activePerspective = perspectives.find((perspective) => view === `perspective:${perspective.id}`)

  const visibleTasks = useMemo(() => {
    let list = tasks
    if (view === 'inbox') list = tasks.filter((task) => task.status === 'active' && !task.projectId)
    if (view === 'projects') list = tasks.filter((task) => task.status === 'active' && task.projectId)
    if (view === 'tags') list = tasks.filter((task) => task.status === 'active' && task.tagIds.length > 0)
    if (view === 'forecast') list = tasks.filter((task) => task.status === 'active' && (isPast(task.dueDate) || [task.dueDate, task.plannedDate, task.deferDate].some(Boolean)))
    if (view === 'flagged') list = tasks.filter((task) => task.status === 'active' && task.flagged)
    if (view === 'review') {
      const reviewProjectIds = projects
        .filter((project) => project.status === 'active' && project.nextReviewDate <= todayInput())
        .map((project) => project.id)
      list = tasks.filter((task) => task.status === 'active' && reviewProjectIds.includes(task.projectId))
    }
    if (view === 'completed') list = tasks.filter((task) => task.status === 'completed')
    if (activePerspective) list = applyPerspective(tasks, activePerspective.filters)

    return [...list].sort(sortTasks)
  }, [activePerspective, projects, tasks, view])

  const groupedProjects = useMemo(() => {
    return projects.reduce((acc, project) => {
      const folder = project.folder || '未分组'
      acc[folder] = acc[folder] || []
      acc[folder].push(project)
      return acc
    }, {})
  }, [projects])

  function updateTask(id, patch) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    }))
  }

  function addTask(event) {
    event.preventDefault()
    const title = taskForm.title.trim()
    if (!title) return

    const task = normalizeTask({
      ...taskForm,
      id: createId('task'),
      title,
      note: taskForm.note.trim(),
      createdAt: new Date().toISOString(),
    })

    setState((current) => ({ ...current, tasks: [task, ...current.tasks] }))
    setSelectedTaskId(task.id)
    setTaskForm({
      title: '',
      note: '',
      projectId: '',
      tagIds: [],
      flagged: false,
      priority: 'medium',
      dueDate: '',
      deferDate: '',
      plannedDate: '',
      repeat: 'none',
    })
    setToast('已收集到 Inbox')
  }

  function toggleComplete(task) {
    if (task.status === 'completed') {
      updateTask(task.id, { status: 'active', completedAt: '' })
      return
    }

    if (task.repeat !== 'none') {
      const repeated = normalizeTask({
        ...task,
        id: createId('task'),
        dueDate: nextRepeatDate(task),
        plannedDate: nextRepeatDate(task),
        status: 'active',
        completedAt: '',
        createdAt: new Date().toISOString(),
      })
      setState((current) => ({
        ...current,
        tasks: current.tasks
          .map((item) =>
            item.id === task.id
              ? { ...item, status: 'completed', completedAt: new Date().toISOString() }
              : item,
          )
          .concat(repeated),
      }))
      setToast('已完成，并生成下一次重复任务')
      return
    }

    updateTask(task.id, { status: 'completed', completedAt: new Date().toISOString() })
  }

  function removeTask(id) {
    setState((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }))
  }

  function addProject(event) {
    event.preventDefault()
    const name = newProjectName.trim()
    if (!name) return
    setState((current) => ({
      ...current,
      projects: [
        ...current.projects,
        {
          id: createId('project'),
          name,
          folder: '新项目',
          type: 'parallel',
          status: 'active',
          reviewEveryDays: 7,
          nextReviewDate: todayInput(7),
          lastReviewedAt: '',
        },
      ],
    }))
    setNewProjectName('')
  }

  function addTag(event) {
    event.preventDefault()
    const name = newTagName.trim()
    if (!name) return
    setState((current) => ({
      ...current,
      tags: [
        ...current.tags,
        { id: createId('tag'), name, color: ['#2f6fed', '#16825d', '#c66a00', '#9b4dcc'][current.tags.length % 4] },
      ],
    }))
    setNewTagName('')
  }

  function savePerspective(event) {
    event.preventDefault()
    const name = perspectiveForm.name.trim()
    if (!name) return
    const perspective = {
      id: createId('perspective'),
      name,
      filters: {
        projectId: perspectiveForm.projectId,
        tagId: perspectiveForm.tagId,
        flagged: perspectiveForm.flagged,
        status: perspectiveForm.status,
        priority: perspectiveForm.priority,
        dateRange: perspectiveForm.dateRange,
      },
    }
    setState((current) => ({ ...current, perspectives: [...current.perspectives, perspective] }))
    setPerspectiveForm(defaultPerspectiveForm)
    setView(`perspective:${perspective.id}`)
  }

  function reviewProject(project) {
    setState((current) => ({
      ...current,
      projects: current.projects.map((item) =>
        item.id === project.id
          ? {
              ...item,
              lastReviewedAt: new Date().toISOString(),
              nextReviewDate: addDays(todayInput(), item.reviewEveryDays || 7),
            }
          : item,
      ),
    }))
    setToast(`已复盘：${project.name}`)
  }

  function toggleTagInForm(tagId) {
    setTaskForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId)
        ? current.tagIds.filter((id) => id !== tagId)
        : [...current.tagIds, tagId],
    }))
  }

  function toggleTaskTag(task, tagId) {
    const tagIds = task.tagIds.includes(tagId)
      ? task.tagIds.filter((id) => id !== tagId)
      : [...task.tagIds, tagId]
    updateTask(task.id, { tagIds })
  }

  function renderTaskList() {
    if (visibleTasks.length === 0) {
      return (
        <div className="empty-state">
          <h3>这个视角暂时很安静</h3>
          <p>把想法先放进 Inbox，再逐步整理成项目、标签和日期。</p>
        </div>
      )
    }

    return visibleTasks.map((task) => {
      const project = projects.find((item) => item.id === task.projectId)
      const available = isAvailable(task) && availableTaskIds.has(task.id)
      return (
        <article
          className={`task-row ${selectedTask?.id === task.id ? 'selected' : ''} ${task.status} ${available ? '' : 'blocked'}`}
          key={task.id}
          onClick={() => setSelectedTaskId(task.id)}
        >
          <button
            className="check-button"
            type="button"
            aria-label={task.status === 'completed' ? '标记为未完成' : '标记为完成'}
            onClick={(event) => {
              event.stopPropagation()
              toggleComplete(task)
            }}
          >
            {task.status === 'completed' ? '✓' : ''}
          </button>
          <div className="task-main">
            <div className="task-title-line">
              <h3>{task.title}</h3>
              <span className={`priority ${task.priority}`}>{priorityLabels[task.priority]}</span>
            </div>
            <p>{task.note || '无备注'}</p>
            <div className="task-meta">
              <span>{project ? project.name : 'Inbox'}</span>
              {!available ? <strong>尚不可执行</strong> : null}
              {getTaskBadges(task).map((badge) => (
                <span key={badge}>{badge}</span>
              ))}
            </div>
          </div>
        </article>
      )
    })
  }

  return (
    <main className="gtd-app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="" aria-hidden="true" />
          <div>
            <p>Local GTD Pro</p>
            <h1>专注工作台</h1>
          </div>
        </div>

        <nav className="nav-stack" aria-label="标准视角">
          {[
            ['inbox', 'Inbox', stats.inbox],
            ['projects', 'Projects', stats.active],
            ['tags', 'Tags', tags.length],
            ['forecast', 'Forecast', stats.overdue],
            ['flagged', 'Flagged', stats.flagged],
            ['review', 'Review', stats.review],
            ['completed', 'Completed', stats.completed],
          ].map(([id, label, count]) => (
            <button className={view === id ? 'active' : ''} key={id} type="button" onClick={() => setView(id)}>
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </nav>

        <section className="sidebar-section">
          <h2>自定义视角</h2>
          <div className="nav-stack compact">
            {perspectives.map((perspective) => (
              <button
                className={view === `perspective:${perspective.id}` ? 'active' : ''}
                key={perspective.id}
                type="button"
                onClick={() => setView(`perspective:${perspective.id}`)}
              >
                <span>{perspective.name}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="task-column">
        <header className="topbar">
          <div>
            <p className="eyebrow">当前视角</p>
            <h2>{activePerspective?.name || view[0].toUpperCase() + view.slice(1)}</h2>
          </div>
          <div className="summary-strip">
            <span>{stats.active} 个活动</span>
            <span>{stats.overdue} 个过期</span>
            <span>{stats.review} 个待复盘</span>
          </div>
        </header>

        <form className="quick-entry" onSubmit={addTask}>
          <div className="quick-line">
            <input
              aria-label="快速录入任务"
              placeholder="快速收集一个动作，默认进入 Inbox"
              value={taskForm.title}
              onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
            />
            <button type="button" className="ghost-button" onClick={() => setQuickExpanded((value) => !value)}>
              {quickExpanded ? '收起' : '细节'}
            </button>
            <button type="submit">收集</button>
          </div>

          {quickExpanded ? (
            <div className="quick-details">
              <textarea
                placeholder="备注、上下文、下一步线索"
                rows="2"
                value={taskForm.note}
                onChange={(event) => setTaskForm({ ...taskForm, note: event.target.value })}
              />
              <div className="field-grid">
                <label>
                  项目
                  <select value={taskForm.projectId} onChange={(event) => setTaskForm({ ...taskForm, projectId: event.target.value })}>
                    <option value="">Inbox</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  优先级
                  <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </label>
                <label>
                  到期
                  <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} />
                </label>
                <label>
                  延期
                  <input type="date" value={taskForm.deferDate} onChange={(event) => setTaskForm({ ...taskForm, deferDate: event.target.value })} />
                </label>
                <label>
                  计划
                  <input type="date" value={taskForm.plannedDate} onChange={(event) => setTaskForm({ ...taskForm, plannedDate: event.target.value })} />
                </label>
                <label>
                  重复
                  <select value={taskForm.repeat} onChange={(event) => setTaskForm({ ...taskForm, repeat: event.target.value })}>
                    {Object.entries(repeatLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="chip-row">
                <button
                  className={taskForm.flagged ? 'chip active' : 'chip'}
                  type="button"
                  onClick={() => setTaskForm({ ...taskForm, flagged: !taskForm.flagged })}
                >
                  旗标
                </button>
                {tags.map((tag) => (
                  <button className={taskForm.tagIds.includes(tag.id) ? 'chip active' : 'chip'} key={tag.id} type="button" onClick={() => toggleTagInForm(tag.id)}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </form>

        {view === 'forecast' ? (
          <section className="forecast-strip" aria-label="未来七天">
            <article className="forecast-day overdue">
              <span>过期</span>
              <strong>{stats.overdue}</strong>
            </article>
            {forecastDays.map((day) => (
              <article className={day.date === todayInput() ? 'forecast-day today' : 'forecast-day'} key={day.date}>
                <span>{formatDate(day.date)}</span>
                <strong>{day.tasks.length}</strong>
              </article>
            ))}
          </section>
        ) : null}

        {view === 'review' ? (
          <section className="review-queue">
            {projects
              .filter((project) => project.status === 'active' && project.nextReviewDate <= todayInput())
              .map((project) => (
                <article key={project.id}>
                  <div>
                    <h3>{project.name}</h3>
                    <p>{(projectTaskMap[project.id] || []).length} 个未完成动作，下次复盘原定 {formatDate(project.nextReviewDate)}</p>
                  </div>
                  <button type="button" onClick={() => reviewProject(project)}>
                    已复盘
                  </button>
                </article>
              ))}
          </section>
        ) : null}

        <section className="task-list" aria-label="任务列表">
          {renderTaskList()}
        </section>
      </section>

      <aside className="detail-panel">
        {selectedTask ? (
          <>
            <header className="detail-header">
              <p className="eyebrow">任务详情</p>
              <button type="button" className={selectedTask.flagged ? 'flag-button active' : 'flag-button'} onClick={() => updateTask(selectedTask.id, { flagged: !selectedTask.flagged })}>
                旗标
              </button>
            </header>

            <label>
              标题
              <input value={selectedTask.title} onChange={(event) => updateTask(selectedTask.id, { title: event.target.value })} />
            </label>
            <label>
              备注
              <textarea rows="5" value={selectedTask.note} onChange={(event) => updateTask(selectedTask.id, { note: event.target.value })} />
            </label>
            <div className="field-grid detail-fields">
              <label>
                项目
                <select value={selectedTask.projectId} onChange={(event) => updateTask(selectedTask.id, { projectId: event.target.value })}>
                  <option value="">Inbox</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                优先级
                <select value={selectedTask.priority} onChange={(event) => updateTask(selectedTask.id, { priority: event.target.value })}>
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </label>
              <label>
                到期
                <input type="date" value={selectedTask.dueDate} onChange={(event) => updateTask(selectedTask.id, { dueDate: event.target.value })} />
              </label>
              <label>
                延期
                <input type="date" value={selectedTask.deferDate} onChange={(event) => updateTask(selectedTask.id, { deferDate: event.target.value })} />
              </label>
              <label>
                计划
                <input type="date" value={selectedTask.plannedDate} onChange={(event) => updateTask(selectedTask.id, { plannedDate: event.target.value })} />
              </label>
              <label>
                重复
                <select value={selectedTask.repeat} onChange={(event) => updateTask(selectedTask.id, { repeat: event.target.value })}>
                  {Object.entries(repeatLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <section className="detail-section">
              <h2>标签</h2>
              <div className="chip-row">
                {tags.map((tag) => (
                  <button className={selectedTask.tagIds.includes(tag.id) ? 'chip active' : 'chip'} key={tag.id} type="button" onClick={() => toggleTaskTag(selectedTask, tag.id)}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </section>

            <div className="detail-actions">
              <button type="button" onClick={() => toggleComplete(selectedTask)}>
                {selectedTask.status === 'completed' ? '恢复为活动' : '完成'}
              </button>
              <button type="button" className="danger-button" onClick={() => removeTask(selectedTask.id)}>
                删除
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h3>还没有任务</h3>
            <p>先从快速收集开始。</p>
          </div>
        )}

        <section className="detail-section">
          <h2>项目</h2>
          {Object.entries(groupedProjects).map(([folder, folderProjects]) => (
            <div className="project-group" key={folder}>
              <p>{folder}</p>
              {folderProjects.map((project) => (
                <article key={project.id}>
                  <span>{project.name}</span>
                  <strong>{project.type === 'sequential' ? '顺序' : '并行'}</strong>
                </article>
              ))}
            </div>
          ))}
          <form className="mini-form" onSubmit={addProject}>
            <input placeholder="新项目" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} />
            <button type="submit">添加</button>
          </form>
        </section>

        <section className="detail-section">
          <h2>标签</h2>
          <form className="mini-form" onSubmit={addTag}>
            <input placeholder="新标签" value={newTagName} onChange={(event) => setNewTagName(event.target.value)} />
            <button type="submit">添加</button>
          </form>
        </section>

        <section className="detail-section">
          <h2>保存透视</h2>
          <form className="perspective-form" onSubmit={savePerspective}>
            <input placeholder="透视名称" value={perspectiveForm.name} onChange={(event) => setPerspectiveForm({ ...perspectiveForm, name: event.target.value })} />
            <select value={perspectiveForm.projectId} onChange={(event) => setPerspectiveForm({ ...perspectiveForm, projectId: event.target.value })}>
              <option value="any">任意项目</option>
              <option value="">Inbox</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select value={perspectiveForm.tagId} onChange={(event) => setPerspectiveForm({ ...perspectiveForm, tagId: event.target.value })}>
              <option value="any">任意标签</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <div className="field-grid">
              <select value={perspectiveForm.flagged} onChange={(event) => setPerspectiveForm({ ...perspectiveForm, flagged: event.target.value })}>
                <option value="any">旗标不限</option>
                <option value="yes">只看旗标</option>
                <option value="no">无旗标</option>
              </select>
              <select value={perspectiveForm.status} onChange={(event) => setPerspectiveForm({ ...perspectiveForm, status: event.target.value })}>
                <option value="active">活动</option>
                <option value="completed">已完成</option>
                <option value="any">全部</option>
              </select>
              <select value={perspectiveForm.priority} onChange={(event) => setPerspectiveForm({ ...perspectiveForm, priority: event.target.value })}>
                <option value="any">优先级不限</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
              <select value={perspectiveForm.dateRange} onChange={(event) => setPerspectiveForm({ ...perspectiveForm, dateRange: event.target.value })}>
                <option value="any">日期不限</option>
                <option value="today">今天</option>
                <option value="week">未来七天</option>
                <option value="overdue">已过期</option>
              </select>
            </div>
            <button type="submit">保存透视</button>
          </form>
        </section>
      </aside>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </main>
  )
}
