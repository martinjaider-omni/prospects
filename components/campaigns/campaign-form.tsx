'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface CampaignFormData {
  name: string
  description: string
  emailAccountId: string
  timezone: string
  dailyLimit: number
}

interface CampaignFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CampaignFormData) => Promise<void>
  initialData?: Partial<CampaignFormData>
  emailAccounts?: { id: string; name: string; email: string }[]
  mode?: 'create' | 'edit'
}

const TIMEZONES = [
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'Europe/London', label: 'Londres (GMT)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
]

export function CampaignForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  emailAccounts = [],
  mode = 'create',
}: CampaignFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CampaignFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    emailAccountId: initialData?.emailAccountId || '',
    timezone: initialData?.timezone || 'Europe/Madrid',
    dailyLimit: initialData?.dailyLimit || 50,
  })

  const handleChange = (field: keyof CampaignFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
      if (mode === 'create') {
        setFormData({
          name: '',
          description: '',
          emailAccountId: '',
          timezone: 'Europe/Madrid',
          dailyLimit: 50,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nueva Campaña' : 'Editar Campaña'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la campaña *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Outreach Q1 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descripción de la campaña..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailAccountId">Cuenta de email</Label>
            {emailAccounts.length === 0 ? (
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                No hay cuentas configuradas
              </div>
            ) : (
              <Select
                value={formData.emailAccountId || 'none'}
                onValueChange={(value) => handleChange('emailAccountId', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecciona una cuenta</SelectItem>
                  {emailAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {emailAccounts.length === 0 && (
              <p className="text-xs text-amber-600">
                Configura una cuenta de email en Configuración
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Zona horaria</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Límite diario</Label>
              <Input
                id="dailyLimit"
                type="number"
                min={1}
                max={500}
                value={formData.dailyLimit}
                onChange={(e) => handleChange('dailyLimit', parseInt(e.target.value) || 50)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
