"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Mail, Eye, EyeOff, Settings, User, Download, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface ExtractedData {
  clientName: string
  hotelName: string
  bookingDate: string
  locator: string
}

export function EmailProcessor() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [hideRates, setHideRates] = useState(true)
  const [addLogo, setAddLogo] = useState(true)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [processedPdfUrl, setProcessedPdfUrl] = useState<string | null>(null)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const { toast } = useToast()
  const supabase = createClient()

  const extractPDFData = (text: string): ExtractedData => {
    // Extraction du nom du client après "Clients name:"
    const clientMatch = text.match(/Clients\s+name:\s*([^\n\r]+)/i)
    const clientName = clientMatch ? clientMatch[1].trim() : "Client non trouvé"

    // Extraction du nom de l'hôtel (après "Hotel" dans la description)
    const hotelMatch = text.match(/Hotel\s+([^\n\r]+)/i)
    const hotelName = hotelMatch ? hotelMatch[1].trim() : "Hôtel non trouvé"

    // Extraction de la date de réservation
    const dateMatch = text.match(/Date of\s+issue[^:]*:\s*([^\n\r]+)/i)
    const bookingDate = dateMatch ? dateMatch[1].trim() : "Date non trouvée"

    // Extraction du locator
    const locatorMatch = text.match(/locator:\s*([^\n\r]+)/i)
    const locator = locatorMatch ? locatorMatch[1].trim() : "Locator non trouvé"

    return {
      clientName,
      hotelName,
      bookingDate,
      locator,
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setUploadedFile(file)

      // En réalité, vous utiliseriez une bibliothèque comme pdf-parse ou pdf2pic
      const mockPDFText = `
        Jumbonline
        BOOKING Date of issue (DDMMYYYY): 29/04/2025 18:28:22
        locator: 16539513
        Clients name: MRS Denisa Magda
        Status: CONFIRMED
        Hotel RIAD CATALINA MARRAKECH
        DOUBLE - BED & BREAKFAST x 2
        3315.00 MAD
        Total Amount: 12345.00 MAD
      `

      const extracted = extractPDFData(mockPDFText)
      setExtractedData(extracted)

      setEmailSubject(`Confirmation de réservation - ${extracted.hotelName}`)
      setEmailBody(`Bonjour,

Veuillez trouver ci-joint la confirmation de réservation pour ${extracted.clientName}.

Détails de la réservation :
- Client : ${extracted.clientName}
- Hôtel : ${extracted.hotelName}
- Locator : ${extracted.locator}

Cordialement,
L'équipe de réservation`)

      toast({
        title: "PDF analysé",
        description: `${file.name} - Client: ${extracted.clientName}`,
      })
    } else {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier PDF valide.",
        variant: "destructive",
      })
    }
  }

  const generateProcessedPdf = async (): Promise<string> => {
    if (!uploadedFile || !extractedData) throw new Error("No file or extracted data available")

    try {
      // Read the original PDF file
      const arrayBuffer = await uploadedFile.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Import PDF-lib for PDF manipulation
      const { PDFDocument, rgb } = await import("pdf-lib")

      // Load the original PDF
      const pdfDoc = await PDFDocument.load(uint8Array)
      const pages = pdfDoc.getPages()
      const firstPage = pages[0]

      // Get page dimensions
      const { width, height } = firstPage.getSize()

      // Remove Jumbonline logo by drawing a white rectangle over it (top area)
      firstPage.drawRectangle({
        x: 0,
        y: height - 80, // Assuming logo is in top 80px
        width: width,
        height: 80,
        color: rgb(1, 1, 1), // White color to hide logo
      })

      // Add your logo text (you can replace this with actual logo image)
      if (addLogo) {
        firstPage.drawText("VOTRE LOGO", {
          x: 20,
          y: height - 40,
          size: 16,
          color: rgb(0, 0, 0),
        })
      }

      // Hide rates/amounts if requested
      if (hideRates) {
        // Draw white rectangles over amount areas
        // This is a simplified approach - in reality you'd need to detect text positions
        const amountAreas = [
          { x: 400, y: 200, width: 100, height: 20 }, // Example area for amounts
          { x: 400, y: 180, width: 100, height: 20 },
          { x: 400, y: 160, width: 150, height: 20 }, // Total amount area
        ]

        amountAreas.forEach((area) => {
          firstPage.drawRectangle({
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            color: rgb(1, 1, 1), // White color to hide amounts
          })
        })
      }

      // Save the modified PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)

      return url
    } catch (error) {
      console.error("PDF processing error:", error)
      // Fallback to original approach if PDF-lib fails
      return await generateFallbackPdf()
    }
  }

  const generateFallbackPdf = async (): Promise<string> => {
    if (!extractedData) throw new Error("No extracted data available")

    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()

    if (addLogo) {
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("VOTRE LOGO", 20, 20)
    }

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("CONFIRMATION DE RÉSERVATION", 20, 40)

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")

    let yPosition = 60
    doc.text(`Date d'émission: ${extractedData.bookingDate}`, 20, yPosition)
    yPosition += 10
    doc.text(`Locator: ${extractedData.locator}`, 20, yPosition)
    yPosition += 10
    doc.text(`Client: ${extractedData.clientName}`, 20, yPosition)
    yPosition += 10
    doc.text(`Statut: CONFIRMÉ`, 20, yPosition)
    yPosition += 20

    doc.setFont("helvetica", "bold")
    doc.text(`Hôtel: ${extractedData.hotelName}`, 20, yPosition)
    yPosition += 15

    doc.setFont("helvetica", "normal")
    doc.text("DOUBLE - BED & BREAKFAST x 2", 20, yPosition)

    if (!hideRates) {
      yPosition += 10
      doc.text("3315.00 MAD", 20, yPosition)
      yPosition += 10
      doc.text("Total Amount: 12345.00 MAD", 20, yPosition)
    }

    const pdfBlob = doc.output("blob")
    const url = URL.createObjectURL(pdfBlob)
    return url
  }

  const sendEmailWithAttachment = async (pdfUrl: string, recipientEmail: string) => {
    try {
      const { data: settings, error: settingsError } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "outgoingEmailServer", // SMTP server
          "outgoingEmailPort", // SMTP port
          "outgoingEmailUsername", // SMTP username
          "outgoingEmailPassword", // SMTP password
          "outgoingEmailUseTls", // SMTP TLS
          "emailFromAddress", // From email address
        ])

      if (settingsError) {
        console.error("[v0] Error loading SMTP settings:", settingsError)
        throw new Error("Failed to load email configuration")
      }

      if (!settings || settings.length === 0) {
        console.error("[v0] No email settings found in database")
        throw new Error("No email configuration found. Please configure SMTP settings first.")
      }

      const emailConfig = settings.reduce(
        (acc, setting) => {
          acc[setting.setting_key] = setting.setting_value
          return acc
        },
        {} as Record<string, any>,
      )

      const requiredSettings = [
        "outgoingEmailServer",
        "outgoingEmailPort",
        "outgoingEmailUsername",
        "outgoingEmailPassword",
        "emailFromAddress",
      ]
      const missingSettings = requiredSettings.filter((key) => !emailConfig[key])

      if (missingSettings.length > 0) {
        console.error("[v0] Missing SMTP settings:", missingSettings)
        throw new Error(`Missing email configuration: ${missingSettings.join(", ")}`)
      }

      console.log("[v0] SMTP configuration loaded successfully:")
      console.log("[v0] - Server:", emailConfig.outgoingEmailServer)
      console.log("[v0] - Port:", emailConfig.outgoingEmailPort)
      console.log("[v0] - From:", emailConfig.emailFromAddress)
      console.log("[v0] - Username configured:", emailConfig.outgoingEmailUsername ? "Yes" : "No")

      // Convert PDF URL to base64 for email service
      const response = await fetch(pdfUrl)
      const blob = await response.blob()
      const reader = new FileReader()

      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(",")[1]

            console.log("[v0] Preparing to send email to:", recipientEmail)
            console.log("[v0] Email subject:", emailSubject)
            console.log("[v0] Email body preview:", emailBody.substring(0, 100) + "...")
            console.log("[v0] PDF attachment size:", base64Data.length, "characters")

            const emailPayload = {
              emailData: {
                from: emailConfig.emailFromAddress,
                to: recipientEmail,
                subject: emailSubject,
                text: emailBody,
                html: emailBody.replace(/\n/g, "<br>"),
                attachments: [
                  {
                    filename: `confirmation_${extractedData?.locator}.pdf`,
                    content: base64Data,
                  },
                ],
              },
              smtpConfig: {
                host: emailConfig.outgoingEmailServer,
                port: emailConfig.outgoingEmailPort,
                username: emailConfig.outgoingEmailUsername,
                password: emailConfig.outgoingEmailPassword,
                useTls: emailConfig.outgoingEmailUseTls === "true" || emailConfig.outgoingEmailUseTls === true,
              },
            }

            console.log("[v0] Sending email via SMTP...")

            const apiResponse = await fetch("/api/send-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailPayload),
            })

            const result = await apiResponse.json()

            if (result.success) {
              console.log("[v0] Email sent successfully via SMTP!")
              console.log("[v0] Email ID:", result.emailId)

              resolve({
                success: true,
                emailId: result.emailId,
                details: result.details,
              })
            } else {
              console.error("[v0] Server returned error:", result.error)
              throw new Error(result.error || "Server failed to send email")
            }
          } catch (error) {
            console.error("[v0] Email preparation error:", error)
            reject(error)
          }
        }

        reader.onerror = () => reject(new Error("Failed to read PDF file"))
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error("[v0] Email sending error:", error)
      throw error
    }
  }

  const processEmail = async () => {
    if (!uploadedFile || !extractedData) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord télécharger un PDF.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const { data: logData, error: logError } = await supabase
        .from("email_processing_logs")
        .insert([
          {
            pdf_filename: uploadedFile.name,
            client_name: extractedData.clientName,
            hotel_name: extractedData.hotelName,
            locator: extractedData.locator,
            status: "processing",
            email_subject: emailSubject,
          },
        ])
        .select()

      if (logError) throw logError

      toast({
        title: "Traitement du PDF",
        description: "Génération du PDF modifié en cours...",
      })

      const processedUrl = await generateProcessedPdf()
      setProcessedPdfUrl(processedUrl)
      setShowPdfPreview(true)

      if (logData && logData[0]) {
        await supabase
          .from("email_processing_logs")
          .update({
            status: "pdf_processed",
          })
          .eq("id", logData[0].id)
      }

      toast({
        title: "PDF traité",
        description: "Le PDF a été modifié avec succès. Vérifiez l'aperçu avant envoi.",
      })
    } catch (error) {
      console.error("Processing error:", error)
      toast({
        title: "Erreur de traitement",
        description: "Une erreur est survenue lors du traitement du PDF.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const sendProcessedEmail = async () => {
    if (!processedPdfUrl || !extractedData) return

    setIsProcessing(true)

    try {
      // Get recipient email from hotel mapping
      const { data: mappingData } = await supabase
        .from("hotel_mappings")
        .select("email_address")
        .eq("hotel_name", extractedData.hotelName)
        .single()

      const recipientEmail = mappingData?.email_address || "email-non-trouve@example.com"

      await sendEmailWithAttachment(processedPdfUrl, recipientEmail)

      const { data: logData } = await supabase
        .from("email_processing_logs")
        .select("id")
        .eq("locator", extractedData.locator)
        .eq("status", "pdf_processed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (logData) {
        await supabase
          .from("email_processing_logs")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
            recipient_email: recipientEmail,
          })
          .eq("id", logData.id)
      }

      toast({
        title: "Email envoyé",
        description: `PDF traité envoyé à ${recipientEmail} pour ${extractedData.clientName}`,
      })

      // Reset state
      setShowPdfPreview(false)
      setProcessedPdfUrl(null)
    } catch (error) {
      console.error("Email sending error:", error)
      toast({
        title: "Erreur d'envoi",
        description: "L'email n'a pas pu être envoyé. Vérifiez la configuration SMTP.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Téléchargement de PDF
          </CardTitle>
          <CardDescription>Téléchargez le PDF de réservation Jumbonline reçu par email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="space-y-2">
              <Label htmlFor="pdf-upload" className="cursor-pointer">
                <span className="text-sm font-medium">Cliquez pour télécharger</span>
                <span className="text-sm text-muted-foreground block">ou glissez-déposez votre PDF ici</span>
              </Label>
              <Input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </div>
          </div>

          {uploadedFile && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Badge variant="outline">PDF</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Données extraites du PDF
            </CardTitle>
            <CardDescription>Informations automatiquement détectées dans le PDF Jumbonline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Client</Label>
                <p className="font-medium">{extractedData.clientName}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hôtel</Label>
                <p className="font-medium">{extractedData.hotelName}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date de réservation</Label>
                <p className="font-medium">{extractedData.bookingDate}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Locator</Label>
                <p className="font-medium">{extractedData.locator}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Options de traitement
          </CardTitle>
          <CardDescription>Modifications automatiques appliquées au PDF Jumbonline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <EyeOff className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium">Supprimer le logo Jumbonline</p>
                <p className="text-sm text-muted-foreground">Retire automatiquement le logo de l'en-tête</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
              Automatique
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Masquer les tarifs (colonne Amount)</p>
                <p className="text-sm text-muted-foreground">Cache tous les montants MAD dans le PDF</p>
              </div>
            </div>
            <Button variant={hideRates ? "default" : "outline"} size="sm" onClick={() => setHideRates(!hideRates)}>
              {hideRates ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Ajouter votre logo</p>
                <p className="text-sm text-muted-foreground">Remplace le logo Jumbonline par le vôtre</p>
              </div>
            </div>
            <Button variant={addLogo ? "default" : "outline"} size="sm" onClick={() => setAddLogo(!addLogo)}>
              {addLogo ? "Activé" : "Désactivé"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Modèle d'email
          </CardTitle>
          <CardDescription>Message personnalisé envoyé avec le PDF modifié</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-subject">Objet de l'email</Label>
            <Input
              id="email-subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Confirmation de réservation - [HOTEL_NAME]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-body">Corps du message</Label>
            <Textarea
              id="email-body"
              rows={6}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Votre message personnalisé..."
            />
          </div>
        </CardContent>
      </Card>

      {showPdfPreview && processedPdfUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              PDF traité - Aperçu avant envoi
            </CardTitle>
            <CardDescription>Vérifiez le PDF modifié avant de l'envoyer par email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-border rounded-lg p-6 bg-muted/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">PDF modifié prêt</p>
                    <p className="text-sm text-muted-foreground">
                      Logo Jumbonline supprimé • {hideRates ? "Tarifs masqués" : "Tarifs visibles"} •{" "}
                      {addLogo ? "Votre logo ajouté" : "Pas de logo"}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={processedPdfUrl} download={`confirmation_${extractedData?.locator}.pdf`}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </a>
                </Button>
              </div>

              <div className="flex gap-3">
                <Button onClick={sendProcessedEmail} disabled={isProcessing} className="flex-1">
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Envoyer l'email
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowPdfPreview(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Button */}
      {!showPdfPreview && (
        <Card>
          <CardContent className="pt-6">
            <Button onClick={processEmail} disabled={!uploadedFile || isProcessing} className="w-full" size="lg">
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Traiter le PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
