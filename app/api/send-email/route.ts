import { type NextRequest, NextResponse } from "next/server"
// 1. Importer Nodemailer
import nodemailer from "nodemailer"

// Définir les types pour la requête
type Attachment = {
  filename: string
  content: string // Base64 content
}

type EmailRequestBody = {
  emailData: {
    from: string
    to: string | string[]
    subject: string
    html?: string
    text?: string
    attachments?: Attachment[]
  }
  // Réintroduction de la configuration SMTP pour l'analyse
  smtpConfig: {
    host: string
    port: string | number
    username: string
    password: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EmailRequestBody
    const { emailData, smtpConfig } = body

    console.log("[v2] Server: Received email request for Nodemailer")
    console.log("[v2] Server: From:", emailData.from)
    console.log("[v2] Server: To:", emailData.to)
    console.log("[v2] Server: SMTP Server:", smtpConfig?.host)

    // 2. Validation de la configuration SMTP
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.port || !smtpConfig.username || !smtpConfig.password) {
      throw new Error("SMTP configuration is incomplete. Please check your email settings.")
    }

    // 3. Créer le Transporter Nodemailer
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: Number.parseInt(String(smtpConfig.port)), // Assurer que le port est un nombre
      secure: Number.parseInt(String(smtpConfig.port)) === 465, // Utilisez TLS si le port est 465
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    })
    
    // 4. Préparer les pièces jointes au format Nodemailer
    // Nodemailer accepte directement le contenu Base64 (ou autre)
    const attachmentsForNodemailer = (emailData.attachments || []).map(att => ({
      filename: att.filename,
      content: att.content, // Le contenu est supposé être en Base64
      encoding: 'base64' // Indiquer à Nodemailer que le contenu est Base64
    }))

    // 5. Envoyer l'e-mail
    const info = await transporter.sendMail({
      from: emailData.from,
      // Nodemailer gère les chaînes ou les tableaux pour 'to'
      to: Array.isArray(emailData.to) ? emailData.to.join(", ") : emailData.to,
      subject: emailData.subject,
      html: emailData.html || undefined, // Préférer HTML si disponible
      text: emailData.text || undefined, // Fallback en texte
      attachments: attachmentsForNodemailer,
    })

    console.log("[v2] Server: Email sent successfully via Nodemailer!")
    console.log("[v2] Server: Message ID:", info.messageId)
    // Utile pour le débogage: console.log("[v2] Server: Server Response:", info.response)

    // 6. Réponse de succès
    return NextResponse.json({
      success: true,
      emailId: info.messageId,
      details: `Email sent successfully via Nodemailer. Response: ${info.response}`,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred."
    
    console.error("[v2] Server: Email sending error:", errorMessage)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: "Failed to send email via Nodemailer",
      },
      { status: 500 },
    )
  }
}