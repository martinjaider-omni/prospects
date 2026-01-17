import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode, getUserInfo, saveGmailAccount } from '@/lib/gmail-oauth'

// GET /api/auth/gmail/callback - OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (error) {
      console.error('Gmail OAuth error:', error)
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent('Autorizacion cancelada o denegada')}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent('Codigo de autorizacion no recibido')}`
      )
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent('No se pudo obtener token de acceso')}`
      )
    }

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token)

    if (!userInfo.email) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent('No se pudo obtener email del usuario')}`
      )
    }

    // Calculate token expiration
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000) // Default 1 hour

    // Save account to database
    await saveGmailAccount(
      userInfo.email,
      userInfo.name || userInfo.email,
      tokens.access_token,
      tokens.refresh_token || '',
      expiresAt
    )

    // Redirect to accounts with success message
    return NextResponse.redirect(
      `${baseUrl}/settings?success=${encodeURIComponent(`Cuenta de Gmail ${userInfo.email} conectada exitosamente`)}`
    )
  } catch (error: any) {
    console.error('Gmail OAuth callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent(error.message || 'Error al conectar cuenta de Gmail')}`
    )
  }
}
