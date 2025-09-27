#!/usr/bin/env python3
"""
workers/pdf_redact.py

Usage:
  python3 pdf_redact.py --input-eml /path/to/msg.eml --outdir /tmp/output
  or
  python3 pdf_redact.py --input-pdf /path/to/input.pdf --outdir /tmp/output

This script:
 - If given an .eml file: extracts PDF attachments into outdir.
 - For each PDF file: uses pdfplumber to find numeric amounts (regex),
   draws opaque rectangles over their bounding boxes and stamps a logo
   (if logo.png exists in script dir).
 - Writes a new file <orig>_redacted.pdf in outdir.
Dependencies:
 pip install pdfplumber pypdf pillow reportlab python-magic
 System deps: poppler-utils (if needed), but pdfplumber works with pure python for text PDFs.
"""
import os, sys, re, io, argparse, base64, logging
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from PIL import Image
import pdfplumber
import email
import email.policy

logging.basicConfig(level=logging.INFO)
AMOUNT_RE = re.compile(r"(?:\b|^)(?:USD|EUR|MAD|\$)?\s?([0-9]{1,3}(?:[ ,\.][0-9]{3})*(?:[.,][0-9]{2})?)(?:\b|$)")

def extract_pdfs_from_eml(eml_path, outdir):
    with open(eml_path, "rb") as f:
        msg = email.message_from_bytes(f.read(), policy=email.policy.default)
    saved = []
    for part in msg.iter_attachments():
        fname = part.get_filename()
        if not fname:
            continue
        content_type = part.get_content_type()
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        if fname.lower().endswith(".pdf") or content_type == "application/pdf":
            outpath = Path(outdir) / fname
            with open(outpath, "wb") as o:
                o.write(payload)
            saved.append(str(outpath))
            logging.info("Saved attachment %s", outpath)
    return saved

def redact_pdf(input_pdf, output_pdf, logo_path=None):
    # find amounts with pdfplumber
    amounts = []  # list of dicts {page_idx, x0, top, x1, bottom}
    with pdfplumber.open(input_pdf) as pdf:
        for i, page in enumerate(pdf.pages):
            words = page.extract_words()
            for w in words:
                text = w.get("text", "")
                if AMOUNT_RE.search(text):
                    amounts.append({
                        "page": i,
                        "x0": float(w["x0"]),
                        "top": float(w["top"]),
                        "x1": float(w["x1"]),
                        "bottom": float(w["bottom"]),
                    })
    # merge overlays
    reader = PdfReader(input_pdf)
    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        media = page.mediabox
        page_width = float(media.width)
        page_height = float(media.height)
        packet = io.BytesIO()
        canv = canvas.Canvas(packet, pagesize=(page_width, page_height))
        # draw logo top-right
        if logo_path and os.path.exists(logo_path):
            try:
                im = Image.open(logo_path)
                logo_w = 120
                logo_h = int(logo_w * im.height / im.width)
                canv.drawImage(logo_path, page_width - logo_w - 20, page_height - logo_h - 20, width=logo_w, height=logo_h, preserveAspectRatio=True, mask="auto")
            except Exception as e:
                logging.warning("Failed to draw logo: %s", e)
        # draw rectangles where amounts were found on this page
        for a in amounts:
            if a["page"] == i:
                x0 = a["x0"] - 2
                top = a["top"] - 2
                x1 = a["x1"] + 2
                bottom = a["bottom"] + 2
                rect_w = x1 - x0
                rect_h = bottom - top
                # pdfplumber top is distance from top; reportlab origin at bottom
                y = page_height - bottom
                x = x0
                canv.setFillColorRGB(0, 0, 0)  # black
                canv.rect(x, y, rect_w, rect_h, fill=1, stroke=0)
        canv.save()
        packet.seek(0)
        overlay = PdfReader(packet)
        overlay_page = overlay.pages[0]
        base_page = page
        base_page.merge_page(overlay_page)
        writer.add_page(base_page)
    with open(output_pdf, "wb") as f:
        writer.write(f)
    logging.info("Wrote redacted PDF: %s", output_pdf)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-eml", help="EML file containing PDF attachments")
    parser.add_argument("--input-pdf", help="Single PDF file to process")
    parser.add_argument("--outdir", default=".", help="Output directory")
    parser.add_argument("--logo", default=None, help="Optional logo path")
    args = parser.parse_args()

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    logo = args.logo or Path(__file__).parent / "logo.png"

    pdfs = []
    if args.input_eml:
        pdfs.extend(extract_pdfs_from_eml(args.input_eml, outdir))
    if args.input_pdf:
        pdfs.append(args.input_pdf)

    if not pdfs:
        logging.error("No PDFs found to process")
        sys.exit(1)

    for pdf in pdfs:
        input_pdf = Path(pdf)
        out_pdf = outdir / f"{input_pdf.stem}_redacted.pdf"
        redact_pdf(str(input_pdf), str(out_pdf), str(logo) if logo.exists() else None)

if __name__ == "__main__":
    main()
