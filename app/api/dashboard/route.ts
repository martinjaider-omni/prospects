import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// GET /api/dashboard - Get dashboard data
export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)

    // Get basic counts
    const [totalContacts, totalCompanies, activeCampaigns] = await Promise.all([
      prisma.contact.count(),
      prisma.company.count(),
      prisma.campaign.count({ where: { status: 'ACTIVE' } }),
    ])

    // Get email stats
    const [emailsSentToday, emailsSentThisWeek] = await Promise.all([
      prisma.emailSent.count({ where: { sentAt: { gte: todayStart } } }),
      prisma.emailSent.count({ where: { sentAt: { gte: weekStart } } }),
    ])

    // Get engagement rates
    const recentEmails = await prisma.emailSent.findMany({
      where: { sentAt: { gte: weekStart } },
      select: {
        openedAt: true,
        clickedAt: true,
        repliedAt: true,
      },
    })

    const total = recentEmails.length || 1
    const opened = recentEmails.filter(e => e.openedAt).length
    const clicked = recentEmails.filter(e => e.clickedAt).length
    const replied = recentEmails.filter(e => e.repliedAt).length

    // Get recent campaigns
    const recentCampaigns = await prisma.campaign.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        totalSent: true,
        totalOpened: true,
      },
    })

    // Get recent activity (emails sent/opened/replied)
    const recentEmailsSent = await prisma.emailSent.findMany({
      take: 10,
      orderBy: { sentAt: 'desc' },
      include: {
        campaignContact: {
          include: {
            contact: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            campaign: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    const recentActivity = recentEmailsSent.map(email => {
      let type = 'sent'
      if (email.repliedAt) type = 'reply'
      else if (email.openedAt) type = 'open'

      return {
        id: email.id,
        type,
        contact: `${email.campaignContact.contact.firstName} ${email.campaignContact.contact.lastName}`,
        campaign: email.campaignContact.campaign?.name || 'Sin campaña',
        time: formatDistanceToNow(new Date(email.sentAt), { addSuffix: true, locale: es }),
      }
    })

    return NextResponse.json({
      totalContacts,
      totalCompanies,
      activeCampaigns,
      emailsSentToday,
      emailsSentThisWeek,
      openRate: (opened / total) * 100,
      clickRate: (clicked / total) * 100,
      replyRate: (replied / total) * 100,
      recentCampaigns,
      recentActivity,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    )
  }
}
