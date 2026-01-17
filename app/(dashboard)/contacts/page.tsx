'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/shared/header'
import { ContactTable } from '@/components/contacts/contact-table'
import { ContactForm } from '@/components/contacts/contact-form'
import { CSVImport } from '@/components/contacts/csv-import'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Upload, Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  emailStatus: string
  phone: string | null
  linkedinUrl: string | null
  jobTitle: string | null
  company: {
    name: string
  } | null
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [emailStatusFilter, setEmailStatusFilter] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search && { search }),
        ...(emailStatusFilter && { emailStatus: emailStatusFilter }),
      })

      const response = await fetch(`/api/contacts?${params}`)
      const data = await response.json()

      setContacts(data.data || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      toast.error('Error al cargar contactos')
    } finally {
      setLoading(false)
    }
  }, [page, search, emailStatusFilter])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const handleAddContact = async (data: any) => {
    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Error al crear contacto')
    }

    toast.success('Contacto creado correctamente')
    fetchContacts()
  }

  const handleEditContact = async (data: any) => {
    if (!editingContact) return

    const response = await fetch(`/api/contacts/${editingContact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Error al actualizar contacto')
    }

    toast.success('Contacto actualizado correctamente')
    setEditingContact(null)
    fetchContacts()
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('¿Estás seguro de eliminar este contacto?')) return

    const response = await fetch(`/api/contacts/${contactId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      toast.error('Error al eliminar contacto')
      return
    }

    toast.success('Contacto eliminado')
    fetchContacts()
  }

  const handleImport = async (data: Record<string, string>[]) => {
    const response = await fetch('/api/contacts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: data }),
    })

    if (!response.ok) {
      throw new Error('Error al importar contactos')
    }

    const result = await response.json()
    fetchContacts()
    return result
  }

  const handleAddToCampaign = (contactIds: string[]) => {
    // TODO: Implement add to campaign dialog
    toast.info(`${contactIds.length} contacto(s) seleccionado(s) para añadir a campaña`)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Contactos"
        subtitle={`${total} contactos en total`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir contacto
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contactos..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>

          <Select
            value={emailStatusFilter}
            onValueChange={(value) => {
              setEmailStatusFilter(value === 'all' ? '' : value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado del email" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="VALID">Válido</SelectItem>
              <SelectItem value="INVALID">Inválido</SelectItem>
              <SelectItem value="RISKY">Riesgo</SelectItem>
              <SelectItem value="CATCH_ALL">Catch-all</SelectItem>
              <SelectItem value="UNKNOWN">Desconocido</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchContacts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Table */}
        <ContactTable
          contacts={contacts}
          onEdit={setEditingContact}
          onDelete={handleDeleteContact}
          onAddToCampaign={handleAddToCampaign}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Form */}
      <ContactForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSubmit={handleAddContact}
        mode="create"
      />

      {/* Edit Contact Form */}
      {editingContact && (
        <ContactForm
          open={!!editingContact}
          onOpenChange={() => setEditingContact(null)}
          onSubmit={handleEditContact}
          initialData={{
            firstName: editingContact.firstName,
            lastName: editingContact.lastName,
            email: editingContact.email || '',
            phone: editingContact.phone || '',
            linkedinUrl: editingContact.linkedinUrl || '',
            jobTitle: editingContact.jobTitle || '',
            companyName: editingContact.company?.name || '',
          }}
          mode="edit"
        />
      )}

      {/* CSV Import */}
      <CSVImport
        open={showImport}
        onOpenChange={setShowImport}
        onImport={handleImport}
      />
    </div>
  )
}
