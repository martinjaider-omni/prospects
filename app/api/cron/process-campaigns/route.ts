import { NextRequest, NextResponse } from 'next/server'
import { campaignEngine } from '@/lib/campaign-engine'

// This endpoint should be called by a cron job (e.g., Vercel Cron, external service)
// Suggested frequency: every 5-15 minutes

// GET /api/cron/process-campaigns - Process all scheduled campaign actions
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting campaign processing...')

    const result = await campaignEngine.processAllScheduled()

    console.log(`[Cron] Processed ${result.processed} contacts, ${result.errors} errors`)

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Cron] Campaign processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Error processing campaigns' },
      { status: 500 }
    )
  }
}

// POST also supported for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
