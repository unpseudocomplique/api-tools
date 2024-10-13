import { PDFDocument, PDFImage } from 'pdf-lib'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { checkToken } from '~/server/utils/check-token'
import { Readable, PassThrough } from 'stream'
import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await checkToken(event)


  const files = await readMultipartFormData(event)

  if(!Array.isArray(files) || files.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Aucun fichier fourni',
    })
  }

  const pdfData = files[0].data

  //pdf fileName
  const fileName = files[0].filename

  // Vérifier les tokens de l'utilisateur
  const requiredTokens = Math.ceil(pdfData.length / (1024 * 1024)) // 1 token par Mo

  if (user.tokens < requiredTokens) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tokens insuffisants',
    })
  }

  try {
    // Compression du PDF
    const pdfDoc = await PDFDocument.load(pdfData)
    const pdfCompressed = await compressPdf(pdfDoc)
    

    // Mise à jour des tokens et enregistrement de la transaction
    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: user.tokens - requiredTokens },
    })

    console.log('tokens', user.tokens)
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'compress-pdf',
        amount: requiredTokens,
        status: 'success',
      },
    })


    // const base64String = Buffer.from(compressedPdfBytes).toString('base64');

    //pdf to readable stream
    const reducedImages = await compressPdf(pdfCompressed);
    const pdfBytes = await reducedImages.save();
    const smallerPdfBytes = await compressPdfWithGhostscript(pdfBytes);
    const readableStream = new Readable();
    readableStream.push(Buffer.from(smallerPdfBytes)); // Pousser les données PDF dans le flux
    readableStream.push(null); // Indiquer la fin du flux

    console.log('transaction finished')

    return sendStream(event, readableStream);
  } catch (error) {

    console.log('error', error)
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'compress-pdf',
        amount: requiredTokens,
        status: 'failed',
      },
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la compression du PDF',
    })
  }
})



const compressPdf = async (inputPdfDoc: PDFDocument) => {
  // Compress images on each page
  const pages = inputPdfDoc.getPages();
  for (const page of pages) {
    const images = page.node.Resources?.XObject;
    if (images) {
      for (const [key, image] of Object.entries(images)) {
        if (image instanceof PDFImage) {
          const imageBytes = image.bytes;

          // Compress the image using sharp with aggressive settings
          const compressedImageBytes = await sharp(imageBytes)
            .resize({ width: Math.floor(image.width / 4), height: Math.floor(image.height / 4) }) // More downsample
            .jpeg({ quality: 40 }) // Aggressive compression
            .toBuffer();

          // Embed the compressed image back into the PDF
          const compressedImage = await inputPdfDoc.embedJpg(compressedImageBytes);
          page.drawImage(compressedImage, {
            x: image.x,
            y: image.y,
            width: image.width,
            height: image.height,
          });

          // Optionally remove the original image
          delete page.node.Resources.XObject[key];
        }
      }
    }
  }

  // Remove annotations and form fields
  removeAnnotationsAndFields(inputPdfDoc);

  // Create a new optimized PDF document
  const optimizedPdfDoc = await PDFDocument.create();
  const copiedPages = await optimizedPdfDoc.copyPages(inputPdfDoc, inputPdfDoc.getPageIndices());
  copiedPages.forEach(page => optimizedPdfDoc.addPage(page));

  return optimizedPdfDoc;
};

const removeAnnotationsAndFields = (pdfDoc: PDFDocument) => {
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    // Remove annotations
    page.node.Annots = undefined;

    // Remove form fields
    const acroForm = pdfDoc.catalog.get('AcroForm');
    if (acroForm) {
      acroForm.set('Fields', []);
    }
  }
};

const compressPdfWithGhostscript = async (pdfBytes) => {
  const inputPath = path.join(os.tmpdir(), `input-${Date.now()}.pdf`);
  const outputPath = path.join(os.tmpdir(), `output-${Date.now()}.pdf`);

  try {
    // Écrire le PDF dans un fichier temporaire
    await fs.writeFile(inputPath, pdfBytes);

    // Lancer Ghostscript pour compresser le fichier PDF
    await new Promise((resolve, reject) => {
      const gs = spawn('gs', [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dPDFSETTINGS=/screen', // Essayez avec un autre niveau de compression
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile=${outputPath}`,
        inputPath
      ]);

      gs.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Ghostscript exited with code ${code}`));
        }
      });

      // Capture des erreurs
      gs.stderr.on('data', (data) => {
        // console.error(`Ghostscript error: ${data}`);
      });
    });

    // Lire le fichier de sortie compressé
    const compressedPdfBytes = await fs.readFile(outputPath);

    return compressedPdfBytes;

  } finally {
    // Nettoyer les fichiers temporaires
    await Promise.all([
      fs.unlink(inputPath).catch(() => { }), // Ignorer les erreurs de suppression
      fs.unlink(outputPath).catch(() => { })
    ]);
  }
};
