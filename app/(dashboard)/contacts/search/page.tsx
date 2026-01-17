'use client'

import { useState } from 'react'
import { Header } from '@/components/shared/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Building2,
  Loader2,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Linkedin,
  Mail,
  Phone,
  BadgeCheck,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { SENIORITY_OPTIONS, DEPARTMENT_OPTIONS } from '@/lib/constants'
import { ApolloLogo } from '@/components/icons/apollo-logo'

interface ApolloContact {
  firstName: string
  lastName: string
  email: string | null
  emailStatus: string
  phone: string | null
  linkedinUrl: string | null
  jobTitle: string | null
  seniority: string | null
  department: string | null
  location: string | null
  apolloId: string
  company: {
    name: string
    website: string | null
    linkedinUrl: string | null
    industry: string | null
    size: string | null
    apolloId: string
  } | null
}

const emailStatusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  VALID: { label: 'Válido', icon: CheckCircle, className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  INVALID: { label: 'Inválido', icon: XCircle, className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  RISKY: { label: 'Riesgo', icon: AlertCircle, className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  CATCH_ALL: { label: 'Catch-all', icon: AlertCircle, className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  UNKNOWN: { label: 'Desconocido', icon: AlertCircle, className: 'bg-muted text-muted-foreground' },
}

export default function ApolloSearchPage() {
  const [searchType, setSearchType] = useState<'domain' | 'name'>('domain')
  const [domain, setDomain] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [seniority, setSeniority] = useState('')
  const [department, setDepartment] = useState('')
  const [jobTitle, setJobTitle] = useState('')

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ApolloContact[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [pagination, setPagination] = useState<any>(null)
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set())

  const handleSearch = async (page = 1) => {
    const searchValue = searchType === 'domain' ? domain : companyName
    if (!searchValue) {
      toast.error('Ingresa un dominio o nombre de empresa')
      return
    }

    setLoading(true)
    setResults([])
    setSelectedIds(new Set())

    try {
      const response = await fetch('/api/apollo/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(searchType === 'domain' ? { domain } : { companyName }),
          ...(seniority && { seniorities: [seniority] }),
          ...(department && { departments: [department] }),
          ...(jobTitle && { jobTitles: [jobTitle] }),
          limit: 25,
          page,
        }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      setResults(data.data || [])
      setPagination(data.pagination)

      if (data.data?.length === 0) {
        toast.info('No se encontraron resultados')
      }
    } catch (error) {
      toast.error('Error al buscar en Apollo')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (apolloId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(apolloId)) {
      newSelected.delete(apolloId)
    } else {
      newSelected.add(apolloId)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(results.map(c => c.apolloId)))
    }
  }

  const handleSaveSelected = async () => {
    const selectedContacts = results.filter(c => selectedIds.has(c.apolloId))
    if (selectedContacts.length === 0) {
      toast.error('Selecciona al menos un contacto')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/apollo/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: selectedContacts }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      toast.success(`${data.saved} contacto(s) guardado(s), ${data.skipped} omitido(s)`)
      setSelectedIds(new Set())
    } catch (error) {
      toast.error('Error al guardar contactos')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyEmail = async (contact: ApolloContact) => {
    if (!contact.email) {
      toast.error('Este contacto no tiene email')
      return
    }

    setVerifyingIds(prev => new Set(prev).add(contact.apolloId))

    try {
      const response = await fetch('/api/apollo/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: contact.email }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      // Update the contact in results with new status
      const statusMap: Record<string, string> = {
        valid: 'VALID',
        invalid: 'INVALID',
        catch_all: 'CATCH_ALL',
        risky: 'RISKY',
        unknown: 'UNKNOWN',
      }

      setResults(prev =>
        prev.map(c =>
          c.apolloId === contact.apolloId
            ? { ...c, emailStatus: statusMap[data.status] || 'UNKNOWN' }
            : c
        )
      )

      toast.success(`Email verificado: ${statusMap[data.status] || 'UNKNOWN'}`)
    } catch (error) {
      toast.error('Error al verificar email')
    } finally {
      setVerifyingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(contact.apolloId)
        return newSet
      })
    }
  }

  const handleVerifySelected = async () => {
    const selectedContacts = results.filter(c => selectedIds.has(c.apolloId) && c.email)
    if (selectedContacts.length === 0) {
      toast.error('Selecciona contactos con email para verificar')
      return
    }

    const emails = selectedContacts.map(c => c.email).filter(Boolean) as string[]

    // Mark all selected as verifying
    setVerifyingIds(new Set(selectedContacts.map(c => c.apolloId)))

    try {
      const response = await fetch('/api/apollo/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      // Update results with verification statuses
      const statusMap: Record<string, string> = {
        valid: 'VALID',
        invalid: 'INVALID',
        catch_all: 'CATCH_ALL',
        risky: 'RISKY',
        unknown: 'UNKNOWN',
      }

      const resultsByEmail = new Map<string, string>(
        data.results?.map((r: any) => [r.email, statusMap[r.status] || 'UNKNOWN']) || []
      )

      setResults(prev =>
        prev.map(c => {
          if (c.email && resultsByEmail.has(c.email)) {
            const newStatus = resultsByEmail.get(c.email)
            return { ...c, emailStatus: newStatus || 'UNKNOWN' }
          }
          return c
        })
      )

      toast.success(`${data.results?.length || 0} email(s) verificado(s)`)
    } catch (error) {
      toast.error('Error al verificar emails')
    } finally {
      setVerifyingIds(new Set())
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Buscar Contactos"
        subtitle={
          <span className="flex items-center gap-2">
            Powered by <ApolloLogo className="h-4 w-auto inline-block" />
          </span>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Buscar Contactos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search Type */}
              <div className="space-y-2">
                <Label>Buscar por</Label>
                <Select value={searchType} onValueChange={(v: 'domain' | 'name') => setSearchType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domain">Dominio web</SelectItem>
                    <SelectItem value="name">Nombre empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Domain or Company Name */}
              <div className="space-y-2">
                <Label>{searchType === 'domain' ? 'Dominio' : 'Empresa'}</Label>
                {searchType === 'domain' ? (
                  <Input
                    placeholder="ejemplo.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                ) : (
                  <Input
                    placeholder="Nombre de la empresa"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                )}
              </div>

              {/* Job Title */}
              <div className="space-y-2">
                <Label>Cargo (opcional)</Label>
                <Input
                  placeholder="CEO, Marketing Manager..."
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>

              {/* Seniority */}
              <div className="space-y-2">
                <Label>Nivel (opcional)</Label>
                <Select value={seniority || 'all'} onValueChange={(v) => setSeniority(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los niveles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    {SENIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Department */}
              <div className="space-y-2">
                <Label>Departamento (opcional)</Label>
                <Select value={department || 'all'} onValueChange={(v) => setDepartment(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {DEPARTMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => handleSearch()} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Resultados ({pagination?.total_entries || results.length})
              </CardTitle>
              {selectedIds.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleVerifySelected}
                    disabled={verifyingIds.size > 0}
                  >
                    {verifyingIds.size > 0 ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <BadgeCheck className="mr-2 h-4 w-4" />
                    )}
                    Verificar emails
                  </Button>
                  <Button onClick={handleSaveSelected} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Guardar {selectedIds.size}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === results.length}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Verificar</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Contacto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((contact) => {
                      const statusConfig = emailStatusConfig[contact.emailStatus] || emailStatusConfig.UNKNOWN
                      const StatusIcon = statusConfig.icon

                      return (
                        <TableRow key={contact.apolloId}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(contact.apolloId)}
                              onCheckedChange={() => toggleSelect(contact.apolloId)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </div>
                            {contact.location && (
                              <div className="text-xs text-muted-foreground">{contact.location}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.email ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{contact.email}</span>
                                <Badge variant="secondary" className={statusConfig.className}>
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {statusConfig.label}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.email ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVerifyEmail(contact)}
                                disabled={verifyingIds.has(contact.apolloId)}
                                className="h-8"
                              >
                                {verifyingIds.has(contact.apolloId) ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <BadgeCheck className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.company ? (
                              <div>
                                <div className="font-medium">{contact.company.name}</div>
                                {contact.company.industry && (
                                  <div className="text-xs text-muted-foreground">{contact.company.industry}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{contact.jobTitle || '-'}</div>
                              {contact.seniority && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {contact.seniority}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {contact.email && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <a href={`mailto:${contact.email}`}>
                                    <Mail className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              {contact.phone && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <a href={`tel:${contact.phone}`}>
                                    <Phone className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              {contact.linkedinUrl && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer">
                                    <Linkedin className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {pagination.page} de {pagination.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch(pagination.page - 1)}
                      disabled={pagination.page === 1 || loading}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch(pagination.page + 1)}
                      disabled={pagination.page === pagination.total_pages || loading}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Busca contactos por empresa</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresa un dominio (ej: google.com) o nombre de empresa
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
