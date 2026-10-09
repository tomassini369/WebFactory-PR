import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  User,
  PieChart,
  Bell,
  Calendar,
  Mail,
  FileEdit,
  MessageCircle,
  Search,
  Sun,
  Moon,
  Settings,
  Download,
  Plus,
  Check,
  MoreHorizontal,
  Trash2,
  Edit2,
  Share2,
  Briefcase,
  Paperclip,
  X,
  ChevronLeft,
  ChevronRight,
  Gift,
  CheckCircle2,
  FileText,
  Clock,
  LogOut,
  Send,
  TrendingUp,
  Activity,
  Shield,
  Zap,
  ExternalLink
} from 'lucide-react'
import './glassydashbord.css'

export default function GlassyDashboard({ onBackToLogin, userName = 'James' }) {
  // Theme State: 'dark' (Login v7 Cyber Luxury) or 'light' (Crystal Frost)
  const [theme, setTheme] = useState('dark')

  // Top Nav Tab State
  const [activeTab, setActiveTab] = useState('Dashboard')

  // Left Dock Active Item State
  const [activeDock, setActiveDock] = useState('grid')

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState('')

  // Chat / Messages state
  const [activeChatThread, setActiveChatThread] = useState(1)
  const [chatSearch, setChatSearch] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatThreads, setChatThreads] = useState([
    {
      id: 1,
      name: 'Ken Smith',
      role: 'Product Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      status: 'online',
      time: '12:42 PM',
      messages: [
        { id: 1, sender: 'Ken Smith', text: 'Hey James, how are the new glassy dashboard mockups progressing?', time: '12:35 PM', incoming: true },
        { id: 2, sender: 'James', text: 'Almost complete! Just finalized the curved navigation dock and frosted glass styling.', time: '12:38 PM', incoming: false },
        { id: 3, sender: 'Ken Smith', text: 'Awesome, client loved the initial preview. Can we review in 15 mins?', time: '12:42 PM', incoming: true }
      ]
    },
    {
      id: 2,
      name: 'Rachel Lee',
      role: 'Lead Motion Designer',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80',
      status: 'online',
      time: '11:15 AM',
      messages: [
        { id: 1, sender: 'Rachel Lee', text: 'Exported all 60fps micro-animation tokens for the glow buttons.', time: '11:15 AM', incoming: true }
      ]
    },
    {
      id: 3,
      name: 'Alex Johnson',
      role: 'Design Engineer',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
      status: 'offline',
      time: 'Yesterday',
      messages: [
        { id: 1, sender: 'Alex Johnson', text: 'Synced the SVG clip paths with Login v7 geometry.', time: 'Yesterday', incoming: true }
      ]
    }
  ])

  // Notes state
  const [notes, setNotes] = useState([
    {
      id: 1,
      title: 'Design System Guidelines',
      category: 'UI/UX',
      tagColor: '#ffd600',
      content: 'Maintain 40px backdrop-filter blur, 1px white border with 0.18 opacity, and 12px neon gold corner reflections.',
      date: 'Today, 2:15 PM'
    },
    {
      id: 2,
      title: 'Q3 Product Roadmap Review',
      category: 'Product',
      tagColor: '#06b6d4',
      content: 'Finalize developer handoff by Thursday. Client demo planned for Friday morning at 10:00 AM PST.',
      date: 'Yesterday'
    },
    {
      id: 3,
      title: 'Micro-Interaction Polish',
      category: 'Motion',
      tagColor: '#6366f1',
      content: 'Verify cubic-bezier(0.16, 1, 0.3, 1) spring physics on chip dock contact points.',
      date: '14 May'
    }
  ])
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteCategory, setNewNoteCategory] = useState('UI/UX')

  // Calendar agenda schedule state
  const [agendaEvents] = useState([
    { id: 1, time: '10:00 AM - 10:45 AM', title: 'Sprint Design Sync', location: 'Virtual Room 4', attendees: 5, color: '#6366f1' },
    { id: 2, time: '01:30 PM - 02:30 PM', title: 'Product Architecture Review', location: '4th Floor, Room 159', attendees: 3, color: '#ffd600' },
    { id: 3, time: '04:00 PM - 04:30 PM', title: 'Client Feedback Delivery', location: 'Executive Suite B', attendees: 8, color: '#06b6d4' }
  ])

  // Workflows state
  const [workflows, setWorkflows] = useState([
    { id: 1, name: 'GitHub Automated Release', trigger: 'Push to main branch', status: 'Active', color: '#10b981' },
    { id: 2, name: 'Figma Design Tokens Sync', trigger: 'Styles updated in library', status: 'Active', color: '#6366f1' },
    { id: 3, name: 'Slack Telemetry Webhook', trigger: 'Critical auth security alerts', status: 'Paused', color: '#ffd600' }
  ])

  // Integrations state
  const [integrations, setIntegrations] = useState([
    { id: 1, name: 'Figma', desc: 'Sync UI frames and design tokens directly', connected: true, icon: '🎨' },
    { id: 2, name: 'GitHub', desc: 'Auto-deploy commits and run CI checks', connected: true, icon: '🐙' },
    { id: 3, name: 'Slack', desc: 'Broadcast project updates and notifications', connected: true, icon: '💬' },
    { id: 4, name: 'Notion', desc: 'Knowledge base and team documentation', connected: false, icon: '📝' },
    { id: 5, name: 'Linear', desc: 'Issue tracking and agile sprint management', connected: false, icon: '⚡' },
    { id: 6, name: 'Google Cloud', desc: 'Compute infrastructure and KMS security', connected: true, icon: '☁️' }
  ])

  // Chat message sender
  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const newMsg = {
      id: Date.now(),
      sender: userName,
      text: chatInput.trim(),
      time: 'Just now',
      incoming: false
    }
    setChatThreads((prev) =>
      prev.map((t) =>
        t.id === activeChatThread
          ? { ...t, messages: [...t.messages, newMsg] }
          : t
      )
    )
    setChatInput('')
  }

  // Note saver
  const handleSaveNote = (e) => {
    e.preventDefault()
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return
    const newNote = {
      id: Date.now(),
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      category: newNoteCategory,
      tagColor: newNoteCategory === 'UI/UX' ? '#ffd600' : newNoteCategory === 'Product' ? '#06b6d4' : '#6366f1',
      date: 'Just now'
    }
    setNotes([newNote, ...notes])
    setNewNoteTitle('')
    setNewNoteContent('')
  }

  // Calendar Day Selection (May 2021)
  const [selectedDay, setSelectedDay] = useState(18)

  // Assignments Filter Category
  const [selectedFilter, setSelectedFilter] = useState('Motion design')

  // Modal State for Adding New Assignment / Note
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Motion design')
  const [newPriority, setNewPriority] = useState('High')

  // Board Meeting Status
  const [meetingAccepted, setMeetingAccepted] = useState(false)
  const [meetingRescheduled, setMeetingRescheduled] = useState(false)

  // Interactive Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Upcoming event',
      hasPulse: true,
      desc: 'Landing design meeting | Time: 120 min',
      badges: ['Sat, 10 May', '11 AM - 11:45 AM']
    },
    {
      id: 2,
      title: 'Message | Product design',
      hasPulse: false,
      desc: 'Message from Ken Smith',
      snippet: 'Hey team, just wanted to check in and see how the mockup looks...'
    }
  ])

  // Interactive Tasks State
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Conduct research',
      date: '4 May, 09:20 AM',
      duration: '02 h 45 m',
      progress: 90,
      color: 'emerald',
      comments: 4,
      attachments: 16
    },
    {
      id: 2,
      title: 'Schedule a meeting',
      date: '14 May, 12:45 AM',
      duration: '06 h 55 m',
      progress: 50,
      color: 'cyan',
      comments: 4,
      dueDate: '3 June'
    },
    {
      id: 3,
      title: 'Send out reminders',
      date: '21 May, 10:30 AM',
      duration: '01 h 30 m',
      progress: 10,
      color: 'gold',
      comments: 16,
      dueDate: '3 June'
    }
  ])

  // Interactive Assignments State
  const [assignments, setAssignments] = useState([
    {
      id: 1,
      title: 'Design a packaging concept for a new product',
      category: 'Motion design',
      tag: 'Package design',
      priority: 'High',
      assignee: 'Rachel Lee',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80'
    }
  ])

  // Interactive Metric Ring Status
  const [metricChecked, setMetricChecked] = useState(false)

  // Clear all notifications
  const handleClearNotifications = () => {
    setNotifications([])
  }

  // Remove individual notification
  const handleRemoveNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  // Add new assignment submit
  const handleAddAssignment = (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const newAssignment = {
      id: Date.now(),
      title: newTitle,
      category: newCategory,
      tag: `${newCategory} Task`,
      priority: newPriority,
      assignee: 'James (You)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'
    }

    setAssignments([newAssignment, ...assignments])
    setNewTitle('')
    setIsModalOpen(false)
  }

  // Calendar dates
  const daysOfWeek = [
    { day: 'Mon', num: 14 },
    { day: 'Tue', num: 15 },
    { day: 'Wed', num: 16 },
    { day: 'Thr', num: 17 },
    { day: 'Fr', num: 18 },
    { day: 'Sat', num: 19 },
    { day: 'Sun', num: 20 }
  ]

  // Filtered assignments
  const displayedAssignments =
    selectedFilter === 'All'
      ? assignments
      : assignments.filter((a) => a.category.toLowerCase().includes(selectedFilter.toLowerCase()))

  return (
    <div className={`glassy-dashboard-container theme-${theme}`}>
      {/* Ambient Lighting Orbs matching Login v7 */}
      <div className="gd-ambient-orbs" aria-hidden="true">
        <div className="gd-orb gd-orb-1" />
        <div className="gd-orb gd-orb-2" />
        <div className="gd-orb gd-orb-3" />
      </div>

      {/* Main Glass Console Window (Sleek Viewport Fit) */}
      <div className="gd-glass-console">
        {/* Subtle Signature Corner Chamfers from Login v7 */}
        <div className="gd-corner-chip gd-chip-tl" aria-hidden="true" />
        <div className="gd-corner-chip gd-chip-tr" aria-hidden="true" />
        <div className="gd-corner-chip gd-chip-bl" aria-hidden="true" />
        <div className="gd-corner-chip gd-chip-br" aria-hidden="true" />

        {/* ====================================================================
            LEFT CURVED NAVIGATION DOCK (EXACT MATCH TO REFERENCE IMAGE)
            ==================================================================== */}
        <aside className="gd-dock-rail" aria-label="Curved Dashboard Navigation">
          {/* Organic Wave Silhouette SVG */}
          <svg
            className="gd-dock-curve-svg"
            viewBox="0 0 74 640"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="curvedDockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#3730a3" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="curvedDockStroke" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="35%" stopColor="#ffd600" stopOpacity="0.55" />
                <stop offset="70%" stopColor="#ffffff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <path
              d="M 0,0 L 0,20 C 0,65 74,65 74,115 L 74,525 C 74,575 0,575 0,620 L 0,640 Z"
              fill="url(#curvedDockGrad)"
              stroke="url(#curvedDockStroke)"
              strokeWidth="1.2"
            />
          </svg>

          {/* Vertical Icon Rail - 8 Items Matching Screenshot Exactly */}
          <div className="gd-dock-icons-stack">
            {/* 1. Active App Grid Icon (Inside Rounded White Card) */}
            <button
              type="button"
              className={`gd-dock-icon-item ${activeDock === 'grid' ? 'active-white-box' : ''}`}
              onClick={() => { setActiveDock('grid'); setActiveTab('Dashboard'); }}
              title="Dashboard Overview"
            >
              <LayoutGrid size={20} />
            </button>

            {/* 2. User Profile */}
            <button
              type="button"
              className={`gd-dock-icon-item ${activeDock === 'user' ? 'active' : ''}`}
              onClick={() => { setActiveDock('user'); setActiveTab('Dashboard'); }}
              title="Profile & Accounts"
            >
              <User size={19} />
            </button>

            {/* 3. Pie Chart with Green PRO Pill */}
            <button
              type="button"
              className={`gd-dock-icon-item with-badge ${activeDock === 'chart' ? 'active' : ''}`}
              onClick={() => { setActiveDock('chart'); setActiveTab('Dashboard'); }}
              title="Analytics (PRO)"
            >
              <PieChart size={19} />
              <span className="gd-dock-green-pro-badge">PRO</span>
            </button>

            {/* 4. Bell Notifications */}
            <button
              type="button"
              className={`gd-dock-icon-item ${activeDock === 'bell' ? 'active' : ''}`}
              onClick={() => { setActiveDock('bell'); setActiveTab('Dashboard'); }}
              title="Notifications"
            >
              <Bell size={19} />
            </button>

            {/* 5. Calendar */}
            <button
              type="button"
              className={`gd-dock-icon-item ${activeDock === 'calendar' ? 'active' : ''}`}
              onClick={() => { setActiveDock('calendar'); setActiveTab('Dashboard'); }}
              title="Calendar & Timeline"
            >
              <Calendar size={19} />
            </button>

            {/* 6. Mail with Yellow Dot */}
            <button
              type="button"
              className={`gd-dock-icon-item ${activeDock === 'mail' ? 'active' : ''}`}
              onClick={() => { setActiveDock('mail'); setActiveTab('Dashboard'); }}
              title="Messages & Inbox"
            >
              <Mail size={19} />
              <span className="gd-dock-yellow-dot" />
            </button>

            {/* 7. Notes / Pencil */}
            <button
              type="button"
              className={`gd-dock-icon-item ${activeDock === 'notes' ? 'active' : ''}`}
              onClick={() => { setActiveDock('notes'); setActiveTab('Dashboard'); }}
              title="Notes & Editor"
            >
              <FileEdit size={19} />
            </button>

            {/* 8. Chat with Green Dot */}
            <button
              type="button"
              className={`gd-dock-icon-item ${activeDock === 'chat' ? 'active' : ''}`}
              onClick={() => { setActiveDock('chat'); setActiveTab('Dashboard'); }}
              title="Chat Discussions"
            >
              <MessageCircle size={19} />
              <span className="gd-dock-green-dot" />
            </button>
          </div>
        </aside>

        {/* ====================================================================
            MAIN VIEWPORT (EXACT FIT WITHOUT FULL-PAGE SCROLLING)
            ==================================================================== */}
        <main className="gd-main-viewport">
          {/* ==================================================================
              ROW 1: TOP ACTION BAR / HEADER
              ================================================================== */}
          <header className="gd-top-bar">
            {/* Left Tabs */}
            <div className="gd-top-tabs">
              {['Dashboard', 'Workflows', 'Integrations'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`gd-tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {activeTab === tab && <span className="tab-indicator" />}
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            {/* Center Search Bar */}
            <div className="gd-search-wrapper">
              <Search className="gd-search-icon" size={15} />
              <input
                type="text"
                className="gd-search-input"
                placeholder="Search or type command..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="gd-search-badge">⌘K</span>
            </div>

            {/* Right Action Controls */}
            <div className="gd-top-actions">
              {/* Theme Toggle: Light / Dark */}
              <div className="gd-theme-toggle" role="group" aria-label="Theme Switcher">
                <button
                  type="button"
                  className={`gd-theme-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <Sun size={12} />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  className={`gd-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon size={12} />
                  <span>Dark</span>
                </button>
              </div>

              {/* Notification Bell */}
              <button
                type="button"
                className="gd-icon-btn"
                title="Notifications"
                onClick={() => { setActiveDock('bell'); setActiveTab('Dashboard'); }}
              >
                <Bell size={15} />
                {notifications.length > 0 && <span className="gd-notif-dot" />}
              </button>

              {/* Settings Gear */}
              <button
                type="button"
                className="gd-icon-btn"
                title="Account Settings"
              >
                <Settings size={15} />
              </button>

              {/* Back to Login / Logout */}
              {onBackToLogin && (
                <button
                  type="button"
                  className="gd-icon-btn"
                  title="Back to Login / Sign Out"
                  onClick={onBackToLogin}
                >
                  <LogOut size={14} />
                </button>
              )}

              {/* Export data .xls */}
              <button
                type="button"
                className="gd-export-btn"
                onClick={() => alert('Exporting dashboard telemetry as .xls spreadsheet...')}
              >
                <Download size={13} />
                <span>Export data</span>
                <span className="gd-xls-tag">.xls</span>
              </button>

              {/* Add new board CTA */}
              <button
                type="button"
                className="gd-primary-btn"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus size={15} />
                <span>Add new board</span>
              </button>
            </div>
          </header>

          {activeTab === 'Workflows' ? (
            /* ==================== WORKFLOWS VIEW ==================== */
            <div className="gd-view-wrapper">
              <div className="gd-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="gd-card-header" style={{ marginBottom: 12 }}>
                  <div className="gd-card-title-group">
                    <Zap size={16} color="#ffd600" />
                    <h3 className="gd-card-heading">Automated Workflows & CI/CD Pipelines</h3>
                  </div>
                  <button
                    type="button"
                    className="gd-primary-btn"
                    style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => alert('New workflow pipeline created')}
                  >
                    <Plus size={13} />
                    <span>Create Workflow</span>
                  </button>
                </div>
                <div className="gd-grid-showcase">
                  {workflows.map((wf) => (
                    <div key={wf.id} className="gd-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="gd-tag-pill" style={{ background: `${wf.color}20`, color: wf.color, borderColor: `${wf.color}40` }}>
                          ● {wf.status}
                        </span>
                        <button
                          type="button"
                          className="gd-micro-btn"
                          onClick={() => {
                            setWorkflows(workflows.map((w) => w.id === wf.id ? { ...w, status: w.status === 'Active' ? 'Paused' : 'Active' } : w))
                          }}
                        >
                          <MoreHorizontal size={13} />
                        </button>
                      </div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gd-text-primary)' }}>{wf.name}</h4>
                      <p style={{ fontSize: 11, color: 'var(--gd-text-muted)' }}>Trigger: {wf.trigger}</p>
                      <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                        <button
                          type="button"
                          className="gd-outline-btn"
                          style={{ width: '100%', justifyContent: 'center', fontSize: 10.5 }}
                          onClick={() => alert(`Running pipeline: ${wf.name}`)}
                        >
                          Run Trigger Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'Integrations' ? (
            /* ==================== INTEGRATIONS VIEW ==================== */
            <div className="gd-view-wrapper">
              <div className="gd-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="gd-card-header" style={{ marginBottom: 12 }}>
                  <div className="gd-card-title-group">
                    <ExternalLink size={16} color="#06b6d4" />
                    <h3 className="gd-card-heading">Connected Cloud Apps & API Integrations</h3>
                  </div>
                  <span className="gd-header-badge">{integrations.filter(i => i.connected).length} Connected</span>
                </div>
                <div className="gd-grid-showcase">
                  {integrations.map((item) => (
                    <div key={item.id} className="gd-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 24 }}>{item.icon}</span>
                        <button
                          type="button"
                          className={item.connected ? 'gd-outline-btn' : 'gd-primary-btn'}
                          style={{ fontSize: 10, padding: '3px 8px' }}
                          onClick={() => {
                            setIntegrations(integrations.map((i) => i.id === item.id ? { ...i, connected: !i.connected } : i))
                          }}
                        >
                          {item.connected ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gd-text-primary)' }}>{item.name}</h4>
                      <p style={{ fontSize: 11, color: 'var(--gd-text-muted)' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeDock === 'mail' || activeDock === 'chat' ? (
            /* ==================== MESSAGES & CHAT VIEW ==================== */
            <div className="gd-view-wrapper gd-messages-layout">
              {/* Left Column: Conversations */}
              <div className="gd-chat-sidebar gd-card">
                <div className="gd-card-header" style={{ marginBottom: 4 }}>
                  <div className="gd-card-title-group">
                    <MessageCircle size={15} color="#ffd600" />
                    <h3 className="gd-card-heading">Messages</h3>
                  </div>
                  <span className="gd-header-badge">{chatThreads.length} Threads</span>
                </div>

                <div className="gd-chat-search">
                  <Search size={13} color="rgba(255,255,255,0.4)" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                  />
                </div>

                <div className="gd-threads-list">
                  {chatThreads
                    .filter((t) => t.name.toLowerCase().includes(chatSearch.toLowerCase()))
                    .map((thread) => (
                      <div
                        key={thread.id}
                        className={`gd-thread-item ${activeChatThread === thread.id ? 'active' : ''}`}
                        onClick={() => setActiveChatThread(thread.id)}
                      >
                        <div className="gd-thread-avatar-wrap">
                          <img src={thread.avatar} alt={thread.name} className="gd-thread-avatar" />
                          {thread.status === 'online' && <span className="gd-status-dot-online" />}
                        </div>
                        <div className="gd-thread-content">
                          <div className="gd-thread-name-row">
                            <span className="gd-thread-name">{thread.name}</span>
                            <span className="gd-thread-time">{thread.time}</span>
                          </div>
                          <p className="gd-thread-snippet">
                            {thread.messages[thread.messages.length - 1]?.text || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Column: Active Thread */}
              <div className="gd-chat-main-panel gd-card" style={{ padding: 0 }}>
                {(() => {
                  const thread = chatThreads.find((t) => t.id === activeChatThread) || chatThreads[0]
                  if (!thread) return null
                  return (
                    <>
                      <div className="gd-chat-header">
                        <div className="gd-chat-recipient">
                          <div className="gd-thread-avatar-wrap">
                            <img src={thread.avatar} alt={thread.name} className="gd-thread-avatar" />
                            {thread.status === 'online' && <span className="gd-status-dot-online" />}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gd-text-primary)' }}>
                              {thread.name}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--gd-text-muted)' }}>
                              {thread.role} • {thread.status === 'online' ? 'Active Now' : 'Offline'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className="gd-icon-btn" title="Thread info">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="gd-chat-messages-scroll">
                        {thread.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`gd-chat-bubble ${m.incoming ? 'gd-bubble-incoming' : 'gd-bubble-outgoing'}`}
                          >
                            <div>{m.text}</div>
                            <span className="gd-bubble-meta">{m.time}</span>
                          </div>
                        ))}
                      </div>

                      <form className="gd-chat-input-row" onSubmit={handleSendMessage}>
                        <input
                          type="text"
                          className="gd-chat-input"
                          placeholder={`Message ${thread.name}...`}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                        />
                        <button type="submit" className="gd-chat-send-btn" title="Send message">
                          <Send size={14} />
                        </button>
                      </form>
                    </>
                  )
                })()}
              </div>
            </div>
          ) : activeDock === 'calendar' ? (
            /* ==================== CALENDAR & TIMELINE VIEW ==================== */
            <div className="gd-view-wrapper gd-calendar-full-layout">
              {/* Left Column: Interactive Month Grid */}
              <div className="gd-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="gd-cal-month-header">
                  <div className="gd-card-title-group">
                    <Calendar size={16} color="#818cf8" />
                    <h3 className="gd-card-heading">May 2026 Calendar</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="gd-icon-btn"><ChevronLeft size={13} /></button>
                    <button type="button" className="gd-icon-btn"><ChevronRight size={13} /></button>
                  </div>
                </div>

                <div className="gd-month-days-grid">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
                    <div key={w} className="gd-weekday-head">{w}</div>
                  ))}
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <div
                      key={d}
                      className={`gd-month-day-cell ${selectedDay === d ? 'active' : ''}`}
                      onClick={() => setSelectedDay(d)}
                    >
                      <span>{d}</span>
                      {[10, 14, 18, 21, 26].includes(d) && <span className="gd-day-event-dot" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Schedule Details */}
              <div className="gd-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="gd-card-header" style={{ marginBottom: 6 }}>
                  <div className="gd-card-title-group">
                    <Clock size={16} color="#ffd600" />
                    <h3 className="gd-card-heading">Agenda for {selectedDay} May</h3>
                  </div>
                  <button
                    type="button"
                    className="gd-primary-btn"
                    style={{ padding: '4px 8px', fontSize: 11 }}
                    onClick={() => alert('New Event Scheduled')}
                  >
                    <Plus size={13} />
                    <span>New Event</span>
                  </button>
                </div>

                <div className="gd-agenda-timeline">
                  {agendaEvents.map((ev) => (
                    <div key={ev.id} className="gd-agenda-card">
                      <div>
                        <div style={{ fontSize: 10, color: ev.color, fontWeight: 700, marginBottom: 2 }}>
                          {ev.time}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gd-text-primary)' }}>
                          {ev.title}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--gd-text-muted)' }}>
                          📍 {ev.location} • {ev.attendees} attendees
                        </div>
                      </div>
                      <button type="button" className="gd-outline-btn" style={{ fontSize: 10, padding: '3px 8px' }}>
                        Join Call
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeDock === 'notes' ? (
            /* ==================== NOTES & EDITOR VIEW ==================== */
            <div className="gd-view-wrapper gd-notes-layout">
              {/* Left Column: Note Composer */}
              <div className="gd-card gd-note-composer">
                <div className="gd-card-title-group" style={{ marginBottom: 4 }}>
                  <FileEdit size={16} color="#ffd600" />
                  <h3 className="gd-card-heading">Quick Note Composer</h3>
                </div>
                <form onSubmit={handleSaveNote} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
                  <input
                    type="text"
                    className="gd-form-input"
                    placeholder="Note title..."
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    required
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['UI/UX', 'Product', 'Motion', 'Security'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`gd-filter-chip ${newNoteCategory === cat ? 'active' : ''}`}
                        onClick={() => setNewNoteCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="gd-note-textarea"
                    placeholder="Write your glassy workspace notes here..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    required
                  />
                  <button type="submit" className="gd-primary-btn" style={{ justifyContent: 'center' }}>
                    <Plus size={14} />
                    <span>Save Note</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Saved Notes */}
              <div className="gd-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="gd-card-header" style={{ marginBottom: 8 }}>
                  <div className="gd-card-title-group">
                    <FileText size={16} color="#06b6d4" />
                    <h3 className="gd-card-heading">Workspace Notes ({notes.length})</h3>
                  </div>
                </div>
                <div className="gd-notes-grid">
                  {notes.map((note) => (
                    <div key={note.id} className="gd-note-item-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          className="gd-tag-pill"
                          style={{ background: `${note.tagColor}22`, color: note.tagColor, borderColor: `${note.tagColor}44` }}
                        >
                          {note.category}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--gd-text-muted)' }}>{note.date}</span>
                      </div>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--gd-text-primary)' }}>{note.title}</h4>
                      <p style={{ fontSize: 10.5, color: 'var(--gd-text-secondary)', lineHeight: 1.4 }}>{note.content}</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <button
                          type="button"
                          className="gd-micro-btn"
                          onClick={() => setNotes(notes.filter((n) => n.id !== note.id))}
                          title="Delete note"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeDock === 'chart' ? (
            /* ==================== ANALYTICS & PRO VIEW ==================== */
            <div className="gd-view-wrapper gd-analytics-layout">
              <div className="gd-metrics-kpi-row">
                <div className="gd-kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600 }}>Performance</span>
                    <TrendingUp size={14} />
                  </div>
                  <div className="gd-kpi-value">98.4%</div>
                  <div style={{ fontSize: 9.5, color: '#10b981' }}>+14.2% vs last week</div>
                </div>

                <div className="gd-kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffd600' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600 }}>Task Velocity</span>
                    <Activity size={14} />
                  </div>
                  <div className="gd-kpi-value">86.2%</div>
                  <div style={{ fontSize: 9.5, color: 'var(--gd-text-muted)' }}>38 tasks completed</div>
                </div>

                <div className="gd-kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#06b6d4' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600 }}>Active Sprints</span>
                    <Briefcase size={14} />
                  </div>
                  <div className="gd-kpi-value">6 Active</div>
                  <div style={{ fontSize: 9.5, color: 'var(--gd-text-muted)' }}>2 due this Friday</div>
                </div>

                <div className="gd-kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b5cf6' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600 }}>Security Score</span>
                    <Shield size={14} />
                  </div>
                  <div className="gd-kpi-value">100%</div>
                  <div style={{ fontSize: 9.5, color: '#10b981' }}>Encrypted & Verified</div>
                </div>
              </div>

              <div className="gd-analytics-charts-row">
                <div className="gd-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h3 className="gd-card-heading">Department Efficiency Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
                    {[
                      { dept: 'Motion Design & UI', score: 94, color: '#ffd600' },
                      { dept: 'Frontend Architecture', score: 88, color: '#6366f1' },
                      { dept: 'Security & Auth Services', score: 98, color: '#10b981' },
                      { dept: 'Product Strategy & QA', score: 78, color: '#06b6d4' }
                    ].map((item) => (
                      <div key={item.dept}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: 'var(--gd-text-primary)' }}>{item.dept}</span>
                          <span style={{ fontWeight: 700, color: item.color }}>{item.score}%</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${item.score}%`, height: '100%', background: item.color, borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="gd-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8 }}>
                  <div style={{ width: 90, height: 90, borderRadius: '50%', border: '4px solid #ffd600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', boxShadow: '0 0 24px rgba(255,214,0,0.3)' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#ffd600' }}>92%</span>
                    <span style={{ fontSize: 9, color: 'var(--gd-text-muted)' }}>INDEX</span>
                  </div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gd-text-primary)' }}>Enterprise Tier Performance</h4>
                  <p style={{ fontSize: 10.5, color: 'var(--gd-text-secondary)', maxWidth: 260 }}>
                    Operating in the top 5% percentile of high-performance product teams.
                  </p>
                </div>
              </div>
            </div>
          ) : activeDock === 'user' ? (
            /* ==================== PROFILE & ACCOUNTS VIEW ==================== */
            <div className="gd-view-wrapper gd-profile-layout">
              <div className="gd-profile-badge-card">
                <div style={{ position: 'relative', width: 68, height: 68 }}>
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&h=160&q=80"
                    alt={userName}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #ffd600', boxShadow: '0 0 16px rgba(255,214,0,0.35)' }}
                  />
                  <span style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#10b981', border: '2px solid #08080a' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gd-text-primary)' }}>{userName}</h3>
                  <p style={{ fontSize: 11, color: 'var(--gd-text-muted)' }}>Lead Design Architect • enterprise@domain.com</p>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <span className="gd-tag-pill" style={{ background: 'rgba(255,214,0,0.15)', color: '#ffd600', borderColor: 'rgba(255,214,0,0.3)' }}>
                    Admin Access
                  </span>
                  <span className="gd-tag-pill" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.3)' }}>
                    Pro Member
                  </span>
                </div>
                <button
                  type="button"
                  className="gd-primary-btn"
                  style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                  onClick={() => alert('Profile settings saved')}
                >
                  Edit Profile Details
                </button>
              </div>

              <div className="gd-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3 className="gd-card-heading">Security & Active Workspace Sessions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="gd-agenda-card">
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gd-text-primary)' }}>MacBook Pro 16" • Apple Silicon</div>
                      <div style={{ fontSize: 10, color: '#10b981' }}>Active now • San Francisco, CA</div>
                    </div>
                    <span className="gd-tag-pill" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}>
                      This Device
                    </span>
                  </div>
                  <div className="gd-agenda-card">
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gd-text-primary)' }}>iPhone 15 Pro • iOS 18</div>
                      <div style={{ fontSize: 10, color: 'var(--gd-text-muted)' }}>Last synced 2 hours ago</div>
                    </div>
                    <button type="button" className="gd-outline-btn" style={{ fontSize: 10, padding: '3px 8px' }}>
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeDock === 'bell' ? (
            /* ==================== NOTIFICATIONS FEED VIEW ==================== */
            <div className="gd-view-wrapper gd-notifs-center-layout">
              <div className="gd-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="gd-card-header" style={{ marginBottom: 8 }}>
                  <div className="gd-card-title-group">
                    <Bell size={16} color="#ffd600" />
                    <h3 className="gd-card-heading">Notifications & Alerts Feed</h3>
                  </div>
                  <button
                    type="button"
                    className="gd-outline-btn"
                    style={{ fontSize: 10, padding: '3px 8px' }}
                    onClick={handleClearNotifications}
                  >
                    Clear all
                  </button>
                </div>

                <div className="gd-notifs-feed">
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 30, color: 'var(--gd-text-muted)', fontSize: 12 }}>
                      🎉 All caught up! No unread notifications.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="gd-agenda-card">
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gd-text-primary)' }}>{notif.title}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--gd-text-secondary)', marginTop: 2 }}>{notif.desc}</div>
                        </div>
                        <button
                          type="button"
                          className="gd-micro-btn"
                          onClick={() => handleRemoveNotification(notif.id)}
                          title="Dismiss"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ==================== DEFAULT DASHBOARD OVERVIEW ==================== */
            <div className="gd-view-wrapper" style={{ gap: 8 }}>
{/* ==================================================================
              ROW 2: HERO GREETING & 4 QUICK ACCESS CARDS
              ================================================================== */}
          <section className="gd-hero-row">
            {/* Welcome Greeting */}
            <div className="gd-hero-greeting">
              <h1 className="gd-hero-hello">
                Hi, {userName}!
                <span className="gd-hero-bubble-pill">
                  <span>👋</span>
                  <span>✨</span>
                </span>
              </h1>
              <h2 className="gd-hero-subtitle-heading">
                What are your plans for today?
              </h2>
              <p className="gd-hero-desc">
                This platform is designed to revolutionize the way you organize and access your notes.
              </p>
            </div>

            {/* 4 Feature Cards */}
            <div className="gd-hero-cards-deck">
              {/* Card 1: Add New Dashed Button */}
              <div
                className="gd-quick-card dashed-add"
                onClick={() => setIsModalOpen(true)}
                title="Create new board or note"
              >
                <div className="gd-add-circle">
                  <Plus size={18} />
                </div>
              </div>

              {/* Card 2: Stay organized */}
              <div
                className="gd-quick-card"
                onClick={() => { setActiveDock('calendar'); setActiveTab('Dashboard'); }}
              >
                <div className="gd-quick-icon-box">
                  <Calendar size={17} />
                </div>
                <div>
                  <h3 className="gd-quick-card-title">Stay organized</h3>
                  <p className="gd-quick-card-caption">
                    A clear structure for notes
                  </p>
                </div>
              </div>

              {/* Card 3: Sync your notes */}
              <div
                className="gd-quick-card"
                onClick={() => { setActiveDock('notes'); setActiveTab('Dashboard'); }}
              >
                <div className="gd-quick-icon-box">
                  <FileText size={17} />
                </div>
                <div>
                  <h3 className="gd-quick-card-title">Sync your notes</h3>
                  <p className="gd-quick-card-caption">
                    Ensure notes are synced
                  </p>
                </div>
              </div>

              {/* Card 4: Collaborate and share */}
              <div
                className="gd-quick-card highlighted"
                onClick={() => { setActiveDock('chat'); setActiveTab('Dashboard'); }}
              >
                <div className="gd-quick-icon-box" style={{ color: '#6366f1' }}>
                  <Share2 size={17} />
                </div>
                <div>
                  <h3 className="gd-quick-card-title">Collaborate and share</h3>
                  <p className="gd-quick-card-caption">
                    Share notes with colleagues
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================================
              ROW 3: THREE-COLUMN GRID (ALL VIEWABLE AT ONCE WITHOUT SCROLL)
              ================================================================== */}
          <div className="gd-grid-layout">
            {/* ================================================================
                COLUMN 1: NOTIFICATIONS & TODAY TASKS
                ================================================================ */}
            <div className="gd-col">
              {/* Widget: Notifications */}
              <div className="gd-card gd-card-notifs">
                <div className="gd-card-header">
                  <h3 className="gd-card-title">
                    <Bell size={16} color="#818cf8" />
                    <span>Notifications</span>
                  </h3>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      className="gd-text-action"
                      onClick={handleClearNotifications}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="gd-notif-stack">
                  <AnimatePresence>
                    {notifications.length === 0 ? (
                      <p className="gd-empty-notif">All notifications caught up! ✨</p>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="gd-notif-item">
                          <div className="gd-notif-top">
                            <div className="gd-notif-title-row">
                              <span>{notif.title}</span>
                              {notif.hasPulse && <span className="gd-pulse-dot" />}
                            </div>
                            <div className="gd-item-actions">
                              <button type="button" className="gd-micro-btn" title="Edit">
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                className="gd-micro-btn"
                                title="Dismiss"
                                onClick={() => handleRemoveNotification(notif.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <p className="gd-notif-desc">{notif.desc}</p>

                          {notif.snippet && (
                            <p className="gd-notif-snippet">"{notif.snippet}"</p>
                          )}

                          {notif.badges && (
                            <div className="gd-notif-meta-badges">
                              {notif.badges.map((b, i) => (
                                <span key={i} className="gd-meta-badge">
                                  <Clock size={10} />
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Widget: Today Tasks */}
              <div className="gd-card gd-card-tasks">
                <div className="gd-card-header">
                  <h3 className="gd-card-title">
                    <CheckCircle2 size={16} color="#ffd600" />
                    <span>Today tasks</span>
                  </h3>

                  <div className="gd-card-actions">
                    <div className="gd-avatar-stack">
                      <div className="gd-stack-avatar">
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80" alt="Team 1" />
                      </div>
                      <div className="gd-stack-avatar">
                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80" alt="Team 2" />
                      </div>
                      <div className="gd-stack-avatar gd-stack-more">+3</div>
                    </div>
                    <button type="button" className="gd-text-action" title="Edit Tasks">
                      <Edit2 size={12} />
                    </button>
                    <button type="button" className="gd-text-action" title="Share Tasks">
                      <Share2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="gd-task-list">
                  {tasks.map((task) => (
                    <div key={task.id} className="gd-task-row">
                      <div className="gd-task-header-row">
                        <div className="gd-task-left-info">
                          <span className="gd-task-title">{task.title}</span>
                          <span className="gd-task-date">{task.date}</span>
                        </div>
                        <span className="gd-task-duration-pill">{task.duration}</span>
                      </div>

                      <div className="gd-progress-wrapper">
                        <div className="gd-progress-track">
                          <div
                            className={`gd-progress-fill ${task.color}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="gd-progress-val">{task.progress}%</span>
                      </div>

                      <div className="gd-task-footer-meta">
                        {task.comments && (
                          <span className="gd-meta-counter">
                            <MessageCircle size={11} />
                            {task.comments}
                          </span>
                        )}
                        {task.attachments && (
                          <span className="gd-meta-counter">
                            <Paperclip size={11} />
                            {task.attachments}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="gd-meta-counter">
                            <Calendar size={11} />
                            {task.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ================================================================
                COLUMN 2: ASSIGNMENTS & GO PREMIUM!
                ================================================================ */}
            <div className="gd-col">
              {/* Widget: Assignments */}
              <div className="gd-card gd-card-assign">
                <div className="gd-card-header">
                  <h3 className="gd-card-title">
                    <Briefcase size={16} color="#06b6d4" />
                    <span>Assignments</span>
                  </h3>
                  <button
                    type="button"
                    className="gd-text-action"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="gd-filter-tags-row">
                  {['Motion design', 'Logo', 'All'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`gd-filter-tag ${selectedFilter === tag ? 'active' : ''}`}
                      onClick={() => setSelectedFilter(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {displayedAssignments.map((assign) => (
                  <div key={assign.id} className="gd-featured-assignment">
                    <div className="gd-assign-top-row">
                      <h4 className="gd-assign-title">{assign.title}</h4>
                      <span className="gd-priority-pill">{assign.priority}</span>
                    </div>

                    <div className="gd-assign-bottom-row">
                      <span className="gd-tag-pill">{assign.tag}</span>
                      <div className="gd-assignee-chip">
                        <div className="gd-assignee-avatar">
                          <img src={assign.avatar} alt={assign.assignee} />
                        </div>
                        <span>{assign.assignee}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="gd-add-assign-btn"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus size={15} />
                  <span>Add new assignment</span>
                </button>
              </div>

              {/* Widget: Go Premium! Banner */}
              <div className="gd-premium-card">
                <div className="gd-premium-gift-wrap">
                  <Gift size={38} color="#ffd600" />
                </div>
                <h3 className="gd-premium-title">Go premium!</h3>
                <p className="gd-premium-desc">
                  Gain access to a range of benefits designed to enhance your workflow.
                </p>
                <button
                  type="button"
                  className="gd-premium-btn"
                  onClick={() => alert('Upgraded to Ultra Glassy Pro Plan!')}
                >
                  Find out more
                </button>
              </div>
            </div>

            {/* ================================================================
                COLUMN 3: CALENDAR, METRIC RINGS & BOARD MEETING
                ================================================================ */}
            <div className="gd-col">
              {/* Widget: May 2021 Calendar Timeline */}
              <div className="gd-card gd-card-cal">
                <div className="gd-card-header">
                  <h3 className="gd-card-title">
                    <Calendar size={16} color="#818cf8" />
                    <span>May 2021</span>
                  </h3>
                  <div className="gd-card-actions">
                    <button type="button" className="gd-micro-btn" title="Previous Week">
                      <ChevronLeft size={14} />
                    </button>
                    <button type="button" className="gd-micro-btn" title="Next Week">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="gd-calendar-days-strip">
                  {daysOfWeek.map((d) => (
                    <div
                      key={d.num}
                      className={`gd-cal-day-cell ${selectedDay === d.num ? 'active' : ''}`}
                      onClick={() => setSelectedDay(d.num)}
                    >
                      <span className="gd-cal-day-name">{d.day}</span>
                      <span className="gd-cal-day-num">{d.num}</span>
                    </div>
                  ))}
                </div>

                <div className="gd-timeline-block">
                  <div className="gd-timeline-divider">
                    <span>04:30 - 05:00 PM</span>
                    <div className="gd-timeline-line" />
                  </div>

                  <div className="gd-timeline-event">
                    <div className="gd-timeline-event-left">
                      <div className="gd-timeline-icon-box">
                        <LayoutGrid size={14} />
                      </div>
                      <div>
                        <div className="gd-timeline-event-title">Team meeting</div>
                        <div className="gd-timeline-event-sub">12:00 - 12:30 • UX/UI design</div>
                      </div>
                    </div>
                    <button type="button" className="gd-micro-btn">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>

                  <div className="gd-timeline-divider">
                    <span>11:30 - 12:30 PM</span>
                    <div className="gd-timeline-line" />
                  </div>

                  <div className="gd-timeline-event">
                    <div className="gd-timeline-event-left">
                      <div className="gd-timeline-icon-box" style={{ color: '#ffd600' }}>
                        <Briefcase size={14} />
                      </div>
                      <div>
                        <div className="gd-timeline-event-title">Meeting with new client</div>
                        <div className="gd-timeline-event-sub">12:30 - 01:30 PM • Job interview</div>
                      </div>
                    </div>
                    <button type="button" className="gd-micro-btn">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Widget: Dual Circular Progress Rings */}
              <div className="gd-card gd-card-rings">
                <div className="gd-rings-dual-grid">
                  {/* Ring 1: Data Research (90%) */}
                  <div className="gd-ring-card">
                    <div className="gd-ring-svg-wrap">
                      <svg className="gd-ring-svg" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="25" stroke="rgba(255,255,255,0.12)" strokeWidth="5" fill="none" />
                        <circle
                          cx="32" cy="32" r="25"
                          stroke="#10b981" strokeWidth="5" fill="none"
                          strokeDasharray="157" strokeDashoffset="16" strokeLinecap="round"
                        />
                      </svg>
                      <div className="gd-ring-center-text">90%</div>
                    </div>
                    <span className="gd-ring-label">DATA RESEARCH</span>
                    <span className="gd-ring-category">Marketing</span>
                    <p className="gd-ring-caption">5/5 assignments done!</p>
                  </div>

                  {/* Ring 2: UX/UI Design (65%) */}
                  <div className="gd-ring-card">
                    <div className="gd-ring-svg-wrap">
                      <svg className="gd-ring-svg" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="25" stroke="rgba(255,255,255,0.12)" strokeWidth="5" fill="none" />
                        <circle
                          cx="32" cy="32" r="25"
                          stroke="#f43f5e" strokeWidth="5" fill="none"
                          strokeDasharray="157"
                          strokeDashoffset={metricChecked ? '0' : '55'}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                      <div className="gd-ring-center-text">{metricChecked ? '100%' : '65%'}</div>
                    </div>
                    <span className="gd-ring-label">UX/UI DESIGN</span>
                    <span className="gd-ring-category">Typography</span>
                    <p className="gd-ring-caption">
                      {metricChecked ? 'Verified!' : '2 left'}
                    </p>
                    <button
                      type="button"
                      className="gd-ring-check-btn"
                      onClick={() => setMetricChecked(!metricChecked)}
                    >
                      {metricChecked ? 'Done ✓' : 'Check'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Widget: Board Meeting */}
              <div className="gd-card gd-board-card">
                <div className="gd-card-header">
                  <h3 className="gd-card-title">
                    <Briefcase size={15} color="#6366f1" />
                    <span>Board meeting</span>
                  </h3>
                  <button type="button" className="gd-micro-btn" title="Edit">
                    <Edit2 size={12} />
                  </button>
                </div>

                <div className="gd-meeting-time-row">
                  <span className="gd-blue-dot" />
                  <span>March 24 at 4:00 PM</span>
                </div>

                <p className="gd-meeting-desc">
                  Meeting with John Smith, 4th floor, room 159. Roadmap delivery.
                </p>

                <div className="gd-meeting-actions">
                  <button
                    type="button"
                    className="gd-outline-btn"
                    onClick={() => {
                      setMeetingRescheduled(true)
                      alert('Reschedule request sent!')
                    }}
                  >
                    {meetingRescheduled ? 'Rescheduled' : 'Reschedule'}
                  </button>

                  <button
                    type="button"
                    className="gd-accent-solid-btn"
                    onClick={() => {
                      setMeetingAccepted(true)
                      alert('Invite accepted!')
                    }}
                  >
                    {meetingAccepted ? 'Accepted ✓' : 'Accept invite'}
                  </button>
                </div>
              </div>
            </div>
          </div>
            </div>
          )}

        </main>
      </div>

      {/* ====================================================================
          MODAL: ADD NEW ASSIGNMENT / NOTE
          ==================================================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="gd-modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <motion.div
              className="gd-modal-box"
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="gd-modal-header">
                <h3 className="gd-modal-title">Create New Assignment</h3>
                <button type="button" className="gd-micro-btn" onClick={() => setIsModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form className="gd-modal-form" onSubmit={handleAddAssignment}>
                <div className="gd-form-group">
                  <label className="gd-form-label">Assignment Title</label>
                  <input
                    type="text"
                    className="gd-form-input"
                    placeholder="e.g. Design packaging concept..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="gd-form-group">
                  <label className="gd-form-label">Category</label>
                  <select
                    className="gd-form-select"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="Motion design">Motion design</option>
                    <option value="Logo">Logo</option>
                    <option value="UX/UI Design">UX/UI Design</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div className="gd-form-group">
                  <label className="gd-form-label">Priority</label>
                  <select
                    className="gd-form-select"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="gd-modal-actions">
                  <button type="button" className="gd-outline-btn" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="gd-accent-solid-btn">
                    Create Assignment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
