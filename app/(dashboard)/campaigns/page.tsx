'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Plus,
  Send,
  MoreHorizontal,
  Linkedin,
  Mail,
  Instagram,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Target,
  Loader2,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Campaign {
  id: string
  name: string
  description: string | null
  status: string
  platform: string
  objective: string
  channel: string
  isDefault: boolean
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  createdAt: string
  _count: {
    contacts: number
  }
}

const platformConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  EMAIL: { icon: Mail, label: 'Email', color: 'text-muted-foreground' },
  LINKEDIN: { icon: Linkedin, label: 'LinkedIn', color: 'text-[#0A66C2]' },
  INSTAGRAM: { icon: Instagram, label: 'Instagram', color: 'text-pink-500' },
}

const objectiveConfig: Record<string, { icon: React.ElementType; label: string }> = {
  SALES: { icon: Target, label: 'Sales' },
  MEETINGS: { icon: Users, label: 'Meetings' },
  NETWORKING: { icon: Users, label: 'Networking' },
  RECRUITING: { icon: Users, label: 'Recruiting' },
}

const channelConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  INBOUND: { icon: ArrowDownLeft, label: 'Inbound', color: 'text-emerald-400' },
  OUTBOUND: { icon: ArrowUpRight, label: 'Outbound', color: 'text-orange-400' },
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/campaigns')
      const data = await response.json()
      setCampaigns(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Error al cargar campanas')
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const handleToggleActive = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Error')

      toast.success(`Campana ${newStatus === 'ACTIVE' ? 'activada' : 'pausada'}`)
      fetchCampaigns()
    } catch (error) {
      toast.error('Error al actualizar estado')
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('¿Eliminar esta campana?')) return

    try {
      const response = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error')
      toast.success('Campana eliminada')
      fetchCampaigns()
    } catch (error) {
      toast.error('Error al eliminar campana')
    }
  }

  const totalPages = Math.ceil(campaigns.length / rowsPerPage)
  const paginatedCampaigns = campaigns.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  return (
    <div className="flex flex-col h-full bg-background">
      <Header
        title="Campaigns"
        subtitle="Manage your campaigns"
        actions={
          <Button
            onClick={() => router.push('/campaigns/new')}
            className="bg-secondary hover:bg-accent border border-border"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        }
      />

      <div className="flex-1 p-6">
        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-accent/50">
                <TableHead className="text-muted-foreground w-20">Active</TableHead>
                <TableHead className="text-muted-foreground">Campaign Name</TableHead>
                <TableHead className="text-muted-foreground">Platform</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Created</TableHead>
                <TableHead className="text-muted-foreground">Objective</TableHead>
                <TableHead className="text-muted-foreground">Channel</TableHead>
                <TableHead className="text-muted-foreground w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : paginatedCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No campaigns yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create your first campaign to get started
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCampaigns.map((campaign) => {
                  const platform = platformConfig[campaign.platform] || platformConfig.EMAIL
                  const objective = objectiveConfig[campaign.objective] || objectiveConfig.SALES
                  const channel = channelConfig[campaign.channel] || channelConfig.OUTBOUND
                  const PlatformIcon = platform.icon
                  const ObjectiveIcon = objective.icon
                  const ChannelIcon = channel.icon

                  return (
                    <TableRow
                      key={campaign.id}
                      className="border-border hover:bg-accent/50"
                    >
                      {/* Active Toggle */}
                      <TableCell>
                        <Switch
                          checked={campaign.status === 'ACTIVE'}
                          onCheckedChange={() => handleToggleActive(campaign)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </TableCell>

                      {/* Campaign Name */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-medium">
                            {campaign.name}
                          </span>
                          {campaign.isDefault && (
                            <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
                              DEFAULT
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Platform */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PlatformIcon className={`h-4 w-4 ${platform.color}`} />
                          <span className="text-secondary-foreground">{platform.label}</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            campaign.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : campaign.status === 'PAUSED'
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              : campaign.status === 'DRAFT'
                              ? 'bg-muted/50 text-muted-foreground border-border'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }
                        >
                          {campaign.status === 'ACTIVE' ? 'running' : campaign.status.toLowerCase()}
                        </Badge>
                      </TableCell>

                      {/* Created */}
                      <TableCell className="text-muted-foreground">
                        {format(new Date(campaign.createdAt), 'MMM d, yyyy', { locale: es })}
                      </TableCell>

                      {/* Objective */}
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ObjectiveIcon className="h-4 w-4" />
                          <span>{objective.label}</span>
                        </div>
                      </TableCell>

                      {/* Channel */}
                      <TableCell>
                        <div className={`flex items-center gap-2 ${channel.color}`}>
                          <ChannelIcon className="h-4 w-4" />
                          <span>{channel.label}</span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem
                              className="text-foreground focus:bg-accent focus:text-accent-foreground"
                              onClick={() => router.push(`/campaigns/${campaign.id}`)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => handleDeleteCampaign(campaign.id)}
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

        {/* Pagination */}
        {campaigns.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <div>
              {selectedRows.size} of {campaigns.length} row(s) selected.
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
                  <SelectTrigger className="w-16 h-8 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span>Page {currentPage} of {totalPages || 1}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-secondary border-border"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  {'<<'}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-secondary border-border"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {'<'}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-secondary border-border"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {'>'}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-secondary border-border"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  {'>>'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
