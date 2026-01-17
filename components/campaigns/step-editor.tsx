'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  GripVertical,
  Mail,
  Linkedin,
  Sparkles,
  Clock,
} from 'lucide-react'

export interface CampaignStep {
  id?: string
  order: number
  type: 'EMAIL' | 'LINKEDIN_CONNECTION' | 'LINKEDIN_MESSAGE' | 'MANUAL_TASK'
  subject: string
  body: string
  delayDays: number
  sendOnlyIfNoReply: boolean
  sendOnlyIfNoOpen: boolean
}

interface StepEditorProps {
  steps: CampaignStep[]
  onChange: (steps: CampaignStep[]) => void
  onGenerateWithAI?: (stepIndex: number, context: string) => Promise<string>
}

const STEP_TYPES = [
  { value: 'EMAIL', label: 'Email', icon: Mail },
  { value: 'LINKEDIN_CONNECTION', label: 'Conexión LinkedIn', icon: Linkedin },
  { value: 'LINKEDIN_MESSAGE', label: 'Mensaje LinkedIn', icon: Linkedin },
]

const VARIABLES = [
  { value: '{{firstName}}', label: 'Nombre' },
  { value: '{{lastName}}', label: 'Apellido' },
  { value: '{{fullName}}', label: 'Nombre completo' },
  { value: '{{email}}', label: 'Email' },
  { value: '{{company}}', label: 'Empresa' },
  { value: '{{jobTitle}}', label: 'Cargo' },
]

export function StepEditor({ steps, onChange, onGenerateWithAI }: StepEditorProps) {
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null)

  const addStep = () => {
    const newStep: CampaignStep = {
      order: steps.length + 1,
      type: 'EMAIL',
      subject: '',
      body: '',
      delayDays: steps.length === 0 ? 0 : 3,
      sendOnlyIfNoReply: true,
      sendOnlyIfNoOpen: false,
    }
    onChange([...steps, newStep])
  }

  const updateStep = (index: number, updates: Partial<CampaignStep>) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    onChange(newSteps)
  }

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    // Update order numbers
    newSteps.forEach((step, i) => {
      step.order = i + 1
    })
    onChange(newSteps)
  }

  const insertVariable = (index: number, variable: string, field: 'subject' | 'body') => {
    const step = steps[index]
    const currentValue = step[field]
    updateStep(index, { [field]: currentValue + variable })
  }

  const handleGenerateWithAI = async (index: number) => {
    if (!onGenerateWithAI) return

    setGeneratingIndex(index)
    try {
      const context = `Step ${index + 1} of ${steps.length}. ${index === 0 ? 'Initial outreach email.' : 'Follow-up email.'}`
      const generatedBody = await onGenerateWithAI(index, context)
      updateStep(index, { body: generatedBody })
    } finally {
      setGeneratingIndex(null)
    }
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const StepIcon = STEP_TYPES.find(t => t.value === step.type)?.icon || Mail

        return (
          <Card key={index} className="relative">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                  <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
                </div>
                <div>
                  <CardTitle className="text-base">
                    {step.type === 'EMAIL' ? 'Email' : 'LinkedIn'}
                  </CardTitle>
                  {index > 0 && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {step.delayDays} días después del paso anterior
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600"
                onClick={() => removeStep(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de paso</Label>
                  <Select
                    value={step.type}
                    onValueChange={(value: any) => updateStep(index, { type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STEP_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {index > 0 && (
                  <div className="space-y-2">
                    <Label>Esperar (días)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={step.delayDays}
                      onChange={(e) => updateStep(index, { delayDays: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              {step.type === 'EMAIL' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Asunto</Label>
                      <div className="flex gap-1">
                        {VARIABLES.slice(0, 3).map((v) => (
                          <Button
                            key={v.value}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => insertVariable(index, v.value, 'subject')}
                          >
                            {v.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Input
                      value={step.subject}
                      onChange={(e) => updateStep(index, { subject: e.target.value })}
                      placeholder="Asunto del email..."
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Contenido</Label>
                      <div className="flex gap-1">
                        {onGenerateWithAI && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7"
                            onClick={() => handleGenerateWithAI(index)}
                            disabled={generatingIndex === index}
                          >
                            <Sparkles className="mr-1 h-3 w-3" />
                            {generatingIndex === index ? 'Generando...' : 'Generar con IA'}
                          </Button>
                        )}
                        <Select onValueChange={(v) => insertVariable(index, v, 'body')}>
                          <SelectTrigger className="h-7 w-[120px]">
                            <SelectValue placeholder="Variables" />
                          </SelectTrigger>
                          <SelectContent>
                            {VARIABLES.map((v) => (
                              <SelectItem key={v.value} value={v.value}>
                                {v.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Textarea
                      value={step.body}
                      onChange={(e) => updateStep(index, { body: e.target.value })}
                      placeholder="Escribe el contenido del email..."
                      rows={6}
                    />
                  </div>
                </>
              )}

              {(step.type === 'LINKEDIN_CONNECTION' || step.type === 'LINKEDIN_MESSAGE') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Mensaje</Label>
                    <Select onValueChange={(v) => insertVariable(index, v, 'body')}>
                      <SelectTrigger className="h-7 w-[120px]">
                        <SelectValue placeholder="Variables" />
                      </SelectTrigger>
                      <SelectContent>
                        {VARIABLES.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={step.body}
                    onChange={(e) => updateStep(index, { body: e.target.value })}
                    placeholder={step.type === 'LINKEDIN_CONNECTION' ? 'Nota de conexión (opcional, max 300 caracteres)...' : 'Mensaje de LinkedIn...'}
                    rows={4}
                    maxLength={step.type === 'LINKEDIN_CONNECTION' ? 300 : undefined}
                  />
                </div>
              )}

              {/* Conditions */}
              {index > 0 && step.type === 'EMAIL' && (
                <div className="flex flex-wrap gap-6 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={step.sendOnlyIfNoReply}
                      onCheckedChange={(checked) => updateStep(index, { sendOnlyIfNoReply: checked })}
                    />
                    <Label className="text-sm font-normal">Solo si no ha respondido</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={step.sendOnlyIfNoOpen}
                      onCheckedChange={(checked) => updateStep(index, { sendOnlyIfNoOpen: checked })}
                    />
                    <Label className="text-sm font-normal">Solo si no ha abierto</Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <Button type="button" variant="outline" className="w-full" onClick={addStep}>
        <Plus className="mr-2 h-4 w-4" />
        Añadir paso
      </Button>
    </div>
  )
}
