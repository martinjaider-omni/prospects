'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Mail,
  Linkedin,
  Instagram,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Settings,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  MousePointer,
  Reply,
  ArrowLeft,
  Globe,
  Send,
  MessageSquare,
  Sparkles,
  Timer,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Campaign {
  id: string
  name: string
  description: string | null
  status: string
  platform: string
  objective: string
  channel: string
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  createdAt: string
  steps?: FlowNode[]
}

interface FlowNode {
  id: string
  type: 'trigger' | 'action' | 'delay' | 'condition'
  nodeType: string
  title: string
  mode?: 'always' | 'ai' | 'manual'
  prompt?: string
  delayValue?: number
  delayUnit?: 'minutes' | 'hours' | 'days'
  order: number
}

interface Activity {
  id: string
  type: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'scheduled'
  contactName: string
  contactInitials: string
  message: string
  account: string
  timestamp: Date
  platform: string
}

const platformConfig: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  EMAIL: { icon: Mail, label: 'Email', color: 'text-muted-foreground', bgColor: 'bg-secondary' },
  LINKEDIN: { icon: Linkedin, label: 'LinkedIn', color: 'text-[#0A66C2]', bgColor: 'bg-[#0A66C2]/10' },
  INSTAGRAM: { icon: Instagram, label: 'Instagram', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
}

const activityTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  sent: { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', label: 'Sent' },
  opened: { icon: Eye, color: 'text-blue-600 dark:text-blue-400', label: 'Opened' },
  clicked: { icon: MousePointer, color: 'text-purple-600 dark:text-purple-400', label: 'Clicked' },
  replied: { icon: Reply, color: 'text-green-600 dark:text-green-400', label: 'Replied' },
  bounced: { icon: XCircle, color: 'text-destructive', label: 'Bounced' },
  scheduled: { icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', label: 'Scheduled' },
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'flow', label: 'Flow' },
  { id: 'leads', label: 'Leads' },
  { id: 'test', label: 'Test' },
]

// Generate mock activities based on platform
const generateMockActivities = (platform: string, type: 'recent' | 'upcoming'): Activity[] => {
  const names = [
    { name: 'John Smith', initials: 'JS' },
    { name: 'Maria Garcia', initials: 'MG' },
    { name: 'Alex Johnson', initials: 'AJ' },
    { name: 'Sarah Williams', initials: 'SW' },
    { name: 'Michael Brown', initials: 'MB' },
    { name: 'Emma Davis', initials: 'ED' },
    { name: 'James Wilson', initials: 'JW' },
    { name: 'Olivia Martinez', initials: 'OM' },
  ]

  const emailMessages = [
    'Quick question about your SaaS platform',
    'Following up on our conversation',
    'Partnership opportunity for Q1',
    'Re: Meeting request',
    'Introduction - Prospects AI',
  ]

  const linkedinMessages = [
    'Hi! I noticed your work at...',
    'Would love to connect and discuss...',
    'Saw your recent post about AI...',
    'Great insights on your profile!',
    'Quick question about your role...',
  ]

  const instagramMessages = [
    'Love your content! Quick question...',
    'Hey! Saw your story about...',
    'Your recent post was inspiring!',
    'Would love to collaborate on...',
    'Quick DM about an opportunity...',
  ]

  const messages = platform === 'LINKEDIN' ? linkedinMessages : platform === 'INSTAGRAM' ? instagramMessages : emailMessages
  const accounts = platform === 'LINKEDIN'
    ? ['@martinjaider', '@salesteam']
    : platform === 'INSTAGRAM'
      ? ['@prospects_ai', '@outreach_pro']
      : ['martin@prospects.ai', 'sales@prospects.ai']

  const activityTypes: Activity['type'][] = type === 'recent'
    ? ['sent', 'opened', 'clicked', 'replied', 'bounced']
    : ['scheduled']

  return Array.from({ length: 8 }, (_, i) => {
    const person = names[i % names.length]
    const activityType = type === 'upcoming' ? 'scheduled' : activityTypes[Math.floor(Math.random() * activityTypes.length)]

    return {
      id: `${type}-${i}`,
      type: activityType,
      contactName: person.name,
      contactInitials: person.initials,
      message: messages[i % messages.length],
      account: accounts[i % accounts.length],
      timestamp: type === 'recent'
        ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      platform,
    }
  })
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Flow editor state
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([])
  const [editingPrompts, setEditingPrompts] = useState(false)

  // Filters
  const [contactFilter, setContactFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')

  // Pagination
  const [recentPage, setRecentPage] = useState(1)
  const [upcomingPage, setUpcomingPage] = useState(1)
  const itemsPerPage = 5

  const fetchCampaign = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`)
      if (!response.ok) throw new Error('Campaign not found')
      const data = await response.json()
      setCampaign(data)

      // Initialize flow nodes based on platform
      const defaultNodes = getDefaultFlowNodes(data.platform)
      setFlowNodes(defaultNodes)
    } catch (error) {
      toast.error('Error al cargar la campana')
      router.push('/campaigns')
    } finally {
      setLoading(false)
    }
  }, [campaignId, router])

  // Get default flow nodes based on platform
  const getDefaultFlowNodes = (platform: string): FlowNode[] => {
    if (platform === 'LINKEDIN') {
      return [
        {
          id: 'node-0',
          type: 'trigger',
          nodeType: 'on_start_contact',
          title: 'On Start Contact',
          mode: 'always',
          order: 0,
        },
        {
          id: 'node-1',
          type: 'action',
          nodeType: 'send_linkedin_invitation',
          title: 'Send LinkedIn Invitation',
          mode: 'ai',
          prompt: 'Find something interesting on their profile and mention that here to get their attention and want to accept our invitation.',
          order: 1,
        },
        {
          id: 'node-2',
          type: 'delay',
          nodeType: 'delay',
          title: 'Delay',
          delayValue: 1,
          delayUnit: 'days',
          order: 2,
        },
        {
          id: 'node-3',
          type: 'action',
          nodeType: 'conversation_introduction',
          title: 'Conversation Introduction',
          mode: 'ai',
          prompt: 'Introduce yourself and your product/service in a friendly way.',
          order: 3,
        },
      ]
    }

    // Email default flow
    return [
      {
        id: 'node-0',
        type: 'trigger',
        nodeType: 'on_start_contact',
        title: 'On Start Contact',
        mode: 'always',
        order: 0,
      },
      {
        id: 'node-1',
        type: 'action',
        nodeType: 'send_email',
        title: 'Send Email',
        mode: 'ai',
        prompt: 'Write a personalized cold email introducing our product.',
        order: 1,
      },
      {
        id: 'node-2',
        type: 'delay',
        nodeType: 'delay',
        title: 'Delay',
        delayValue: 3,
        delayUnit: 'days',
        order: 2,
      },
      {
        id: 'node-3',
        type: 'action',
        nodeType: 'send_email',
        title: 'Follow-up Email',
        mode: 'ai',
        prompt: 'Write a follow-up email if they did not reply.',
        order: 3,
      },
    ]
  }

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  const handleToggleStatus = async () => {
    if (!campaign) return
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error('Error')
      toast.success(`Campaign ${newStatus === 'ACTIVE' ? 'activated' : 'paused'}`)
      fetchCampaign()
    } catch (error) {
      toast.error('Error updating status')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!campaign) return null

  const platform = platformConfig[campaign.platform] || platformConfig.EMAIL
  const PlatformIcon = platform.icon

  // Get activities based on platform
  const recentActivities = generateMockActivities(campaign.platform, 'recent')
  const upcomingActivities = generateMockActivities(campaign.platform, 'upcoming')

  // Paginate activities
  const paginatedRecent = recentActivities.slice(
    (recentPage - 1) * itemsPerPage,
    recentPage * itemsPerPage
  )
  const paginatedUpcoming = upcomingActivities.slice(
    (upcomingPage - 1) * itemsPerPage,
    upcomingPage * itemsPerPage
  )

  const totalRecentPages = Math.ceil(recentActivities.length / itemsPerPage)
  const totalUpcomingPages = Math.ceil(upcomingActivities.length / itemsPerPage)

  const renderActivityCard = (activity: Activity) => {
    const activityConfig = activityTypeConfig[activity.type]
    const ActivityIcon = activityConfig.icon
    const platformCfg = platformConfig[activity.platform]
    const PlatformBadgeIcon = platformCfg.icon

    return (
      <div
        key={activity.id}
        className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border hover:bg-accent transition-colors"
      >
        {/* Avatar */}
        <Avatar className="h-10 w-10 bg-secondary">
          <AvatarFallback className="bg-secondary text-foreground text-sm">
            {activity.contactInitials}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground">{activity.contactName}</span>
            <Badge
              variant="outline"
              className={`${platformCfg.bgColor} ${platformCfg.color} border-0 px-1.5 py-0.5`}
            >
              <PlatformBadgeIcon className="h-3 w-3" />
            </Badge>
            <Badge
              variant="outline"
              className={`bg-transparent ${activityConfig.color} border-border text-xs`}
            >
              <ActivityIcon className="h-3 w-3 mr-1" />
              {activityConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{activity.message}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>{activity.account}</span>
            <span>-</span>
            <span>
              {activity.type === 'scheduled'
                ? format(activity.timestamp, "d MMM, HH:mm", { locale: es })
                : formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: es })
              }
            </span>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              View contact
            </DropdownMenuItem>
            <DropdownMenuItem>
              View message
            </DropdownMenuItem>
            {activity.type === 'scheduled' && (
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                Cancel send
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    setPage: (page: number) => void
  ) => (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={contactFilter} onValueChange={setContactFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by contact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contacts</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="opened">Opened</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>

        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {campaign.platform === 'EMAIL' ? (
              <>
                <SelectItem value="martin@prospects.ai">martin@prospects.ai</SelectItem>
                <SelectItem value="sales@prospects.ai">sales@prospects.ai</SelectItem>
              </>
            ) : campaign.platform === 'LINKEDIN' ? (
              <>
                <SelectItem value="@martinjaider">@martinjaider</SelectItem>
                <SelectItem value="@salesteam">@salesteam</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="@prospects_ai">@prospects_ai</SelectItem>
                <SelectItem value="@outreach_pro">@outreach_pro</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent activity</h3>
          <div className="space-y-3">
            {paginatedRecent.map(renderActivityCard)}
          </div>
          {renderPagination(recentPage, totalRecentPages, setRecentPage)}
        </div>

        {/* Upcoming Activity */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming activity</h3>
          <div className="space-y-3">
            {paginatedUpcoming.map(renderActivityCard)}
          </div>
          {renderPagination(upcomingPage, totalUpcomingPages, setUpcomingPage)}
        </div>
      </div>
    </div>
  )

  // Flow node handlers
  const updateFlowNode = (nodeId: string, updates: Partial<FlowNode>) => {
    setFlowNodes(nodes => nodes.map(node =>
      node.id === nodeId ? { ...node, ...updates } : node
    ))
  }

  const deleteFlowNode = (nodeId: string) => {
    setFlowNodes(nodes => nodes.filter(node => node.id !== nodeId))
  }

  const addFlowNode = (afterNodeId: string, type: FlowNode['type']) => {
    const currentIndex = flowNodes.findIndex(n => n.id === afterNodeId)
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type,
      nodeType: type === 'delay' ? 'delay' : type === 'trigger' ? 'on_start_contact' : 'send_email',
      title: type === 'delay' ? 'Delay' : type === 'trigger' ? 'On Start Contact' : 'New Action',
      mode: type === 'action' ? 'ai' : undefined,
      delayValue: type === 'delay' ? 1 : undefined,
      delayUnit: type === 'delay' ? 'days' : undefined,
      prompt: type === 'action' ? '' : undefined,
      order: currentIndex + 1,
    }

    const newNodes = [...flowNodes]
    newNodes.splice(currentIndex + 1, 0, newNode)
    setFlowNodes(newNodes.map((n, i) => ({ ...n, order: i })))
  }

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'on_start_contact':
        return <Play className="h-4 w-4 text-white" />
      case 'send_linkedin_invitation':
        return <Linkedin className="h-4 w-4 text-white" />
      case 'send_email':
        return <Mail className="h-4 w-4 text-white" />
      case 'conversation_introduction':
        return <MessageSquare className="h-4 w-4 text-white" />
      case 'delay':
        return <Timer className="h-4 w-4 text-white" />
      default:
        return <Send className="h-4 w-4 text-white" />
    }
  }

  const getNodeColor = (type: FlowNode['type'], nodeType: string) => {
    if (type === 'trigger') return 'bg-emerald-600'
    if (type === 'delay') return 'bg-orange-600'
    if (nodeType === 'send_linkedin_invitation') return 'bg-blue-600'
    return 'bg-indigo-600'
  }

  const renderFlowNode = (node: FlowNode, index: number) => {
    const isLast = index === flowNodes.length - 1

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div className="relative w-[400px] bg-card rounded-xl border border-border overflow-hidden">
          {/* Node Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getNodeColor(node.type, node.nodeType)}`}>
                {getNodeIcon(node.nodeType)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{node.title}</span>
                  <span className="text-xs text-muted-foreground uppercase">NODE - {index}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {node.type === 'trigger' && (
                <Badge variant="outline" className="bg-secondary text-secondary-foreground border-border">
                  Triggers
                </Badge>
              )}
              {node.type === 'action' && (
                <Badge variant="outline" className="bg-secondary text-secondary-foreground border-border">
                  Actions
                </Badge>
              )}
              {node.type === 'delay' && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                  Delays
                </Badge>
              )}
              {index > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-400"
                  onClick={() => deleteFlowNode(node.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Node Content */}
          <div className="p-4 space-y-4">
            {/* Mode selector for trigger and action nodes */}
            {(node.type === 'trigger' || node.type === 'action') && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Mode</label>
                <Select
                  value={node.mode || 'always'}
                  onValueChange={(value) => updateFlowNode(node.id, { mode: value as FlowNode['mode'] })}
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="always">
                      <div className="flex items-center gap-2">
                        Always
                      </div>
                    </SelectItem>
                    <SelectItem value="ai">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        AI
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                {node.type === 'trigger' && node.mode === 'always' && (
                  <p className="text-xs text-muted-foreground">
                    The campaign will start for all contacts regardless of their history.
                  </p>
                )}
              </div>
            )}

            {/* AI Prompt for action nodes with AI mode */}
            {node.type === 'action' && node.mode === 'ai' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Specify the instructions the AI has to follow when writing the {node.nodeType === 'send_linkedin_invitation' ? 'invitation message' : 'email'}.
                </p>
                <div className="relative">
                  <div className="absolute top-2 left-3 text-xs text-muted-foreground uppercase">PROMPT</div>
                  <Textarea
                    value={node.prompt || ''}
                    onChange={(e) => updateFlowNode(node.id, { prompt: e.target.value })}
                    placeholder="Enter AI instructions..."
                    className="bg-secondary border-border text-foreground pt-7 min-h-[100px] resize-none"
                  />
                </div>
              </div>
            )}

            {/* Delay configuration */}
            {node.type === 'delay' && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">WAIT FOR</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    value={node.delayValue || 1}
                    onChange={(e) => updateFlowNode(node.id, { delayValue: parseInt(e.target.value) || 1 })}
                    className="w-20 bg-secondary border-border text-foreground"
                  />
                  <Select
                    value={node.delayUnit || 'days'}
                    onValueChange={(value) => updateFlowNode(node.id, { delayUnit: value as FlowNode['delayUnit'] })}
                  >
                    <SelectTrigger className="w-32 bg-secondary border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="minutes">minutes</SelectItem>
                      <SelectItem value="hours">hours</SelectItem>
                      <SelectItem value="days">days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connector line and add button */}
        {!isLast && (
          <div className="flex flex-col items-center py-2">
            <div className="w-px h-4 bg-border" />
            <div className="w-3 h-3 rounded-full border-2 border-border bg-card" />
            <div className="w-px h-4 bg-border" />
          </div>
        )}

        {/* Add node button at the end */}
        {isLast && (
          <div className="flex flex-col items-center py-4">
            <div className="w-px h-4 bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-secondary border-border text-secondary-foreground hover:bg-accent"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border">
                <DropdownMenuItem
                  className="text-foreground focus:bg-accent focus:text-accent-foreground"
                  onClick={() => addFlowNode(node.id, 'action')}
                >
                  <Send className="h-4 w-4 mr-2 text-primary" />
                  Add Action
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-foreground focus:bg-accent focus:text-accent-foreground"
                  onClick={() => addFlowNode(node.id, 'delay')}
                >
                  <Timer className="h-4 w-4 mr-2 text-orange-400" />
                  Add Delay
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    )
  }

  const renderFlowTab = () => (
    <div className="relative h-full">
      {/* Edit Campaign Prompts Button */}
      <div className="absolute top-0 left-0 z-10">
        <Button
          variant="outline"
          onClick={() => setEditingPrompts(!editingPrompts)}
          className="bg-card border-border text-secondary-foreground hover:bg-accent"
        >
          <Globe className="h-4 w-4 mr-2" />
          Edit campaign prompts
        </Button>
      </div>

      {/* Flow Canvas */}
      <div className="flex flex-col items-center pt-16 pb-8 min-h-[600px]">
        {flowNodes.map((node, index) => renderFlowNode(node, index))}
      </div>

      {/* Reset Flow indicator */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
        React Flow
      </div>
    </div>
  )

  const renderLeadsTab = () => (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Leads management coming soon...
    </div>
  )

  const renderTestTab = () => (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Test mode coming soon...
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-background">
      <Header
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => router.push('/campaigns')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${platform.bgColor}`}>
                <PlatformIcon className={`h-4 w-4 ${platform.color}`} />
              </div>
              <span>{campaign.name}</span>
            </div>
            <Badge
              variant="outline"
              className={
                campaign.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : campaign.status === 'PAUSED'
                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  : 'bg-muted/50 text-muted-foreground border-border'
              }
            >
              {campaign.status === 'ACTIVE' ? 'Running' : campaign.status.toLowerCase()}
            </Badge>
          </div>
        }
        subtitle={campaign.description || `${platform.label} campaign`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleToggleStatus}
              className="bg-secondary border-border hover:bg-accent"
            >
              {campaign.status === 'ACTIVE' ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="bg-secondary border-border hover:bg-accent"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-card rounded-lg p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'flow' && renderFlowTab()}
        {activeTab === 'leads' && renderLeadsTab()}
        {activeTab === 'test' && renderTestTab()}
      </div>
    </div>
  )
}
