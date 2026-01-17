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
  MessageSquare,
  Send,
  Phone,
  Share2,
  Star,
  RefreshCw,
  ChevronDown,
  Smile,
  Paperclip,
  MoreHorizontal,
  Search,
  Filter,
  Clock,
  CheckCheck,
  Circle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
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
    company?: {
      name: string
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
  }
}

interface EmailMessage {
  id: string
  direction: 'INBOUND' | 'OUTBOUND'
  subject: string
  body: string
  sentAt: string
  isRead: boolean
  fromEmail: string
  toEmail: string
}

type FilterType = 'all' | 'unreplied' | 'unread' | 'unconfirmed'

const filterLabels: Record<FilterType, string> = {
  all: 'Todos',
  unreplied: 'Sin responder',
  unread: 'No leídos',
  unconfirmed: 'Sin confirmar',
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedThread?.messages])

  const fetchThreads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeFilter === 'unreplied') params.set('status', 'ACTIVE')
      if (activeFilter === 'unread') params.set('unread', 'true')
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/inbox?${params}`)
      const data = await response.json()
      setThreads(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Error al cargar conversaciones')
      setThreads([])
    } finally {
      setLoading(false)
    }
  }, [activeFilter, searchQuery])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  const handleSelectThread = async (thread: EmailThread) => {
    setSelectedThread(thread)
    if (thread.messages.some(m => !m.isRead && m.direction === 'INBOUND')) {
      try {
        await fetch(`/api/inbox/${thread.id}/read`, { method: 'POST' })
        fetchThreads()
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

      const updatedThread = await response.json()
      setSelectedThread(updatedThread)
    } catch (error) {
      toast.error('Error al enviar mensaje')
    } finally {
      setSendingReply(false)
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
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getFilterCount = (filter: FilterType) => {
    switch (filter) {
      case 'unreplied':
        return threads.filter(t => t.status === 'ACTIVE').length
      case 'unread':
        return threads.filter(t => t.messages.some(m => !m.isRead && m.direction === 'INBOUND')).length
      case 'unconfirmed':
        return threads.filter(t => t.status === 'PENDING').length
      default:
        return threads.length
    }
  }

  const filteredThreads = threads.filter(thread => {
    if (activeFilter === 'unreplied') return thread.status === 'ACTIVE'
    if (activeFilter === 'unread') return thread.messages.some(m => !m.isRead && m.direction === 'INBOUND')
    if (activeFilter === 'unconfirmed') return thread.status === 'PENDING'
    return true
  })

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
                {threads.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchThreads}
              disabled={loading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          {/* Account Selector */}
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-full bg-secondary border-border mb-3">
              <SelectValue placeholder="Todas las cuentas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las cuentas</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Tabs */}
          <div className="flex gap-1">
            {(['unreplied', 'unread', 'unconfirmed'] as FilterType[]).map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "text-xs px-3 h-8",
                  activeFilter === filter
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
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
          {filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">No hay conversaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredThreads.map((thread) => {
                const hasUnread = thread.messages.some(m => !m.isRead && m.direction === 'INBOUND')
                const lastMessage = thread.messages[thread.messages.length - 1]
                const isSelected = selectedThread?.id === thread.id

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={cn(
                      "p-4 cursor-pointer transition-colors hover:bg-accent/50",
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
                          <p className={cn(
                            "font-medium truncate text-sm",
                            hasUnread ? "text-foreground" : "text-foreground/80"
                          )}>
                            {thread.contact.firstName} {thread.contact.lastName}
                          </p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {format(new Date(thread.lastMessageAt), 'HH:mm')}
                          </span>
                        </div>

                        {/* Preview */}
                        <p className={cn(
                          "text-xs truncate mt-0.5",
                          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {lastMessage?.direction === 'OUTBOUND' && (
                            <span className="text-muted-foreground">Tú: </span>
                          )}
                          {lastMessage?.body.replace(/<[^>]*>/g, '').substring(0, 50)}...
                        </p>
                      </div>
                    </div>
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
                <p className="font-medium text-foreground">
                  {selectedThread.contact.firstName} {selectedThread.contact.lastName}
                </p>
                {selectedThread.contact.company && (
                  <p className="text-xs text-muted-foreground">
                    {selectedThread.contact.company.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-4">
                Ver más tareas
              </span>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {/* Date Separator */}
            <div className="flex items-center justify-center mb-6">
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                {format(new Date(selectedThread.messages[0]?.sentAt || new Date()), "d 'de' MMMM", { locale: es })}
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {selectedThread.messages.map((message) => {
                const isOutbound = message.direction === 'OUTBOUND'

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      isOutbound ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2.5",
                        isOutbound
                          ? "bg-cyan-500 text-white rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.body.replace(/<[^>]*>/g, '')}
                      </p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        isOutbound ? "text-white/70" : "text-muted-foreground"
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
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                <Smile className="h-5 w-5 text-muted-foreground" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  placeholder="Tu mensaje..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendReply()
                    }
                  }}
                  className="pr-10 bg-secondary border-border"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
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
                  <RefreshCw className="h-4 w-4 animate-spin" />
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
            <p className="text-muted-foreground">Selecciona una conversación</p>
          </div>
        </div>
      )}

      {/* Right Sidebar - Campaign Info & Prompts */}
      {selectedThread && (
        <div className="w-80 border-l border-border bg-card flex flex-col">
          {/* Campaign Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Configurar los prompts para la conversación.</span>
            </div>

            {/* Campaign Badge */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground text-sm">
                  {selectedThread.campaign?.name || 'Sin campaña'}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    selectedThread.campaign?.status === 'ACTIVE'
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {selectedThread.campaign?.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              <Circle className="h-3 w-3 text-emerald-500 fill-emerald-500" />
            </div>
          </div>

          {/* Prompts Section */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Product Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Describe tu producto o servicio
                </Label>
                <p className="text-xs text-muted-foreground">
                  Describe el producto o servicio que estás ofreciendo.
                </p>
                <div className="relative">
                  <div className="absolute top-2 left-3 text-[10px] text-muted-foreground uppercase tracking-wider">
                    PROMPT
                  </div>
                  <Textarea
                    placeholder="Trabajo en Theos AI agent, hacemos que los negocios 10x sus llamadas de venta reservadas..."
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
                    className="min-h-[100px] pt-7 bg-secondary border-border text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Instruir al AI sobre qué generar..."
                className="flex-1 bg-secondary border-border text-sm"
              />
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Generar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
