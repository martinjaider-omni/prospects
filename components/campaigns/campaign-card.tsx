'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Play,
  Pause,
  Pencil,
  Trash2,
  Users,
  Mail,
  MousePointerClick,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'

interface CampaignStep {
  id: string
  order: number
  type: string
  subject: string | null
  body: string
  delayDays: number
}

interface Campaign {
  id: string
  name: string
  description: string | null
  status: string
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  steps: CampaignStep[]
  _count: {
    contacts: number
  }
}

interface CampaignCardProps {
  campaign: Campaign
  onStatusChange?: (id: string, status: string) => void
  onDelete?: (id: string) => void
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Borrador', className: 'bg-slate-100 text-slate-700' },
  ACTIVE: { label: 'Activa', className: 'bg-green-100 text-green-700' },
  PAUSED: { label: 'Pausada', className: 'bg-yellow-100 text-yellow-700' },
  COMPLETED: { label: 'Completada', className: 'bg-blue-100 text-blue-700' },
  ARCHIVED: { label: 'Archivada', className: 'bg-gray-100 text-gray-700' },
}

export function CampaignCard({ campaign, onStatusChange, onDelete }: CampaignCardProps) {
  const status = statusConfig[campaign.status] || statusConfig.DRAFT

  const openRate = campaign.totalSent > 0
    ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1)
    : '0'

  const clickRate = campaign.totalOpened > 0
    ? ((campaign.totalClicked / campaign.totalOpened) * 100).toFixed(1)
    : '0'

  const replyRate = campaign.totalSent > 0
    ? ((campaign.totalReplied / campaign.totalSent) * 100).toFixed(1)
    : '0'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <Link href={`/campaigns/${campaign.id}`}>
            <CardTitle className="text-lg hover:text-indigo-600 transition-colors">
              {campaign.name}
            </CardTitle>
          </Link>
          {campaign.description && (
            <p className="text-sm text-slate-500 line-clamp-1">
              {campaign.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={status.className}>
            {status.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/campaigns/${campaign.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              {campaign.status === 'DRAFT' || campaign.status === 'PAUSED' ? (
                <DropdownMenuItem onClick={() => onStatusChange?.(campaign.id, 'ACTIVE')}>
                  <Play className="mr-2 h-4 w-4" />
                  Activar
                </DropdownMenuItem>
              ) : campaign.status === 'ACTIVE' ? (
                <DropdownMenuItem onClick={() => onStatusChange?.(campaign.id, 'PAUSED')}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete?.(campaign.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{campaign._count.contacts} contactos</span>
          </div>
          <div className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <span>{campaign.steps.length} pasos</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-slate-50 rounded">
            <div className="text-lg font-semibold">{campaign.totalSent}</div>
            <div className="text-xs text-slate-500">Enviados</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-lg font-semibold text-blue-600">{openRate}%</div>
            <div className="text-xs text-slate-500">Apertura</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-lg font-semibold text-green-600">{clickRate}%</div>
            <div className="text-xs text-slate-500">Clicks</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <div className="text-lg font-semibold text-purple-600">{replyRate}%</div>
            <div className="text-xs text-slate-500">Respuesta</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
