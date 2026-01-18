'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MessageSquare,
  Send,
  Phone,
  Star,
  RefreshCw,
  Smile,
  Paperclip,
  MoreHorizontal,
  Search,
  CheckCheck,
  Circle,
  Sparkles,
  Loader2,
  Archive,
  Trash2,
  Mail,
  ExternalLink,
  Copy,
  Building2,
  User,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface EmailThread {
  id: string
  subject: string
  lastMessageAt: string
  status: string
  isStarred: boolean
  contact: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    linkedinUrl?: string
    jobTitle?: string
    company?: {
      name: string
      website?: string
    }
  }
  messages: EmailMessage[]
  _count: {
    messages: number
  }
  campaign?: {
    id: string
    name: string
    status: string
    productPrompt?: string
    instructionsPrompt?: string
  }
  emailAccount?: {
    id: string
    name: string
    email: string
  }
}

interface EmailMessage {
  id: string
  direction: 'INBOUND' | 'OUTBOUND'
  subject: string
  body: string
  sentAt: string
  isRead: boolean
  from: string
  to: string
}

interface EmailAccount {
  id: string
  name: string
  email: string
}

type FilterType = 'all' | 'unreplied' | 'unread' | 'starred'

const filterLabels: Record<FilterType, string> = {
  all: 'Todos',
  unreplied: 'Sin responder',
  unread: 'No leidos',
  starred: 'Destacados',
}

export default function ConversationsPage() {
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // AI generation state
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiInstruction, setAIInstruction] = useState('')

  // Campaign prompts state
  const [productPrompt, setProductPrompt] = useState('')
  const [instructionsPrompt, setInstructionsPrompt] = useState('')
  const [savingPrompts, setSavingPrompts] = useState(false)

  // Stats
  const [stats, setStats] = useState({ total: 0, unread: 0, unreplied: 0, starred: 0 })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedThread?.messages])

  // Load campaign prompts when thread changes
  useEffect(() => {
    if (selectedThread?.campaign) {
      setProductPrompt(selectedThread.campaign.productPrompt || '')
      setInstructionsPrompt(selectedThread.campaign.instructionsPrompt || '')
    } else {
      setProductPrompt('')
      setInstructionsPrompt('')
    }
  }, [selectedThread])

  const fetchEmailAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/email-accounts')
      const data = await response.json()
      setEmailAccounts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching email accounts:', error)
    }
  }, [])

  const fetchThreads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeFilter === 'unreplied') params.set('status', 'ACTIVE')
      if (activeFilter === 'unread') params.set('unread', 'true')
      if (activeFilter === 'starred') params.set('starred', 'true')
      if (searchQuery) params.set('search', searchQuery)
      if (selectedAccount !== 'all') params.set('accountId', selectedAccount)

      const response = await fetch(`/api/inbox?${params}`)
      const data = await response.json()
      setThreads(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Error al cargar conversaciones')
      setThreads([])
    } finally {
      setLoading(false)
    }
  }, [activeFilter, searchQuery, selectedAccount])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/inbox', { method: 'POST' })
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  useEffect(() => {
    fetchThreads()
    fetchStats()
    fetchEmailAccounts()
  }, [fetchThreads, fetchStats, fetchEmailAccounts])

  const handleSelectThread = async (thread: EmailThread) => {
    setSelectedThread(thread)
    if (thread.messages.some(m => !m.isRead && m.direction === 'INBOUND')) {
      try {
        await fetch(`/api/inbox/${thread.id}/read`, { method: 'POST' })
        fetchThreads()
        fetchStats()
      } catch (error) {
        console.error('Error marking as read:', error)
      }
    }
  }

  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim()) return

    setSendingReply(true)
    try {
      const response = await fetch(`/api/inbox/${selectedThread.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText }),
      })

      if (!response.ok) throw new Error('Error al enviar respuesta')

      toast.success('Mensaje enviado')
      setReplyText('')
      fetchThreads()
      fetchStats()

      const updatedThread = await response.json()
      setSelectedThread(updatedThread)
    } catch (error) {
      toast.error('Error al enviar mensaje')
    } finally {
      setSendingReply(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!selectedThread) return

    setGeneratingAI(true)
    try {
      const response = await fetch(`/api/inbox/${selectedThread.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customInstruction: aiInstruction || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar respuesta')
      }

      setReplyText(data.suggestion)
      setAIInstruction('')
      toast.success('Respuesta generada con IA')
    } catch (error: any) {
      toast.error(error.message || 'Error al generar respuesta')
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleToggleStar = async (threadId: string, isStarred: boolean) => {
    try {
      await fetch(`/api/inbox/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !isStarred }),
      })
      fetchThreads()
      fetchStats()

      if (selectedThread?.id === threadId) {
        setSelectedThread({ ...selectedThread, isStarred: !isStarred })
      }
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const handleArchiveThread = async (threadId: string) => {
    try {
      await fetch(`/api/inbox/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      })
      toast.success('Conversacion archivada')
      fetchThreads()
      fetchStats()
      if (selectedThread?.id === threadId) {
        setSelectedThread(null)
      }
    } catch (error) {
      toast.error('Error al archivar')
    }
  }

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('Estas seguro de eliminar esta conversacion?')) return

    try {
      await fetch(`/api/inbox/${threadId}`, { method: 'DELETE' })
      toast.success('Conversacion eliminada')
      fetchThreads()
      fetchStats()
      if (selectedThread?.id === threadId) {
        setSelectedThread(null)
      }
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  const handleSavePrompts = async () => {
    if (!selectedThread?.campaign?.id) {
      toast.error('No hay campana asociada')
      return
    }

    setSavingPrompts(true)
    try {
      const response = await fetch(`/api/campaigns/${selectedThread.campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productPrompt,
          instructionsPrompt,
        }),
      })

      if (!response.ok) throw new Error('Error al guardar')

      toast.success('Prompts guardados')
    } catch (error) {
      toast.error('Error al guardar prompts')
    } finally {
      setSavingPrompts(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getFilterCount = (filter: FilterType) => {
    switch (filter) {
      case 'unreplied':
        return stats.unreplied
      case 'unread':
        return stats.unread
      case 'starred':
        return stats.starred
      default:
        return stats.total
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  return (
    <div className="flex h-full bg-background">
      {/* Left Sidebar - Conversations List */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">Conversaciones</h1>
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                {stats.total}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { fetchThreads(); fetchStats(); }}
              disabled={loading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>

          {/* Account Selector */}
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-full bg-secondary border-border mb-3">
              <SelectValue placeholder="Todas las cuentas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las cuentas</SelectItem>
              {emailAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter Tabs */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'unreplied', 'unread', 'starred'] as FilterType[]).map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "text-xs px-2 h-7",
                  activeFilter === filter
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filter === 'starred' && <Star className="h-3 w-3 mr-1" />}
                {filterLabels[filter]}
                {getFilterCount(filter) > 0 && (
                  <span className="ml-1 text-xs opacity-60">
                    ({getFilterCount(filter)})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">No hay conversaciones</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Las conversaciones apareceran aqui cuando recibas respuestas
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {threads.map((thread) => {
                const hasUnread = thread.messages.some(m => !m.isRead && m.direction === 'INBOUND')
                const lastMessage = thread.messages[thread.messages.length - 1]
                const isSelected = selectedThread?.id === thread.id

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={cn(
                      "p-4 cursor-pointer transition-colors hover:bg-accent/50 relative",
                      isSelected && "bg-accent",
                      hasUnread && "bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className={cn(
                          "text-sm font-medium",
                          hasUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {getInitials(thread.contact.firstName, thread.contact.lastName)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className={cn(
                              "font-medium truncate text-sm",
                              hasUnread ? "text-foreground" : "text-foreground/80"
                            )}>
                              {thread.contact.firstName} {thread.contact.lastName}
                            </p>
                            {thread.isStarred && (
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {format(new Date(thread.lastMessageAt), 'HH:mm')}
                          </span>
                        </div>

                        {/* Company */}
                        {thread.contact.company && (
                          <p className="text-xs text-muted-foreground truncate">
                            {thread.contact.company.name}
                          </p>
                        )}

                        {/* Preview */}
                        <p className={cn(
                          "text-xs truncate mt-0.5",
                          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {lastMessage?.direction === 'OUTBOUND' && (
                            <span className="text-muted-foreground">Tu: </span>
                          )}
                          {lastMessage?.body.replace(/<[^>]*>/g, '').substring(0, 50)}...
                        </p>

                        {/* Campaign badge */}
                        {thread.campaign && (
                          <Badge variant="outline" className="text-[10px] mt-1.5 h-5">
                            {thread.campaign.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {hasUnread && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Circle className="h-2.5 w-2.5 text-primary fill-primary" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Center - Chat Area */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col bg-background">
          {/* Chat Header */}
          <div className="h-16 px-4 border-b border-border flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(selectedThread.contact.firstName, selectedThread.contact.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">
                    {selectedThread.contact.firstName} {selectedThread.contact.lastName}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleToggleStar(selectedThread.id, selectedThread.isStarred)}
                  >
                    <Star className={cn(
                      "h-4 w-4",
                      selectedThread.isStarred ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                    )} />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {selectedThread.contact.company && (
                    <span>{selectedThread.contact.company.name}</span>
                  )}
                  {selectedThread.contact.jobTitle && (
                    <>
                      <span>·</span>
                      <span>{selectedThread.contact.jobTitle}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {selectedThread.contact.phone && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  asChild
                >
                  <a href={`tel:${selectedThread.contact.phone}`}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => copyToClipboard(selectedThread.contact.email)}
              >
                <Mail className="h-4 w-4" />
              </Button>
              {selectedThread.contact.linkedinUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  asChild
                >
                  <a href={selectedThread.contact.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => copyToClipboard(selectedThread.contact.email)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchiveThread(selectedThread.id)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archivar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeleteThread(selectedThread.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {/* Date Separator */}
            <div className="flex items-center justify-center mb-6">
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                {format(new Date(selectedThread.messages[0]?.sentAt || new Date()), "d 'de' MMMM, yyyy", { locale: es })}
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {selectedThread.messages.map((message, index) => {
                const isOutbound = message.direction === 'OUTBOUND'
                const showDate = index > 0 &&
                  format(new Date(message.sentAt), 'yyyy-MM-dd') !==
                  format(new Date(selectedThread.messages[index - 1].sentAt), 'yyyy-MM-dd')

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                          {format(new Date(message.sentAt), "d 'de' MMMM", { locale: es })}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex",
                        isOutbound ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5",
                          isOutbound
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        )}
                      >
                        {message.subject && message.subject !== `Re: ${selectedThread.subject}` && (
                          <p className={cn(
                            "text-xs font-medium mb-1",
                            isOutbound ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}>
                            {message.subject}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.body.replace(/<[^>]*>/g, '')}
                        </p>
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-1",
                          isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          <span className="text-[10px]">
                            {format(new Date(message.sentAt), 'HH:mm')}
                          </span>
                          {isOutbound && (
                            <CheckCheck className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-card">
            {/* AI Generate Row */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Input
                  placeholder="Instruir al AI sobre que generar..."
                  value={aiInstruction}
                  onChange={(e) => setAIInstruction(e.target.value)}
                  className="pr-10 bg-secondary border-border text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleGenerateAI()
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleGenerateAI}
                disabled={generatingAI}
                variant="outline"
                className="gap-2"
              >
                {generatingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generar
              </Button>
            </div>

            {/* Reply Input */}
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                <Smile className="h-5 w-5 text-muted-foreground" />
              </Button>
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Tu mensaje..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[44px] max-h-[200px] pr-10 bg-secondary border-border resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendReply()
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 bottom-1 h-8 w-8"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <Button
                onClick={handleSendReply}
                disabled={sendingReply || !replyText.trim()}
                className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {sendingReply ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Selecciona una conversacion</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Elige una conversacion de la lista para ver los mensajes
            </p>
          </div>
        </div>
      )}

      {/* Right Sidebar - Contact Info & Campaign Prompts */}
      {selectedThread && (
        <div className="w-80 border-l border-border bg-card flex flex-col">
          {/* Contact Info */}
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">Informacion del contacto</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">
                    {selectedThread.contact.firstName} {selectedThread.contact.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedThread.contact.email}</p>
                </div>
              </div>

              {selectedThread.contact.company && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-foreground">{selectedThread.contact.company.name}</p>
                    {selectedThread.contact.jobTitle && (
                      <p className="text-xs text-muted-foreground">{selectedThread.contact.jobTitle}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedThread.contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-foreground">{selectedThread.contact.phone}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Primer contacto: {format(new Date(selectedThread.messages[0]?.sentAt || new Date()), "d MMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* Campaign Section */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">Campana</h3>
            </div>

            {selectedThread.campaign ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm">
                    {selectedThread.campaign.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      selectedThread.campaign.status === 'ACTIVE'
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {selectedThread.campaign.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <Circle className={cn(
                  "h-3 w-3",
                  selectedThread.campaign.status === 'ACTIVE' ? "text-emerald-500 fill-emerald-500" : "text-muted-foreground"
                )} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin campana asociada</p>
            )}
          </div>

          {/* Prompts Section */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Product Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Producto o servicio
                </Label>
                <p className="text-xs text-muted-foreground">
                  Describe el producto o servicio que estas ofreciendo.
                </p>
                <div className="relative">
                  <div className="absolute top-2 left-3 text-[10px] text-muted-foreground uppercase tracking-wider">
                    PROMPT
                  </div>
                  <Textarea
                    placeholder="Trabajo en una empresa de software que ayuda a..."
                    value={productPrompt}
                    onChange={(e) => setProductPrompt(e.target.value)}
                    className="min-h-[100px] pt-7 bg-secondary border-border text-sm resize-none"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Instrucciones
                </Label>
                <p className="text-xs text-muted-foreground">
                  Instrucciones que el agente debe seguir al hablar con el contacto.
                </p>
                <div className="relative">
                  <div className="absolute top-2 left-3 text-[10px] text-muted-foreground uppercase tracking-wider">
                    PROMPT
                  </div>
                  <Textarea
                    placeholder="Pregunta cuanto tiempo invierten en prospectar..."
                    value={instructionsPrompt}
                    onChange={(e) => setInstructionsPrompt(e.target.value)}
                    className="min-h-[100px] pt-7 bg-secondary border-border text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Save Prompts Button */}
          {selectedThread.campaign && (
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleSavePrompts}
                disabled={savingPrompts}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {savingPrompts ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Guardar prompts
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
