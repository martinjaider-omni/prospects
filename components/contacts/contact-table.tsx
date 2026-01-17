'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Mail,
  Linkedin,
  Phone,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

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

interface ContactTableProps {
  contacts: Contact[]
  onEdit?: (contact: Contact) => void
  onDelete?: (contactId: string) => void
  onAddToCampaign?: (contactIds: string[]) => void
}

const emailStatusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  VALID: { label: 'Válido', icon: CheckCircle, className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  INVALID: { label: 'Inválido', icon: XCircle, className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  RISKY: { label: 'Riesgo', icon: AlertCircle, className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  CATCH_ALL: { label: 'Catch-all', icon: AlertCircle, className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  UNKNOWN: { label: 'Desconocido', icon: AlertCircle, className: 'bg-muted text-muted-foreground' },
}

export function ContactTable({
  contacts,
  onEdit,
  onDelete,
  onAddToCampaign,
}: ContactTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)))
    }
  }

  const toggleOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  return (
    <div>
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3">
          <span className="text-sm font-medium text-primary">
            {selectedIds.size} contacto(s) seleccionado(s)
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddToCampaign?.(Array.from(selectedIds))}
          >
            <Send className="mr-2 h-4 w-4" />
            Añadir a campaña
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              selectedIds.forEach(id => onDelete?.(id))
              setSelectedIds(new Set())
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === contacts.length && contacts.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <p className="text-muted-foreground">No hay contactos</p>
                  <p className="text-sm text-muted-foreground">
                    Añade contactos manualmente o importa desde CSV
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => {
                const statusConfig = emailStatusConfig[contact.emailStatus] || emailStatusConfig.UNKNOWN
                const StatusIcon = statusConfig.icon

                return (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(contact.id)}
                        onCheckedChange={() => toggleOne(contact.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </div>
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
                      {contact.company?.name || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {contact.jobTitle || <span className="text-muted-foreground">-</span>}
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit?.(contact)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAddToCampaign?.([contact.id])}>
                            <Send className="mr-2 h-4 w-4" />
                            Añadir a campaña
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onDelete?.(contact.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
