import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailData } = body

    console.log("[v0] Server: Received email request")
    console.log("[v0] Server: From:", emailData.from)
    console.log("[v0] Server: To:", emailData.to)

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set")
    }

    const resend = new Resend(resendApiKey)

    const attachments =
      emailData.attachments?.map((attachment: any) => ({
        filename: attachment.filename,
        content: attachment.content, // Base64 content
      })) || []

    console.log("[v0] Server: Sending email via Resend...")
    console.log("[v0] Server: Attachment count:", attachments.length)

    const { data, error } = await resend.emails.send({
      from: emailData.from,
      to: [emailData.to],
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      attachments: attachments,
    })

    if (error) {
      console.error("[v0] Server: Resend error:", error)
      throw new Error(`Resend API error: ${error.message}`)
    }

    console.log("[v0] Server: Email sent successfully via Resend!")
    console.log("[v0] Server: Email ID:", data?.id)

    return NextResponse.json({
      success: true,
      emailId: data?.id,
      details: "Email sent successfully via Resend",
    })
  } catch (error) {
    console.error("[v0] Server: Email sending error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: "Failed to send email via Resend",
      },
      { status: 500 },
    )
  }
}
