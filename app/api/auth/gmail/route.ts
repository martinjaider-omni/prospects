import { NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/gmail-oauth'

// GET /api/auth/gmail - Start OAuth flow
export async function GET() {
  try {
    const authUrl = getAuthorizationUrl()
    return NextResponse.json({ url: authUrl })
  } catch (error: any) {
    console.error('Gmail OAuth error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al iniciar autenticacion con Gmail' },
      { status: 500 }
    )
  }
}
