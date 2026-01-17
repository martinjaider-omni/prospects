import prisma from './prisma'

interface AIConfig {
  provider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE'
  apiKey: string
  model: string
}

interface GenerateEmailParams {
  contactFirstName?: string
  contactLastName?: string
  contactJobTitle?: string
  companyName?: string
  companyIndustry?: string
  purpose: string
  tone?: 'formal' | 'casual' | 'friendly' | 'professional'
  previousMessages?: { direction: 'inbound' | 'outbound'; body: string }[]
  customInstructions?: string
  isFollowUp?: boolean
  stepNumber?: number
}

async function getAIConfig(): Promise<AIConfig | null> {
  const config = await prisma.aIConfig.findFirst({
    where: { isActive: true },
  })

  if (!config) return null

  return {
    provider: config.provider as AIConfig['provider'],
    apiKey: config.apiKey,
    model: config.model,
  }
}

export async function generateEmail(params: GenerateEmailParams): Promise<{ body: string } | { error: string }> {
  const config = await getAIConfig()

  if (!config) {
    return { error: 'No hay configuración de IA activa. Ve a Configuración para añadir tu API key.' }
  }

  const systemPrompt = `Eres un experto en redacción de emails de ventas B2B y prospección outbound.
Tu objetivo es escribir emails personalizados, concisos y efectivos que generen respuestas.

Reglas importantes:
- Escribe en español a menos que se indique lo contrario
- Mantén el email corto (máximo 150 palabras)
- Usa un tono ${params.tone || 'profesional'} pero cercano
- No uses frases genéricas como "Espero que este email te encuentre bien"
- Ve directo al punto de valor
- Incluye una llamada a la acción clara y simple
- Personaliza usando los datos disponibles del contacto
- NO incluyas el asunto, solo el cuerpo del email
- Usa las variables {{firstName}}, {{lastName}}, {{company}}, {{jobTitle}} donde corresponda para personalización`

  const userPrompt = buildUserPrompt(params)

  try {
    let response: string

    switch (config.provider) {
      case 'OPENAI':
        response = await callOpenAI(config.apiKey, config.model, systemPrompt, userPrompt)
        break
      case 'ANTHROPIC':
        response = await callAnthropic(config.apiKey, config.model, systemPrompt, userPrompt)
        break
      case 'GOOGLE':
        response = await callGoogle(config.apiKey, config.model, systemPrompt, userPrompt)
        break
      default:
        return { error: 'Proveedor de IA no soportado' }
    }

    return { body: response }
  } catch (error: any) {
    console.error('AI generation error:', error)
    return { error: error.message || 'Error al generar email con IA' }
  }
}

function buildUserPrompt(params: GenerateEmailParams): string {
  let prompt = ''

  if (params.isFollowUp) {
    prompt += `Este es un email de SEGUIMIENTO (paso ${params.stepNumber || 2} de la secuencia).\n`
    prompt += 'Debe ser más breve que el email inicial y hacer referencia al contacto previo.\n\n'
  } else {
    prompt += 'Este es el email INICIAL de la secuencia de prospección.\n\n'
  }

  prompt += `Propósito del email: ${params.purpose}\n`

  if (params.contactFirstName) prompt += `Nombre del contacto: ${params.contactFirstName}\n`
  if (params.contactLastName) prompt += `Apellido: ${params.contactLastName}\n`
  if (params.contactJobTitle) prompt += `Cargo: ${params.contactJobTitle}\n`
  if (params.companyName) prompt += `Empresa: ${params.companyName}\n`
  if (params.companyIndustry) prompt += `Industria: ${params.companyIndustry}\n`

  if (params.previousMessages && params.previousMessages.length > 0) {
    prompt += '\nHistorial de conversación:\n'
    params.previousMessages.forEach((msg, i) => {
      prompt += `${msg.direction === 'outbound' ? 'Yo' : 'Contacto'}: ${msg.body.substring(0, 200)}...\n`
    })
  }

  if (params.customInstructions) {
    prompt += `\nInstrucciones adicionales: ${params.customInstructions}\n`
  }

  prompt += '\nGenera el cuerpo del email:'

  return prompt
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callAnthropic(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

async function callGoogle(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const modelName = model || 'gemini-1.5-flash'
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Google AI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function generateReplysuggestion(
  inboundMessage: string,
  context: {
    contactName: string
    campaignPurpose: string
    previousMessages: { direction: string; body: string }[]
  }
): Promise<{ suggestion: string } | { error: string }> {
  const config = await getAIConfig()

  if (!config) {
    return { error: 'No hay configuración de IA activa' }
  }

  const systemPrompt = `Eres un asistente de ventas B2B. Analiza el mensaje entrante y sugiere una respuesta apropiada.
La respuesta debe:
- Ser concisa y directa
- Mantener el tono profesional
- Avanzar la conversación hacia el objetivo de la campaña
- Responder a cualquier pregunta o objeción del contacto`

  const userPrompt = `Contacto: ${context.contactName}
Objetivo de la campaña: ${context.campaignPurpose}

Mensaje recibido:
${inboundMessage}

Historial previo:
${context.previousMessages.map(m => `${m.direction === 'outbound' ? 'Yo' : 'Contacto'}: ${m.body}`).join('\n')}

Sugiere una respuesta:`

  try {
    let response: string

    switch (config.provider) {
      case 'OPENAI':
        response = await callOpenAI(config.apiKey, config.model, systemPrompt, userPrompt)
        break
      case 'ANTHROPIC':
        response = await callAnthropic(config.apiKey, config.model, systemPrompt, userPrompt)
        break
      case 'GOOGLE':
        response = await callGoogle(config.apiKey, config.model, systemPrompt, userPrompt)
        break
      default:
        return { error: 'Proveedor no soportado' }
    }

    return { suggestion: response }
  } catch (error: any) {
    return { error: error.message || 'Error al generar sugerencia' }
  }
}
