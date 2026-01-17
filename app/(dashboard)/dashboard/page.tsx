'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/shared/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Building2,
  Send,
  Mail,
  MousePointerClick,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Settings,
  Search,
} from 'lucide-react'

interface DashboardData {
  totalContacts: number
  totalCompanies: number
  activeCampaigns: number
  emailsSentToday: number
  emailsSentThisWeek: number
  openRate: number
  clickRate: number
  replyRate: number
  recentCampaigns: {
    id: string
    name: string
    status: string
    totalSent: number
    totalOpened: number
  }[]
  recentActivity: {
    id: string
    type: string
    contact: string
    campaign: string
    time: string
  }[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard')
      const result = await response.json()
      setData(result.error ? null : result)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const stats = [
    {
      name: 'Total Contactos',
      value: data?.totalContacts || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      href: '/contacts',
    },
    {
      name: 'Empresas',
      value: data?.totalCompanies || 0,
      icon: Building2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      href: '/contacts',
    },
    {
      name: 'Campañas Activas',
      value: data?.activeCampaigns || 0,
      icon: Send,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      href: '/campaigns',
    },
    {
      name: 'Emails Hoy',
      value: data?.emailsSentToday || 0,
      icon: Mail,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      href: '/reports',
    },
  ]

  const performanceStats = [
    {
      name: 'Tasa de Apertura',
      value: `${data?.openRate?.toFixed(1) || 0}%`,
      description: 'Promedio general',
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Tasa de Clicks',
      value: `${data?.clickRate?.toFixed(1) || 0}%`,
      description: 'En enlaces',
      icon: MousePointerClick,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Tasa de Respuesta',
      value: `${data?.replyRate?.toFixed(1) || 0}%`,
      description: 'De contactos',
      icon: MessageSquare,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Dashboard"
        subtitle="Resumen de tu actividad de prospección"
        actions={
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.name} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.name}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value.toLocaleString()}</p>
                    </div>
                    <div className={`rounded-full p-3 ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Performance Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {performanceStats.map((stat) => (
            <Card key={stat.name}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-full p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Campaigns & Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Campaigns */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Campañas Recientes</CardTitle>
              <Link href="/campaigns">
                <Button variant="ghost" size="sm">
                  Ver todas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!data?.recentCampaigns || data.recentCampaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Send className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No hay campañas creadas</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crea tu primera campaña para empezar
                  </p>
                  <Link href="/campaigns">
                    <Button size="sm" className="mt-3">
                      Crear campaña
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentCampaigns.map((campaign) => (
                    <Link
                      key={campaign.id}
                      href={`/campaigns/${campaign.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.totalSent} enviados, {campaign.totalOpened} abiertos
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          campaign.status === 'ACTIVE'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : campaign.status === 'PAUSED'
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {campaign.status === 'ACTIVE'
                          ? 'Activa'
                          : campaign.status === 'PAUSED'
                          ? 'Pausada'
                          : campaign.status === 'COMPLETED'
                          ? 'Completada'
                          : 'Borrador'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Actividad Reciente</CardTitle>
              <Link href="/inbox">
                <Button variant="ghost" size="sm">
                  Ver inbox
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!data?.recentActivity || data.recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Mail className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Sin actividad reciente</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Los emails enviados y respuestas aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted"
                    >
                      <div
                        className={`rounded-full p-2 ${
                          activity.type === 'reply'
                            ? 'bg-green-500/10'
                            : activity.type === 'open'
                            ? 'bg-blue-500/10'
                            : 'bg-muted-foreground/10'
                        }`}
                      >
                        {activity.type === 'reply' ? (
                          <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : activity.type === 'open' ? (
                          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Send className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.contact}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.campaign}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                href="/contacts"
                icon={Users}
                title="Añadir Contacto"
                description="Importa o añade contactos manualmente"
              />
              <QuickAction
                href="/contacts/search"
                icon={Search}
                title="Buscar en Apollo"
                description="Encuentra contactos por empresa"
              />
              <QuickAction
                href="/campaigns"
                icon={Send}
                title="Crear Campaña"
                description="Inicia una nueva secuencia de emails"
              />
              <QuickAction
                href="/settings"
                icon={Settings}
                title="Configurar Email"
                description="Conecta tu cuenta de email"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
    >
      <div className="rounded-full bg-primary/10 p-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}
