'use client'

import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'codex-todo-reminders'

const priorityLabels = {
  low: '低',
  medium: '中',
  high: '高',
}

const priorityNames = {
  low: '低优先级',
  medium: '中优先级',
  high: '高优先级',
}

const filters = [
  ['all', '全部'],
  ['active', '进行中'],
  ['overdue', '已逾期'],
  ['done', '已完成'],
]

function getDateTimeInputValue(offsetMinutes = 0) {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function createInitialTasks() {
  return [
    {
      id: crypto.randomUUID(),
      title: '整理今日最重要的三件事',
      note: '先把关键任务放进队列，再按截止时间推进。',
      dueAt: getDateTimeInputValue(60),
      priority: 'high',
      done: false,
      reminded: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: '复盘本周待办提醒',
      note: '检查已完成事项，移除不再需要的提醒。',
      dueAt: getDateTimeInputValue(8 * 60),
      priority: 'medium',
      done: false,
      reminded: false,
      createdAt: new Date().toISOString(),
    },
  ]
}

function readSavedTasks() {
  if (typeof window === 'undefined') return []

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : null
    return Array.isArray(parsed) ? parsed : createInitialTasks()
  } catch {
    return createInitialTasks()
  }
}

function formatDueTime(value) {
  if (!value) return '未设置截止时间'

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getTaskStatus(task) {
  if (task.done) return 'done'
  if (!task.dueAt) return 'open'

  const diff = new Date(task.dueAt).getTime() - Date.now()
  if (diff < 0) return 'overdue'
  if (diff <= 60 * 60 * 1000) return 'soon'
  return 'open'
}

function getStatusText(status) {
  if (status === 'done') return '已完成'
  if (status === 'overdue') return '已逾期'
  if (status === 'soon') return '即将到期'
  return '待处理'
}

export default function TodoApp() {
  const [tasks, setTasks] = useState(readSavedTasks)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState(() => ({
    title: '',
    note: '',
    dueAt: typeof window === 'undefined' ? '' : getDateTimeInputValue(30),
    priority: 'medium',
  }))
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const timer = window.setInterval(() => {
      const now = Date.now()
      const dueTask = tasks.find(
        (task) =>
          !task.done &&
          !task.reminded &&
          task.dueAt &&
          new Date(task.dueAt).getTime() <= now,
      )

      if (!dueTask) return

      setToast(`提醒到期：${dueTask.title}`)
      setTasks((current) =>
        current.map((task) =>
          task.id === dueTask.id ? { ...task, reminded: true } : task,
        ),
      )
    }, 1000)

    return () => window.clearInterval(timer)
  }, [tasks])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const stats = useMemo(() => {
    const active = tasks.filter((task) => !task.done)
    return {
      total: tasks.length,
      active: active.length,
      done: tasks.length - active.length,
      overdue: active.filter((task) => getTaskStatus(task) === 'overdue').length,
    }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (filter === 'active') return !task.done
        if (filter === 'done') return task.done
        if (filter === 'overdue') return getTaskStatus(task) === 'overdue'
        return true
      })
      .sort((a, b) => {
        if (a.done !== b.done) return Number(a.done) - Number(b.done)
        if (!a.dueAt) return 1
        if (!b.dueAt) return -1
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      })
  }, [filter, tasks])

  function handleSubmit(event) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return

    setTasks((current) => [
      {
        id: crypto.randomUUID(),
        title,
        note: form.note.trim(),
        dueAt: form.dueAt,
        priority: form.priority,
        done: false,
        reminded: false,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ])
    setForm({
      title: '',
      note: '',
      dueAt: getDateTimeInputValue(30),
      priority: 'medium',
    })
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done, reminded: task.done } : task,
      ),
    )
  }

  function removeTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  function postponeTask(id, minutes) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              dueAt: getDateTimeInputValue(minutes),
              done: false,
              reminded: false,
            }
          : task,
      ),
    )
  }

  const today = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="创建任务与今日概览">
        <header className="app-header">
          <div className="brand-lockup">
            <img className="app-logo" src="/logo.png" alt="" aria-hidden="true" />
            <div>
              <p className="eyebrow">Todo Reminder</p>
              <h1>把提醒排进清晰队列</h1>
            </div>
          </div>
          <div className="today" aria-label={`今天是${today}`}>
            <span>今天</span>
            {today}
          </div>
        </header>

        <section className="stats-grid" aria-label="任务统计">
          <div>
            <span>{stats.total}</span>
            <p>全部任务</p>
          </div>
          <div>
            <span>{stats.active}</span>
            <p>进行中</p>
          </div>
          <div>
            <span>{stats.overdue}</span>
            <p>已逾期</p>
          </div>
          <div>
            <span>{stats.done}</span>
            <p>已完成</p>
          </div>
        </section>

        <form className="task-form" onSubmit={handleSubmit}>
          <label>
            任务名称
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="例如：18:00 前发送项目进度"
            />
          </label>
          <label>
            备注
            <textarea
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              placeholder="补充背景、交付标准或下一步动作"
              rows="3"
            />
          </label>
          <div className="form-row">
            <label>
              提醒时间
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) => setForm({ ...form, dueAt: event.target.value })}
              />
            </label>
            <label>
              优先级
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm({ ...form, priority: event.target.value })
                }
              >
                <option value="low">低优先级</option>
                <option value="medium">中优先级</option>
                <option value="high">高优先级</option>
              </select>
            </label>
          </div>
          <button className="primary-action" type="submit">
            添加提醒
          </button>
        </form>
      </section>

      <section className="task-panel" aria-label="任务队列">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Task Queue</p>
            <h2>提醒队列</h2>
          </div>
          <div className="filters" aria-label="任务筛选">
            {filters.map(([value, label]) => (
              <button
                className={filter === value ? 'active' : ''}
                key={value}
                type="button"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="task-list">
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <h3>这个视图暂时没有任务</h3>
              <p>新增一个提醒，或切换筛选查看其他状态的任务。</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const status = getTaskStatus(task)
              return (
                <article className={`task-item ${status}`} key={task.id}>
                  <button
                    className="check-button"
                    type="button"
                    aria-label={task.done ? '标记为未完成' : '标记为已完成'}
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.done ? '✓' : ''}
                  </button>
                  <div className="task-content">
                    <div className="task-title-row">
                      <h3>{task.title}</h3>
                      <div className="task-badges" aria-label="任务状态">
                        <span className={`status ${status}`}>{getStatusText(status)}</span>
                        <span
                          className={`priority ${task.priority}`}
                          title={priorityNames[task.priority]}
                        >
                          {priorityLabels[task.priority]}
                        </span>
                      </div>
                    </div>
                    {task.note ? <p>{task.note}</p> : null}
                    <div className="task-meta">
                      <span>{formatDueTime(task.dueAt)}</span>
                      {task.reminded && !task.done ? <strong>已提醒</strong> : null}
                    </div>
                  </div>
                  <div className="task-actions">
                    <button type="button" onClick={() => postponeTask(task.id, 10)}>
                      推迟 10 分钟
                    </button>
                    <button type="button" onClick={() => removeTask(task.id)}>
                      删除
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </main>
  )
}
