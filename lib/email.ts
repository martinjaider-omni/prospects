import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import prisma from './prisma'

interface SendEmailParams {
  to: string
  subject: string
  body: string
  html?: string
  accountId: string
  trackOpens?: boolean
  trackClicks?: boolean
  replyTo?: string
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using the configured email account
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, body, html, accountId, replyTo } = params

  // Get email account
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  })

  if (!account) {
    return { success: false, error: 'Email account not found' }
  }

  if (!account.isActive) {
    return { success: false, error: 'Email account is inactive' }
  }

  // Check daily limit
  if (account.sentToday >= account.dailyLimit) {
    return { success: false, error: 'Daily sending limit reached' }
  }

  try {
    let messageId: string | undefined

    if (account.type === 'GMAIL') {
      messageId = await sendWithGmail(account, to, subject, html || body, replyTo)
    } else if (account.type === 'SMTP') {
      messageId = await sendWithSMTP(account, to, subject, html || body, replyTo)
    } else {
      return { success: false, error: `Unsupported email account type: ${account.type}` }
    }

    // Update sent count
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { sentToday: { increment: 1 } },
    })

    return { success: true, messageId }
  } catch (error: any) {
    console.error('Email send error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send email using Gmail OAuth
 */
async function sendWithGmail(
  account: any,
  to: string,
  subject: string,
  body: string,
  replyTo?: string
): Promise<string> {
  if (!account.gmailAccessToken || !account.gmailRefreshToken) {
    throw new Error('Gmail OAuth tokens not configured')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token: account.gmailAccessToken,
    refresh_token: account.gmailRefreshToken,
  })

  // Check if token needs refresh
  if (account.gmailTokenExpiry && new Date(account.gmailTokenExpiry) < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()

    // Update tokens in database
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        gmailAccessToken: credentials.access_token,
        gmailRefreshToken: credentials.refresh_token || account.gmailRefreshToken,
        gmailTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    })

    oauth2Client.setCredentials(credentials)
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Build email content
  const emailContent = buildEmailContent({
    from: account.email,
    to,
    subject,
    body,
    replyTo,
    signature: account.signature,
  })

  // Encode email
  const encodedEmail = Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  // Send email
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  })

  return response.data.id || ''
}

/**
 * Send email using SMTP
 */
async function sendWithSMTP(
  account: any,
  to: string,
  subject: string,
  body: string,
  replyTo?: string
): Promise<string> {
  if (!account.smtpHost || !account.smtpPort) {
    throw new Error('SMTP configuration incomplete')
  }

  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    auth: {
      user: account.smtpUser,
      pass: account.smtpPass,
    },
  })

  // Add signature if exists
  let fullBody = body
  if (account.signature) {
    fullBody += `\n\n${account.signature}`
  }

  const mailOptions: any = {
    from: `"${account.name}" <${account.email}>`,
    to,
    subject,
    html: fullBody,
    text: stripHtml(fullBody),
  }

  if (replyTo) {
    mailOptions.replyTo = replyTo
  }

  const result = await transporter.sendMail(mailOptions)

  return result.messageId || ''
}

/**
 * Build raw email content for Gmail API
 */
function buildEmailContent(params: {
  from: string
  to: string
  subject: string
  body: string
  replyTo?: string
  signature?: string | null
}): string {
  const { from, to, subject, body, replyTo, signature } = params

  let fullBody = body
  if (signature) {
    fullBody += `<br><br>${signature}`
  }

  const boundary = `boundary_${Date.now()}`

  let email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]

  if (replyTo) {
    email.push(`Reply-To: ${replyTo}`)
  }

  email.push('', `--${boundary}`)
  email.push('Content-Type: text/plain; charset="UTF-8"')
  email.push('Content-Transfer-Encoding: 7bit')
  email.push('', stripHtml(fullBody))

  email.push(`--${boundary}`)
  email.push('Content-Type: text/html; charset="UTF-8"')
  email.push('Content-Transfer-Encoding: 7bit')
  email.push('', fullBody)

  email.push(`--${boundary}--`)

  return email.join('\r\n')
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

/**
 * Reset daily sending counters (call this at midnight)
 */
export async function resetDailyCounts(): Promise<void> {
  await prisma.emailAccount.updateMany({
    data: { sentToday: 0 },
  })
}
