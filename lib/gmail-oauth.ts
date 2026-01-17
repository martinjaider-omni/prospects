import { google } from 'googleapis'
import prisma from './prisma'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

// Get OAuth2 client
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

// Generate authorization URL
export function getAuthorizationUrl(state?: string) {
  const oauth2Client = getOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
    state: state || '',
  })
}

// Exchange code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

// Get user info from tokens
export async function getUserInfo(accessToken: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()

  return {
    email: data.email || '',
    name: data.name || '',
    picture: data.picture || '',
  }
}

// Save Gmail account to database
export async function saveGmailAccount(
  email: string,
  name: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
) {
  // Check if account already exists
  const existing = await prisma.emailAccount.findFirst({
    where: { email },
  })

  if (existing) {
    // Update existing account
    return await prisma.emailAccount.update({
      where: { id: existing.id },
      data: {
        name,
        type: 'GMAIL',
        gmailAccessToken: accessToken,
        gmailRefreshToken: refreshToken,
        gmailTokenExpiry: expiresAt,
        isActive: true,
        isVerified: true,
      },
    })
  }

  // Create new account
  return await prisma.emailAccount.create({
    data: {
      email,
      name,
      type: 'GMAIL',
      gmailAccessToken: accessToken,
      gmailRefreshToken: refreshToken,
      gmailTokenExpiry: expiresAt,
      isActive: true,
      isVerified: true,
    },
  })
}

// Get Gmail client with valid access token
export async function getGmailClient(accountId: string) {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  })

  if (!account) {
    throw new Error('Email account not found')
  }

  if (account.type !== 'GMAIL') {
    throw new Error('Account is not a Gmail account')
  }

  const oauth2Client = getOAuth2Client()

  // Check if token is expired
  const now = new Date()
  const tokenExpired = account.gmailTokenExpiry && account.gmailTokenExpiry < now

  if (tokenExpired && account.gmailRefreshToken) {
    // Refresh the token
    oauth2Client.setCredentials({
      refresh_token: account.gmailRefreshToken,
    })

    const { credentials } = await oauth2Client.refreshAccessToken()

    // Update token in database
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        gmailAccessToken: credentials.access_token,
        gmailTokenExpiry: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
      },
    })

    oauth2Client.setCredentials(credentials)
  } else {
    oauth2Client.setCredentials({
      access_token: account.gmailAccessToken,
      refresh_token: account.gmailRefreshToken,
    })
  }

  return google.gmail({ version: 'v1', auth: oauth2Client })
}

// Send email via Gmail API
export async function sendGmailEmail(
  accountId: string,
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string
) {
  const gmail = await getGmailClient(accountId)
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  })

  if (!account) {
    throw new Error('Email account not found')
  }

  // Create email message
  const messageParts = [
    `From: ${account.name} <${account.email}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="boundary"',
    '',
    '--boundary',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    textBody || htmlBody.replace(/<[^>]*>/g, ''),
    '',
    '--boundary',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    htmlBody,
    '',
    '--boundary--',
  ]

  const message = messageParts.join('\n')
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  })

  return {
    messageId: result.data.id,
    threadId: result.data.threadId,
  }
}

// Get Gmail messages (for inbox sync)
export async function getGmailMessages(
  accountId: string,
  options: {
    maxResults?: number
    query?: string
    pageToken?: string
  } = {}
) {
  const gmail = await getGmailClient(accountId)

  const { maxResults = 20, query, pageToken } = options

  const listResult = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: query,
    pageToken,
  })

  if (!listResult.data.messages) {
    return { messages: [], nextPageToken: null }
  }

  // Get full message details
  const messages = await Promise.all(
    listResult.data.messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      })

      const headers = fullMessage.data.payload?.headers || []
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

      return {
        id: fullMessage.data.id,
        threadId: fullMessage.data.threadId,
        from: getHeader('from'),
        to: getHeader('to'),
        subject: getHeader('subject'),
        date: getHeader('date'),
        snippet: fullMessage.data.snippet,
        labelIds: fullMessage.data.labelIds,
      }
    })
  )

  return {
    messages,
    nextPageToken: listResult.data.nextPageToken || null,
  }
}
