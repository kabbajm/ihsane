// app/api/send-email/route.ts
import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

type Attachment = {
  filename: string;
  content: string; // Base64
};

type EmailRequestBody = {
  emailData: {
    from?: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: Attachment[];
  };
};

function envRequired(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EmailRequestBody;
    const { emailData } = body;

    if (!emailData || !emailData.to || !emailData.subject) {
      return NextResponse.json({ success: false, error: "Missing emailData fields" }, { status: 400 });
    }

    // Read SMTP credentials from server environment — DO NOT expect them from client
    const SMTP_HOST = envRequired("SMTP_HOST");
    const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
    const SMTP_USER = envRequired("SMTP_USER");
    const SMTP_PASS = envRequired("SMTP_PASS");

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const mailOptions: any = {
      from: emailData.from || process.env.EMAIL_FROM || SMTP_USER,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      attachments: [],
    };

    if (Array.isArray(emailData.attachments)) {
      // Basic validation: ensure attachments are base64 strings and filenames are safe
      mailOptions.attachments = emailData.attachments.map((att) => ({
        filename: att.filename.replace(/\.\./g, ""), // naive sanitize
        content: att.content,
        encoding: "base64",
      }));
    }

    // send
    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      emailId: info.messageId,
      details: info,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-email] error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
