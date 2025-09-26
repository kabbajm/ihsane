import { type NextRequest, NextResponse } from "next/server"

//export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailData, smtpConfig } = body

    console.log("[v0] Server: Received email request")
    console.log("[v0] Server: From:", emailData.from)
    console.log("[v0] Server: To:", emailData.to)
    console.log("[v0] Server: SMTP Server:", smtpConfig?.host)
    console.log("[v0] Server: SMTP Config Details:")
    console.log("[v0] Server: - Host:", smtpConfig?.host)
    console.log("[v0] Server: - Port:", smtpConfig?.port, "(type:", typeof smtpConfig?.port, ")")
    console.log("[v0] Server: - Username:", smtpConfig?.username)
    console.log("[v0] Server: - Password configured:", smtpConfig?.password ? "Yes" : "No")
    console.log("[v0] Server: - Use TLS:", smtpConfig?.useTls, "(type:", typeof smtpConfig?.useTls, ")")

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.port || !smtpConfig.username || !smtpConfig.password) {
      throw new Error("SMTP configuration is incomplete. Please check your email settings.")
    }

    const port = Number.parseInt(smtpConfig.port)
    const useTls = smtpConfig.useTls === "true" || smtpConfig.useTls === true

    // Determine secure setting based on port and TLS configuration
    // Port 465 uses SSL/TLS directly (secure: true)
    // Port 587 uses STARTTLS (secure: false, but with TLS upgrade)
    const isSecure = port === 465

    const json2smtpPayload = {
      from: emailData.from,
      to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      smtp: {
        host: smtpConfig.host,
        port: port,
        secure: isSecure, // true for 465 (SSL), false for 587 (STARTTLS)
        auth: {
          user: smtpConfig.username,
          pass: smtpConfig.password,
        },
        ...(port === 587 &&
          useTls && {
            requireTLS: true,
            tls: {
              rejectUnauthorized: false, // Allow self-signed certificates for development
            },
          }),
      },
    }

    if (emailData.attachments && emailData.attachments.length > 0) {
      json2smtpPayload.attachments = {}
      emailData.attachments.forEach((attachment) => {
        json2smtpPayload.attachments[attachment.filename] = attachment.content
      })
    }

    console.log("[v0] Server: json2smtp payload:")
    console.log("[v0] Server: - SMTP Host:", json2smtpPayload.smtp.host)
    console.log("[v0] Server: - SMTP Port:", json2smtpPayload.smtp.port, "(parsed as number)")
    console.log("[v0] Server: - SMTP Secure:", json2smtpPayload.smtp.secure)
    console.log("[v0] Server: - SMTP Auth User:", json2smtpPayload.smtp.auth.user)
    console.log("[v0] Server: - SMTP Auth Pass configured:", json2smtpPayload.smtp.auth.pass ? "Yes" : "No")
    if (json2smtpPayload.smtp.requireTLS) {
      console.log("[v0] Server: - SMTP RequireTLS:", json2smtpPayload.smtp.requireTLS)
    }

    console.log("[v0] Server: Sending email via json2smtp...")
    console.log("[v0] Server: Attachment count:", emailData.attachments?.length || 0)

    const response = await fetch("https://api.json2smtp.net", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json2smtpPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Server: json2smtp error:", errorText)
      throw new Error(`json2smtp API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()

    console.log("[v0] Server: Email sent successfully via json2smtp!")
    console.log("[v0] Server: Response:", result)

    return NextResponse.json({
      success: true,
      emailId: result.messageId || "sent",
      details: "Email sent successfully via SMTP",
    })
  } catch (error) {
    console.error("[v0] Server: Email sending error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: "Failed to send email via SMTP",
      },
      { status: 500 },
    )
  }
}
