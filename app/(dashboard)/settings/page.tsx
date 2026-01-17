'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Key,
  Trash2,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Search,
  Linkedin,
  Mail,
  Plus,
  UserCircle,
} from 'lucide-react'
import { toast } from 'sonner'

// Gmail icon SVG component
function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
    </svg>
  )
}

interface APIConfig {
  apollo: {
    configured: boolean
    id?: string
    dailySearchLimit?: number
    searchesToday?: number
  }
  ai: {
    configured: boolean
    id?: string
    provider?: string
    model?: string
  }
}

interface Account {
  id: string
  name: string
  email?: string
  profileUrl?: string
  type: 'GMAIL' | 'SMTP' | 'OUTLOOK' | 'LINKEDIN'
  isActive: boolean
  isVerified?: boolean
  avatar?: string
  subtitle?: string
  location?: string
}

function SettingsPageContent() {
  const searchParams = useSearchParams()
  const [apiConfig, setAPIConfig] = useState<APIConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // API key form state
  const [apolloKey, setApolloKey] = useState('')
  const [showApolloKey, setShowApolloKey] = useState(false)
  const [savingApollo, setSavingApollo] = useState(false)

  const [aiProvider, setAIProvider] = useState('OPENAI')
  const [aiKey, setAIKey] = useState('')
  const [aiModel, setAIModel] = useState('')
  const [showAIKey, setShowAIKey] = useState(false)
  const [savingAI, setSavingAI] = useState(false)

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [connectingGmail, setConnectingGmail] = useState(false)
  const [connectingLinkedIn, setConnectingLinkedIn] = useState(false)
  const [showLinkedInDialog, setShowLinkedInDialog] = useState(false)
  const [showSMTPDialog, setShowSMTPDialog] = useState(false)
  const [savingAccount, setSavingAccount] = useState(false)

  // LinkedIn form
  const [linkedInForm, setLinkedInForm] = useState({
    name: '',
    profileUrl: '',
    sessionCookie: '',
  })

  // SMTP form
  const [smtpForm, setSmtpForm] = useState({
    name: '',
    email: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
  })

  // Handle OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      toast.success(success)
      window.history.replaceState({}, '', '/settings')
      fetchAccounts()
    }
    if (error) {
      toast.error(error)
      window.history.replaceState({}, '', '/settings')
    }
  }, [searchParams])

  useEffect(() => {
    fetchData()
    fetchAccounts()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const apiRes = await fetch('/api/settings/api-keys')
      const api = await apiRes.json()
      setAPIConfig(api)
    } catch (error) {
      toast.error('Error al cargar configuracion')
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const [emailRes, linkedInRes] = await Promise.all([
        fetch('/api/settings/email-accounts'),
        fetch('/api/settings/linkedin-accounts'),
      ])

      const emailData = await emailRes.json()
      const linkedInData = await linkedInRes.json()

      const emailAccounts = (Array.isArray(emailData) ? emailData : []).map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        email: acc.email,
        type: acc.type,
        isActive: acc.isActive,
        isVerified: acc.isVerified,
        subtitle: acc.email,
        avatar: undefined,
      }))

      const linkedInAccounts = (Array.isArray(linkedInData) ? linkedInData : []).map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        profileUrl: acc.profileUrl,
        type: 'LINKEDIN' as const,
        isActive: acc.isActive,
        subtitle: acc.profileUrl?.replace('https://www.linkedin.com/in/', '').replace('/', ''),
        avatar: undefined,
      }))

      setAccounts([...emailAccounts, ...linkedInAccounts])
    } catch (error) {
      toast.error('Error al cargar cuentas')
    }
  }

  const handleSaveApolloKey = async () => {
    if (!apolloKey) {
      toast.error('Ingresa la API key de Apollo')
      return
    }

    setSavingApollo(true)
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'apollo',
          apiKey: apolloKey,
        }),
      })

      if (!response.ok) throw new Error('Error al guardar')

      toast.success('API key de Apollo guardada')
      setApolloKey('')
      fetchData()
    } catch (error) {
      toast.error('Error al guardar API key')
    } finally {
      setSavingApollo(false)
    }
  }

  const handleSaveAIKey = async () => {
    if (!aiKey || !aiProvider) {
      toast.error('Selecciona proveedor e ingresa API key')
      return
    }

    setSavingAI(true)
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai',
          apiKey: aiKey,
          provider: aiProvider,
          model: aiModel,
        }),
      })

      if (!response.ok) throw new Error('Error al guardar')

      toast.success('Configuracion de IA guardada')
      setAIKey('')
      fetchData()
    } catch (error) {
      toast.error('Error al guardar configuracion')
    } finally {
      setSavingAI(false)
    }
  }

  const handleDeleteAPIKey = async (type: 'apollo' | 'ai') => {
    try {
      await fetch(`/api/settings/api-keys?type=${type}`, {
        method: 'DELETE',
      })
      toast.success('Configuracion eliminada')
      fetchData()
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  const handleConnectGmail = async () => {
    setConnectingGmail(true)
    try {
      const response = await fetch('/api/auth/gmail')
      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al conectar con Gmail')
    } finally {
      setConnectingGmail(false)
    }
  }

  const handleConnectLinkedInOAuth = async () => {
    setConnectingLinkedIn(true)
    try {
      const response = await fetch('/api/auth/linkedin')
      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al conectar con LinkedIn')
    } finally {
      setConnectingLinkedIn(false)
    }
  }

  const handleSaveLinkedIn = async () => {
    if (!linkedInForm.name || !linkedInForm.profileUrl) {
      toast.error('Nombre y URL de perfil son requeridos')
      return
    }

    setSavingAccount(true)
    try {
      const response = await fetch('/api/settings/linkedin-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkedInForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success('Cuenta de LinkedIn agregada')
      setShowLinkedInDialog(false)
      setLinkedInForm({ name: '', profileUrl: '', sessionCookie: '' })
      fetchAccounts()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar cuenta')
    } finally {
      setSavingAccount(false)
    }
  }

  const handleSaveSMTP = async () => {
    if (!smtpForm.name || !smtpForm.email || !smtpForm.smtpHost) {
      toast.error('Nombre, email y servidor SMTP son requeridos')
      return
    }

    setSavingAccount(true)
    try {
      const response = await fetch('/api/settings/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...smtpForm,
          type: 'SMTP',
          smtpPort: parseInt(smtpForm.smtpPort),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success('Cuenta SMTP agregada')
      setShowSMTPDialog(false)
      setSmtpForm({ name: '', email: '', smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '' })
      fetchAccounts()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar cuenta')
    } finally {
      setSavingAccount(false)
    }
  }

  const handleDeleteAccount = async (account: Account) => {
    if (!confirm(`Eliminar la cuenta ${account.name}?`)) return

    try {
      const endpoint = account.type === 'LINKEDIN'
        ? `/api/settings/linkedin-accounts/${account.id}`
        : `/api/settings/email-accounts/${account.id}`

      await fetch(endpoint, { method: 'DELETE' })
      toast.success('Cuenta eliminada')
      fetchAccounts()
    } catch (error) {
      toast.error('Error al eliminar cuenta')
    }
  }

  const filteredAccounts = accounts.filter(acc =>
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.profileUrl?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const AI_PROVIDERS = [
    { value: 'OPENAI', label: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'] },
    { value: 'ANTHROPIC', label: 'Anthropic (Claude)', models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'] },
    { value: 'GOOGLE', label: 'Google (Gemini)', models: ['gemini-1.5-flash', 'gemini-1.5-pro'] },
  ]

  const selectedProvider = AI_PROVIDERS.find(p => p.value === aiProvider)

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <Header
          title="Configuracion"
          subtitle="Gestiona tus cuentas y preferencias"
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <Header
        title="Configuracion"
        subtitle="Gestiona tus cuentas y preferencias"
      />

      <div className="flex-1 p-6 overflow-auto scrollbar-thin">
        <Tabs defaultValue="cuentas" className="w-full">
          <TabsList className="bg-secondary border border-border mb-6">
            <TabsTrigger
              value="cuentas"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <UserCircle className="mr-2 h-4 w-4" />
              Cuentas
            </TabsTrigger>
            <TabsTrigger
              value="integraciones"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <Key className="mr-2 h-4 w-4" />
              Integraciones
            </TabsTrigger>
          </TabsList>

          {/* Cuentas Tab */}
          <TabsContent value="cuentas" className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cuentas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Add account buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleConnectGmail}
                disabled={connectingGmail}
                variant="outline"
                className="flex-1 min-w-[150px]"
              >
                {connectingGmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GmailIcon className="mr-2 h-4 w-4 text-red-500" />
                )}
                Conectar Gmail
              </Button>
              <Button
                onClick={handleConnectLinkedInOAuth}
                disabled={connectingLinkedIn}
                className="flex-1 min-w-[150px] bg-[#0A66C2] hover:bg-[#004182] text-white"
              >
                {connectingLinkedIn ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Linkedin className="mr-2 h-4 w-4" />
                )}
                Conectar LinkedIn
              </Button>
              <Button
                onClick={() => setShowLinkedInDialog(true)}
                variant="outline"
                title="Conectar manualmente con cookie de sesion"
              >
                <Plus className="mr-2 h-4 w-4" />
                Manual
              </Button>
              <Button
                onClick={() => setShowSMTPDialog(true)}
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                SMTP
              </Button>
            </div>

            {/* Accounts list */}
            <div className="space-y-3">
              {filteredAccounts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay cuentas configuradas</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Conecta una cuenta de Gmail o LinkedIn para empezar
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredAccounts.map((account) => (
                  <Card
                    key={account.id}
                    className="hover:border-primary/50 transition-colors"
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-lg font-semibold text-foreground">
                          {account.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center ${
                          account.type === 'LINKEDIN' ? 'bg-[#0A66C2]' : account.type === 'GMAIL' ? 'bg-white border border-border' : 'bg-muted'
                        }`}>
                          {account.type === 'LINKEDIN' ? (
                            <Linkedin className="h-3 w-3 text-white" />
                          ) : account.type === 'GMAIL' ? (
                            <GmailIcon className="h-3 w-3" />
                          ) : (
                            <Mail className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {account.name}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {account.subtitle || account.email || account.profileUrl}
                        </p>
                      </div>

                      {/* Status badge */}
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Conectado
                      </Badge>

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteAccount(account)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Integraciones Tab */}
          <TabsContent value="integraciones" className="space-y-6">
            {/* Apollo API */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2.5">
                    <Search className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Apollo.io</CardTitle>
                    <CardDescription>
                      Para buscar y verificar contactos
                    </CardDescription>
                  </div>
                  {apiConfig?.apollo?.configured && (
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Configurado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiConfig?.apollo?.configured ? (
                  <div className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-foreground">API Key configurada</p>
                      <p className="text-sm text-muted-foreground">
                        Busquedas hoy: {apiConfig?.apollo?.searchesToday || 0} / {apiConfig?.apollo?.dailySearchLimit || 0}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteAPIKey('apollo')}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApolloKey ? 'text' : 'password'}
                        placeholder="Ingresa tu API key de Apollo"
                        value={apolloKey}
                        onChange={(e) => setApolloKey(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowApolloKey(!showApolloKey)}
                      >
                        {showApolloKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button
                      onClick={handleSaveApolloKey}
                      disabled={savingApollo}
                    >
                      {savingApollo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI API */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Inteligencia Artificial</CardTitle>
                    <CardDescription>
                      Para generar emails personalizados
                    </CardDescription>
                  </div>
                  {apiConfig?.ai?.configured && (
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {apiConfig?.ai?.provider}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiConfig?.ai?.configured ? (
                  <div className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-foreground">{apiConfig?.ai?.provider} configurado</p>
                      <p className="text-sm text-muted-foreground">
                        Modelo: {apiConfig?.ai?.model}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteAPIKey('ai')}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Proveedor</Label>
                        <Select value={aiProvider} onValueChange={setAIProvider}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_PROVIDERS.map((provider) => (
                              <SelectItem key={provider.value} value={provider.value}>
                                {provider.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Modelo</Label>
                        <Select value={aiModel} onValueChange={setAIModel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Modelo por defecto" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedProvider?.models.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showAIKey ? 'text' : 'password'}
                          placeholder="Ingresa tu API key"
                          value={aiKey}
                          onChange={(e) => setAIKey(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowAIKey(!showAIKey)}
                        >
                          {showAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        onClick={handleSaveAIKey}
                        disabled={savingAI}
                      >
                        {savingAI && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* LinkedIn Dialog */}
      <Dialog open={showLinkedInDialog} onOpenChange={setShowLinkedInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-[#0A66C2]" />
              Conectar cuenta de LinkedIn
            </DialogTitle>
            <DialogDescription>
              Agrega tu cuenta de LinkedIn para enviar mensajes y conexiones
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={linkedInForm.name}
                onChange={(e) => setLinkedInForm({ ...linkedInForm, name: e.target.value })}
                placeholder="Mi cuenta de LinkedIn"
              />
            </div>

            <div className="space-y-2">
              <Label>URL del perfil</Label>
              <Input
                value={linkedInForm.profileUrl}
                onChange={(e) => setLinkedInForm({ ...linkedInForm, profileUrl: e.target.value })}
                placeholder="https://www.linkedin.com/in/tu-perfil"
              />
            </div>

            <div className="space-y-2">
              <Label>Session Cookie (li_at)</Label>
              <Input
                type="password"
                value={linkedInForm.sessionCookie}
                onChange={(e) => setLinkedInForm({ ...linkedInForm, sessionCookie: e.target.value })}
                placeholder="Cookie de sesion de LinkedIn"
              />
              <p className="text-xs text-muted-foreground">
                Obten esta cookie desde las herramientas de desarrollador de tu navegador
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowLinkedInDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveLinkedIn}
                disabled={savingAccount}
                className="bg-[#0A66C2] hover:bg-[#004182]"
              >
                {savingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Conectar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMTP Dialog */}
      <Dialog open={showSMTPDialog} onOpenChange={setShowSMTPDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Agregar cuenta SMTP
            </DialogTitle>
            <DialogDescription>
              Configura una cuenta de email usando SMTP
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={smtpForm.name}
                  onChange={(e) => setSmtpForm({ ...smtpForm, name: e.target.value })}
                  placeholder="Mi cuenta de trabajo"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={smtpForm.email}
                  onChange={(e) => setSmtpForm({ ...smtpForm, email: e.target.value })}
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Servidor SMTP</Label>
                <Input
                  value={smtpForm.smtpHost}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Puerto</Label>
                <Input
                  value={smtpForm.smtpPort}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtpPort: e.target.value })}
                  placeholder="587"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Usuario SMTP</Label>
              <Input
                value={smtpForm.smtpUser}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtpUser: e.target.value })}
                placeholder="tu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Contrasena SMTP</Label>
              <Input
                type="password"
                value={smtpForm.smtpPass}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtpPass: e.target.value })}
                placeholder="Contrasena o App Password"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowSMTPDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveSMTP}
                disabled={savingAccount}
              >
                {savingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <SettingsPageContent />
    </Suspense>
  )
}
