'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'

const CONTACT_FIELDS = [
  { value: 'firstName', label: 'Nombre' },
  { value: 'lastName', label: 'Apellido' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'linkedinUrl', label: 'LinkedIn URL' },
  { value: 'jobTitle', label: 'Cargo' },
  { value: 'companyName', label: 'Empresa' },
  { value: 'location', label: 'Ubicación' },
  { value: 'notes', label: 'Notas' },
  { value: 'skip', label: '-- Ignorar --' },
]

interface CSVImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: Record<string, string>[]) => Promise<{ success: number; errors: number }>
}

type ImportStep = 'upload' | 'mapping' | 'importing' | 'complete'

export function CSVImport({ open, onOpenChange, onImport }: CSVImportProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState({ success: 0, errors: 0 })

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      complete: (result) => {
        const data = result.data as string[][]
        if (data.length > 0) {
          setHeaders(data[0])
          setCsvData(data.slice(1).filter(row => row.some(cell => cell.trim())))

          // Auto-detect mapping
          const autoMapping: Record<string, string> = {}
          data[0].forEach((header) => {
            const headerLower = header.toLowerCase().trim()
            if (headerLower.includes('first') || headerLower === 'nombre') {
              autoMapping[header] = 'firstName'
            } else if (headerLower.includes('last') || headerLower === 'apellido') {
              autoMapping[header] = 'lastName'
            } else if (headerLower.includes('email') || headerLower.includes('correo')) {
              autoMapping[header] = 'email'
            } else if (headerLower.includes('phone') || headerLower.includes('tel')) {
              autoMapping[header] = 'phone'
            } else if (headerLower.includes('linkedin')) {
              autoMapping[header] = 'linkedinUrl'
            } else if (headerLower.includes('title') || headerLower.includes('cargo') || headerLower.includes('position')) {
              autoMapping[header] = 'jobTitle'
            } else if (headerLower.includes('company') || headerLower.includes('empresa') || headerLower.includes('organization')) {
              autoMapping[header] = 'companyName'
            } else if (headerLower.includes('location') || headerLower.includes('ubicacion') || headerLower.includes('city')) {
              autoMapping[header] = 'location'
            } else if (headerLower.includes('note') || headerLower.includes('nota')) {
              autoMapping[header] = 'notes'
            } else {
              autoMapping[header] = 'skip'
            }
          })
          setMapping(autoMapping)
          setStep('mapping')
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error)
      },
    })
  }, [])

  const handleImport = async () => {
    setStep('importing')
    setProgress(0)

    // Convert CSV data to contact objects using mapping
    const contacts = csvData.map((row) => {
      const contact: Record<string, string> = {}
      headers.forEach((header, index) => {
        const field = mapping[header]
        if (field && field !== 'skip' && row[index]) {
          contact[field] = row[index].trim()
        }
      })
      return contact
    }).filter(c => c.firstName || c.lastName || c.email)

    // Simulate progress
    const totalSteps = Math.ceil(contacts.length / 10)
    for (let i = 0; i <= totalSteps; i++) {
      setProgress(Math.min((i / totalSteps) * 100, 90))
      await new Promise(r => setTimeout(r, 100))
    }

    const result = await onImport(contacts)
    setProgress(100)
    setResults(result)
    setStep('complete')
  }

  const handleClose = () => {
    setStep('upload')
    setCsvData([])
    setHeaders([])
    setMapping({})
    setProgress(0)
    setResults({ success: 0, errors: 0 })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Importar Contactos desde CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Sube un archivo CSV con tus contactos'}
            {step === 'mapping' && 'Mapea las columnas de tu CSV a los campos de contacto'}
            {step === 'importing' && 'Importando contactos...'}
            {step === 'complete' && 'Importación completada'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-8">
            <label
              htmlFor="csv-upload"
              className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-12 transition-colors hover:border-indigo-400 hover:bg-indigo-50"
            >
              <Upload className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-lg font-medium">Arrastra tu archivo CSV aquí</p>
              <p className="text-sm text-slate-500 mt-1">o haz clic para seleccionar</p>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <div className="mt-4 text-sm text-slate-500">
              <p>Formato esperado: CSV con encabezados</p>
              <p>Campos: nombre, apellido, email, teléfono, empresa, cargo, etc.</p>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FileSpreadsheet className="h-4 w-4" />
              <span>{csvData.length} filas encontradas</span>
            </div>

            <div className="max-h-[300px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Columna CSV</TableHead>
                    <TableHead>Campo Contacto</TableHead>
                    <TableHead>Vista previa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((header, index) => (
                    <TableRow key={header}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell>
                        <Select
                          value={mapping[header] || 'skip'}
                          onValueChange={(value) =>
                            setMapping((prev) => ({ ...prev, [header]: value }))
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_FIELDS.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {csvData[0]?.[index] || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Atrás
              </Button>
              <Button onClick={handleImport}>
                Importar {csvData.length} contactos
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-slate-600">
              Importando contactos... {Math.round(progress)}%
            </p>
          </div>
        )}

        {step === 'complete' && (
          <div className="py-8 space-y-4 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-medium">Importación completada</p>
              <div className="mt-2 flex justify-center gap-6 text-sm">
                <span className="text-green-600">
                  <CheckCircle className="inline h-4 w-4 mr-1" />
                  {results.success} importados
                </span>
                {results.errors > 0 && (
                  <span className="text-red-600">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    {results.errors} errores
                  </span>
                )}
              </div>
            </div>
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
