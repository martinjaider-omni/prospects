'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Search,
  Loader2,
  CheckCircle,
  Settings2,
  Trash2,
  Plus,
  Linkedin,
  Mail,
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

function AccountsPageContent() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
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
      window.history.replaceState({}, '', '/accounts')
      fetchAccounts()
    }
    if (error) {
      toast.error(error)
      window.history.replaceState({}, '', '/accounts')
    }
  }, [searchParams])

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    setLoading(true)
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
    } finally {
      setLoading(false)
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
    if (!confirm(`¿Eliminar la cuenta ${account.name}?`)) return

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

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'GMAIL':
        return <GmailIcon className="h-5 w-5 text-red-500" />
      case 'LINKEDIN':
        return <Linkedin className="h-5 w-5 text-blue-600" />
      case 'SMTP':
      case 'OUTLOOK':
        return <Mail className="h-5 w-5 text-muted-foreground" />
      default:
        return <Mail className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getAccountBadgeColor = (type: string) => {
    switch (type) {
      case 'GMAIL':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      case 'LINKEDIN':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <Header
        title="Cuentas"
        subtitle="Gestiona tus cuentas de Email y LinkedIn"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Manage accounts button */}
        <Button
          variant="outline"
          className="w-full border-border bg-card hover:bg-secondary text-secondary-foreground"
          onClick={() => {}}
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Gestionar cuentas
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Add account buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleConnectGmail}
            disabled={connectingGmail}
            className="flex-1 bg-secondary hover:bg-accent border border-border"
          >
            {connectingGmail ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GmailIcon className="mr-2 h-4 w-4" />
            )}
            Conectar Gmail
          </Button>
          <Button
            onClick={handleConnectLinkedInOAuth}
            disabled={connectingLinkedIn}
            className="flex-1 bg-blue-600 hover:bg-blue-700 border border-blue-700"
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
            className="bg-secondary hover:bg-accent border-border"
            title="Conectar manualmente con cookie de sesion"
          >
            <Plus className="mr-2 h-4 w-4" />
            Manual
          </Button>
          <Button
            onClick={() => setShowSMTPDialog(true)}
            variant="outline"
            className="bg-secondary hover:bg-accent border-border"
          >
            <Plus className="mr-2 h-4 w-4" />
            SMTP
          </Button>
        </div>

        {/* Accounts list */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay cuentas configuradas</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Conecta una cuenta de Gmail o LinkedIn para empezar
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAccounts.map((account) => (
              <Card
                key={account.id}
                className="bg-card border-border hover:bg-secondary/50 transition-colors"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center text-lg font-semibold text-secondary-foreground">
                      {account.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center ${
                      account.type === 'LINKEDIN' ? 'bg-blue-600' : account.type === 'GMAIL' ? 'bg-white' : 'bg-muted'
                    }`}>
                      {account.type === 'LINKEDIN' ? (
                        <Linkedin className="h-3 w-3 text-white" />
                      ) : account.type === 'GMAIL' ? (
                        <GmailIcon className="h-3 w-3" />
                      ) : (
                        <Mail className="h-3 w-3 text-white" />
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
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Conectado
                  </Badge>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => handleDeleteAccount(account)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* LinkedIn Dialog */}
      <Dialog open={showLinkedInDialog} onOpenChange={setShowLinkedInDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-blue-500" />
              Conectar cuenta de LinkedIn
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Agrega tu cuenta de LinkedIn para enviar mensajes y conexiones
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-secondary-foreground">Nombre</Label>
              <Input
                value={linkedInForm.name}
                onChange={(e) => setLinkedInForm({ ...linkedInForm, name: e.target.value })}
                placeholder="Mi cuenta de LinkedIn"
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-secondary-foreground">URL del perfil</Label>
              <Input
                value={linkedInForm.profileUrl}
                onChange={(e) => setLinkedInForm({ ...linkedInForm, profileUrl: e.target.value })}
                placeholder="https://www.linkedin.com/in/tu-perfil"
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-secondary-foreground">Session Cookie (li_at)</Label>
              <Input
                type="password"
                value={linkedInForm.sessionCookie}
                onChange={(e) => setLinkedInForm({ ...linkedInForm, sessionCookie: e.target.value })}
                placeholder="Cookie de sesion de LinkedIn"
                className="bg-secondary border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Obtén esta cookie desde las herramientas de desarrollador de tu navegador
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowLinkedInDialog(false)}
                className="border-border text-secondary-foreground hover:bg-secondary"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveLinkedIn}
                disabled={savingAccount}
                className="bg-blue-600 hover:bg-blue-700"
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
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Agregar cuenta SMTP
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configura una cuenta de email usando SMTP
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-secondary-foreground">Nombre</Label>
                <Input
                  value={smtpForm.name}
                  onChange={(e) => setSmtpForm({ ...smtpForm, name: e.target.value })}
                  placeholder="Mi cuenta de trabajo"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-secondary-foreground">Email</Label>
                <Input
                  type="email"
                  value={smtpForm.email}
                  onChange={(e) => setSmtpForm({ ...smtpForm, email: e.target.value })}
                  placeholder="tu@email.com"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-secondary-foreground">Servidor SMTP</Label>
                <Input
                  value={smtpForm.smtpHost}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-secondary-foreground">Puerto</Label>
                <Input
                  value={smtpForm.smtpPort}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtpPort: e.target.value })}
                  placeholder="587"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-secondary-foreground">Usuario SMTP</Label>
              <Input
                value={smtpForm.smtpUser}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtpUser: e.target.value })}
                placeholder="tu@email.com"
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-secondary-foreground">Contrasena SMTP</Label>
              <Input
                type="password"
                value={smtpForm.smtpPass}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtpPass: e.target.value })}
                placeholder="Contrasena o App Password"
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowSMTPDialog(false)}
                className="border-border text-secondary-foreground hover:bg-secondary"
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

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <AccountsPageContent />
    </Suspense>
  )
}
