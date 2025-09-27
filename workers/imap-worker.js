// workers/imap-worker.js
// Minimal IMAP watcher using imapflow. Run on server (not in browser).
// Node 18+, install: npm i imapflow node-fetch form-data

import { ImapFlow } from "imapflow";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import fetch from "node-fetch";
import { simpleParser } from "mailparser";
import FormData from "form-data";

const IMAP_HOST = "imap.gmail.com"; // or from env
const IMAP_PORT = Number(process.env.IMAP_PORT || "993");
const IMAP_USER = "kabbaj.m@gmail.com";
const IMAP_PASS = "wjib dwxw frsp qcsq"; // app password or from env

if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) {
  console.error("Please set IMAP_HOST/IMAP_USER/IMAP_PASS in env");
  process.exit(1);
}

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || path.join(process.cwd(), "downloads");
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

async function start() {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: IMAP_PORT === 993,
    auth: { user: IMAP_USER, pass: IMAP_PASS },
    tls: { rejectUnauthorized: false }, // ✅ accepte les self-signed certs
  });

  await client.connect();
  console.log("IMAP connected");

  // Open mailbox
  await client.mailboxOpen("INBOX");

  // Use IDLE and fetch unseen messages matching subject
  for await (let msg of client.fetch({ seen: false }, {
    envelope: true,
    bodyStructure: true,
    source: true,
    uid: true,
    modseq: true
  })) {
    try {
      const subj = (msg.envelope?.subject || "").toString();
      const parsed = await simpleParser(msg.source);
      console.log("");
      console.log("Email, sujet:", subj);
      console.log("Expéditeur :", parsed.from.text);
      console.log("Nombre de pièces jointes :", parsed.attachments.length);
      console.log("");
      if (!subj.includes("Handler") && !subj.includes("New Bookings")) {
        console.log("");
        console.log("Email ignoré, sujet:", subj); // <-- Ajout pour debug
        console.log("");
        // skip unrelated
        await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
        continue;
      }

      console.log("");
      console.log("Email trouvé, sujet:", subj); // <-- Ajout pour debug
      console.log("");

      // Extract attachments using client.downloadStream or by parsing the source
      // Here we'll use getMessageParts
      const parts = await client.fetchOne(msg.uid, { bodyStructure: true });
      // iterate all parts recursively to find PDFs is more involved; for simplicity use fetch parts by section
      // Alternative: write raw source to disk and rely on python script to parse attachments.
      const raw = msg.source;
      const rawFile = path.join(DOWNLOAD_DIR, `msg-${msg.uid}.eml`);
      fs.writeFileSync(rawFile, raw);
      console.log("Saved raw EML to", rawFile);

      // Option A: call local python handler to extract attachments and redact
      // We'll call python script: python workers/pdf_redact.py --input-eml rawFile --outdir DOWNLOAD_DIR
      await new Promise((resolve, reject) => {
        execFile("python3", [path.join(__dirname, "pdf_redact.py"), "--input-eml", rawFile, "--outdir", DOWNLOAD_DIR], (err, stdout, stderr) => {
          if (err) {
            console.error("Python script error:", err, stderr);
            reject(err);
          } else {
            console.log("Python output:", stdout);
            resolve(stdout);
          }
        });
      });

      // After Python processing, expect a redacted PDF file in DOWNLOAD_DIR
      // Find newly created redacted files:
      const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith("_redacted.pdf"));
      if (files.length === 0) {
        console.warn("No redacted PDF produced for message", msg.uid);
        await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
        continue;
      }
      const redactedPath = path.join(DOWNLOAD_DIR, files[files.length - 1]); // take last

      // Send email via server endpoint /api/send-email
      const pdfData = fs.readFileSync(redactedPath, { encoding: "base64" });
      const payload = {
        emailData: {
          to: "recipient@example.com", // optionally determine from content or mapping; improve later
          subject: `Processed booking - ${path.basename(redactedPath)}`,
          text: "Please find attached the processed booking (tarifs masqués).",
          attachments: [
            { filename: path.basename(redactedPath), content: pdfData }
          ]
        }
      };

      // call local server endpoint (adjust host/port if needed)
      const serverUrl = process.env.PROCESSOR_ENDPOINT || "http://localhost:3000/api/send-email";
      const res = await fetch(serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      console.log("Send-email response:", json);

      // mark message seen
      await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
    } catch (err) {
      console.error("Processing error for msg", msg.uid, err);
    }
  }
}

start().catch(err => {
  console.error("IMAP worker error", err);
});
