'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  X,
  Mail,
  Linkedin,
  Instagram,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Loader2,
  Send,
  DollarSign,
  Calendar,
  Users,
  UserPlus,
  Play,
  MessageSquare,
  Bot,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EmailAccount {
  id: string
  name: string
  email: string
  type: string
  isActive: boolean
}

interface LinkedInAccount {
  id: string
  name: string
  profileUrl: string
  isActive: boolean
}

const platforms = [
  {
    value: 'EMAIL',
    label: 'Email',
    icon: Mail,
    color: 'text-muted-foreground',
    bgColor: 'bg-accent',
  },
  {
    value: 'LINKEDIN',
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  {
    value: 'INSTAGRAM',
    label: 'Instagram',
    icon: Instagram,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
  },
]

const channels = [
  {
    value: 'INBOUND',
    label: 'Inbound',
    description: 'Respond to prospects who discover and engage with your brand through incoming direct messages and comments in posts.',
    icon: ArrowDownLeft,
    color: 'text-emerald-400',
  },
  {
    value: 'OUTBOUND',
    label: 'Outbound',
    description: 'Proactively reach out to potential customers through direct contact, cold outreach, and targeted campaigns.',
    icon: ArrowUpRight,
    color: 'text-orange-400',
  },
]

const objectives = [
  {
    value: 'SALES',
    label: 'Sales',
    description: 'Drive direct sales conversations and close deals with prospects who are ready to make purchasing decisions.',
    icon: DollarSign,
    color: 'text-emerald-400',
  },
  {
    value: 'MEETINGS',
    label: 'Meetings',
    description: 'Focus on scheduling qualified meetings with decision makers to discuss your product or service in detail.',
    icon: Calendar,
    color: 'text-blue-400',
  },
  {
    value: 'NETWORKING',
    label: 'Networking',
    description: 'Build professional relationships and expand your network with industry peers and potential partners.',
    icon: Users,
    color: 'text-purple-400',
  },
  {
    value: 'RECRUITING',
    label: 'Recruiting',
    description: 'Reach out to potential candidates and talent for open positions in your organization.',
    icon: UserPlus,
    color: 'text-orange-400',
  },
]

const steps = [
  { number: 1, label: 'Basic Info' },
  { number: 2, label: 'Prompts' },
  { number: 3, label: 'Flow' },
  { number: 4, label: 'Accounts' },
]

// Flow templates based on platform
const getFlowTemplates = (platform: string, channel: string) => {
  if (platform === 'EMAIL') {
    return [
      {
        id: 'email_manual_confirmation',
        name: 'Email Outbound Manual Confirmation',
        description: 'Outbound Manual Confirmation',
        recommended: true,
        steps: [
          { number: 1, label: 'On Start Contact', icon: Play, color: 'bg-emerald-500' },
          { number: 2, label: 'Send Email', icon: Mail, color: 'bg-blue-500' },
          { number: 3, label: 'Follow-up Email', icon: Mail, color: 'bg-blue-500' },
          { number: 4, label: 'Final Follow-up', icon: Mail, color: 'bg-blue-500' },
        ],
      },
      {
        id: 'email_ai_sequence',
        name: 'Email AI Automated Sequence',
        description: 'AI-powered email sequence',
        recommended: false,
        steps: [
          { number: 1, label: 'On Start Contact', icon: Play, color: 'bg-emerald-500' },
          { number: 2, label: 'AI Generate Email', icon: Bot, color: 'bg-purple-500' },
          { number: 3, label: 'Send Email', icon: Mail, color: 'bg-blue-500' },
          { number: 4, label: 'AI Follow-up', icon: Bot, color: 'bg-purple-500' },
        ],
      },
    ]
  }

  if (platform === 'LINKEDIN') {
    return [
      {
        id: 'linkedin_manual_confirmation',
        name: 'LinkedIn Outbound Manual Confirmation',
        description: 'Outbound Manual Confirmation',
        recommended: true,
        steps: [
          { number: 1, label: 'On Start Contact', icon: Play, color: 'bg-emerald-500' },
          { number: 2, label: 'Send LinkedIn Invitation', icon: Linkedin, color: 'bg-blue-500' },
          { number: 3, label: 'Conversation Introduction', icon: MessageSquare, color: 'bg-indigo-500' },
          { number: 4, label: 'AI Conversation', icon: Bot, color: 'bg-purple-500' },
        ],
      },
      {
        id: 'linkedin_ai_until_prompt',
        name: 'LinkedIn Outbound AI Until Prompt',
        description: 'Outbound AI Until Prompt',
        recommended: false,
        steps: [
          { number: 1, label: 'On Start Contact', icon: Play, color: 'bg-emerald-500' },
          { number: 2, label: 'Send LinkedIn Invitation', icon: Linkedin, color: 'bg-blue-500' },
          { number: 3, label: 'Conversation Introduction', icon: MessageSquare, color: 'bg-indigo-500' },
          { number: 4, label: 'AI Conversation', icon: Bot, color: 'bg-purple-500' },
        ],
      },
    ]
  }

  // Instagram
  return [
    {
      id: 'instagram_outbound',
      name: 'Instagram Outbound Campaign',
      description: 'Instagram DM Outreach',
      recommended: true,
      steps: [
        { number: 1, label: 'On Start Contact', icon: Play, color: 'bg-emerald-500' },
        { number: 2, label: 'Send DM', icon: Instagram, color: 'bg-pink-500' },
        { number: 3, label: 'Follow-up DM', icon: MessageSquare, color: 'bg-indigo-500' },
        { number: 4, label: 'AI Response', icon: Bot, color: 'bg-purple-500' },
      ],
    },
  ]
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [creating, setCreating] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'EMAIL',
    channel: 'OUTBOUND',
    objective: 'SALES',
    // Prompts
    productDescription: '',
    instructions: '',
    qualificationCriteria: '',
    // Flow
    flowTemplate: 'manual_confirmation',
    // Account
    emailAccountId: '',
    linkedInAccountId: '',
  })

  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [linkedInAccounts, setLinkedInAccounts] = useState<LinkedInAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  // Load accounts when reaching step 4
  useEffect(() => {
    if (currentStep === 4) {
      loadAccounts()
    }
  }, [currentStep])

  const loadAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const [emailRes, linkedInRes] = await Promise.all([
        fetch('/api/settings/email-accounts'),
        fetch('/api/settings/linkedin-accounts'),
      ])

      if (emailRes.ok) {
        const data = await emailRes.json()
        setEmailAccounts(Array.isArray(data) ? data : [])
      }

      if (linkedInRes.ok) {
        const data = await linkedInRes.json()
        setLinkedInAccounts(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        toast.error('El nombre de la campaña es requerido')
        return
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = async () => {
    // Validate account selection
    if (formData.platform === 'EMAIL' && !formData.emailAccountId) {
      toast.error('Selecciona una cuenta de email')
      return
    }
    if (formData.platform === 'LINKEDIN' && !formData.linkedInAccountId) {
      toast.error('Selecciona una cuenta de LinkedIn')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          platform: formData.platform,
          channel: formData.channel,
          objective: formData.objective,
          emailAccountId: formData.platform === 'EMAIL' ? formData.emailAccountId : null,
          linkedInAccountId: formData.platform === 'LINKEDIN' ? formData.linkedInAccountId : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al crear campaña')
      }

      const campaign = await response.json()
      toast.success('Campaña creada exitosamente')
      router.push(`/campaigns/${campaign.id}`)
    } catch (error) {
      toast.error('Error al crear campaña')
    } finally {
      setCreating(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
              currentStep === step.number
                ? 'bg-primary text-primary-foreground'
                : currentStep > step.number
                ? 'bg-emerald-500 text-foreground'
                : 'bg-accent text-muted-foreground'
            )}
          >
            {currentStep > step.number ? (
              <Check className="h-4 w-4" />
            ) : (
              step.number
            )}
          </div>
          <span
            className={cn(
              'ml-2 text-sm',
              currentStep === step.number
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-12 h-px mx-4',
                currentStep > step.number
                  ? 'bg-emerald-500'
                  : 'bg-accent'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Basic Information</h2>
        <p className="text-muted-foreground text-sm">Enter the basic information for your campaign</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-secondary-foreground">Campaign Name</Label>
          <p className="text-xs text-muted-foreground">The name of the campaign.</p>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Test Theos"
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-secondary-foreground">Description (Optional)</Label>
          <p className="text-xs text-muted-foreground">Describe the campaign you are creating.</p>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Campaign to generate meetings with decision makers..."
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
          />
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="text-lg font-medium text-foreground mb-4">Configuration</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-secondary-foreground">Platform</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => setFormData({ ...formData, platform: value })}
              >
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {platforms.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      <div className="flex items-center gap-2">
                        <platform.icon className={cn('h-4 w-4', platform.color)} />
                        {platform.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-secondary-foreground">Acquisition channel</Label>
              <div className="space-y-3">
                {channels.map((channel) => {
                  const isSelected = formData.channel === channel.value
                  return (
                    <div
                      key={channel.value}
                      onClick={() => setFormData({ ...formData, channel: channel.value })}
                      className={cn(
                        'flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary/50 bg-secondary/50'
                          : 'border-border bg-card hover:border-border'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full',
                        isSelected ? 'bg-accent' : 'bg-secondary'
                      )}>
                        <channel.icon className={cn('h-5 w-5', channel.color)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{channel.label}</span>
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-border'
                            )}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-card" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {channel.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-secondary-foreground">Objective</Label>
              <div className="space-y-3">
                {objectives.map((objective) => {
                  const isSelected = formData.objective === objective.value
                  return (
                    <div
                      key={objective.value}
                      onClick={() => setFormData({ ...formData, objective: objective.value })}
                      className={cn(
                        'flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary/50 bg-secondary/50'
                          : 'border-border bg-card hover:border-border'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full',
                        isSelected ? 'bg-accent' : 'bg-secondary'
                      )}>
                        <objective.icon className={cn('h-5 w-5', objective.color)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{objective.label}</span>
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-border'
                            )}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-card" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {objective.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Campaign Prompts</h2>
        <p className="text-muted-foreground text-sm">Provide detailed information to help personalize your campaign</p>
      </div>

      <div className="space-y-6">
        {/* Product/Service Description */}
        <div className="space-y-2">
          <Label className="text-secondary-foreground text-base font-medium">Describe your product or service</Label>
          <p className="text-xs text-muted-foreground">Describe the product or service you are offering.</p>
          <div className="relative">
            <div className="absolute top-3 left-3 text-xs text-muted-foreground uppercase tracking-wider">PROMPT</div>
            <Textarea
              value={formData.productDescription}
              onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
              placeholder="We are a B2B SaaS company that helps businesses automate their sales process..."
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[100px] pt-8"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <Label className="text-secondary-foreground text-base font-medium">Instructions</Label>
          <p className="text-xs text-muted-foreground">Add a description of your business to help personalize messages</p>
          <div className="relative">
            <div className="absolute top-3 left-3 text-xs text-muted-foreground uppercase tracking-wider">PROMPT</div>
            <Textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Write friendly, dont be too salesy..."
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[100px] pt-8"
            />
          </div>
        </div>

        {/* Qualification Criteria */}
        <div className="space-y-2">
          <Label className="text-secondary-foreground text-base font-medium">Qualification criteria</Label>
          <p className="text-xs text-muted-foreground">Define the qualification criteria for the contact.</p>
          <div className="relative">
            <div className="absolute top-3 left-3 text-xs text-muted-foreground uppercase tracking-wider">PROMPT</div>
            <Textarea
              value={formData.qualificationCriteria}
              onChange={(e) => setFormData({ ...formData, qualificationCriteria: e.target.value })}
              placeholder="Business is in the B2B SaaS space, looking for a new CRM solution..."
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[100px] pt-8"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => {
    const flowTemplates = getFlowTemplates(formData.platform, formData.channel)
    const platformLabel = formData.platform === 'EMAIL' ? 'Email' : formData.platform === 'LINKEDIN' ? 'LinkedIn' : 'Instagram'
    const channelLabel = formData.channel === 'OUTBOUND' ? 'outbound' : 'inbound'

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">Select Flow Template</h2>
          <p className="text-muted-foreground text-sm">Choose a conversation flow template for your {platformLabel} {channelLabel} campaign</p>
        </div>

        {/* Tip box */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-secondary-foreground text-sm">
              <span className="font-medium">Tip:</span> You can fully customize the selected flow after creating the campaign.
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Each template provides a proven starting point that you can modify to match your specific needs.
            </p>
          </div>
        </div>

        {/* Flow templates */}
        <div className="space-y-4">
          {flowTemplates.map((template) => {
            const isSelected = formData.flowTemplate === template.id
            return (
              <div
                key={template.id}
                onClick={() => setFormData({ ...formData, flowTemplate: template.id })}
                className={cn(
                  'p-4 rounded-lg border-2 cursor-pointer transition-all',
                  isSelected
                    ? 'border-blue-500 bg-card'
                    : 'border-border bg-card hover:border-border'
                )}
              >
                <div className="flex gap-6">
                  {/* Steps visualization */}
                  <div className="flex-shrink-0 space-y-2">
                    {template.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm w-4">{step.number}</span>
                        <div className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                          step.color,
                          'bg-opacity-100'
                        )}>
                          <step.icon className="h-3.5 w-3.5 text-foreground" />
                          <span className="text-foreground text-xs font-medium">{step.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Template info */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <h3 className="text-foreground font-medium">{template.name}</h3>
                      {template.recommended && (
                        <span className="px-2 py-0.5 rounded text-xs bg-accent text-secondary-foreground">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">{template.description}</p>
                  </div>

                  {/* Radio button */}
                  <div className="flex items-center">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-border'
                      )}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Accounts</h2>
        <p className="text-muted-foreground text-sm">Select the account to use for this campaign</p>
      </div>

      {loadingAccounts ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {formData.platform === 'EMAIL' && (
            <>
              <Label className="text-secondary-foreground">Email Account</Label>
              {emailAccounts.length === 0 ? (
                <div className="p-6 rounded-lg border border-dashed border-border text-center">
                  <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No email accounts configured</p>
                  <Button
                    variant="outline"
                    className="mt-4 border-border"
                    onClick={() => router.push('/accounts')}
                  >
                    Configure Accounts
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {emailAccounts.map((account) => {
                    const isSelected = formData.emailAccountId === account.id
                    return (
                      <div
                        key={account.id}
                        onClick={() => setFormData({ ...formData, emailAccountId: account.id })}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-border bg-card hover:border-border'
                        )}
                      >
                        <div className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-full',
                          account.type === 'GMAIL' ? 'bg-red-500/20' : 'bg-accent'
                        )}>
                          <Mail className={cn(
                            'h-5 w-5',
                            account.type === 'GMAIL' ? 'text-red-400' : 'text-muted-foreground'
                          )} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.email}</p>
                        </div>
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-border'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-foreground" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {formData.platform === 'LINKEDIN' && (
            <>
              <Label className="text-secondary-foreground">LinkedIn Account</Label>
              {linkedInAccounts.length === 0 ? (
                <div className="p-6 rounded-lg border border-dashed border-border text-center">
                  <Linkedin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No LinkedIn accounts configured</p>
                  <Button
                    variant="outline"
                    className="mt-4 border-border"
                    onClick={() => router.push('/accounts')}
                  >
                    Configure Accounts
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedInAccounts.map((account) => {
                    const isSelected = formData.linkedInAccountId === account.id
                    return (
                      <div
                        key={account.id}
                        onClick={() => setFormData({ ...formData, linkedInAccountId: account.id })}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-border bg-card hover:border-border'
                        )}
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20">
                          <Linkedin className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.profileUrl}</p>
                        </div>
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-border'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-foreground" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {formData.platform === 'INSTAGRAM' && (
            <div className="p-6 rounded-lg border border-dashed border-border text-center">
              <Instagram className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Instagram integration coming soon</p>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary">
                <Send className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Create New Campaign</h1>
                <p className="text-sm text-muted-foreground">Create a new campaign to automate your outreach across different platforms.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/campaigns')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {renderStepIndicator()}

        <div className="bg-card rounded-lg border border-border p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="border-border text-secondary-foreground hover:bg-secondary disabled:opacity-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
