import { PDFDocument, PDFImage } from 'pdf-lib'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Non autorisé',
    })
  }


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
  const user = await prisma.user.findUnique({ where: { id: userId } })
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
    const compressedPdfBytes = await compressPdf(pdfDoc)
    

    // Mise à jour des tokens et enregistrement de la transaction
    await prisma.user.update({
      where: { id: userId },
      data: { tokens: user.tokens - requiredTokens },
    })

    await prisma.transaction.create({
      data: {
        userId,
        type: 'compress-pdf',
        amount: requiredTokens,
        status: 'success',
      },
    })

    return {
      compressedPdf: compressedPdfBytes,
      fileName: `compressed_${fileName}`,
      tokensUsed: requiredTokens,
    }
  } catch (error) {
    await prisma.transaction.create({
      data: {
        userId,
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



async function compressPdf(inputFile: PDFDocument) {


  // Compress the images (if present)
  const pages = inputFile.getPages();
  for (const page of pages) {
    const images = page.node.Resources?.XObject;
    if (images) {
      for (const [key, image] of Object.entries(images)) {
        if (image instanceof PDFImage) {
          const imageBytes = image.bytes;

          // Compress the image using sharp
          const compressedImageBytes = await sharp(imageBytes)
            .jpeg({ quality: 60 }) // Adjust quality as necessary
            .toBuffer();

          // Embed the compressed image back into the PDF
          const compressedImage = await inputFile.embedJpg(compressedImageBytes);
          page.drawImage(compressedImage, {
            x: image.x,
            y: image.y,
            width: image.width,
            height: image.height,
          });

          // Optionally, remove the original image
          delete page.node.Resources.XObject[key];
        }
      }
    }
  }

  // Serialize the PDF document to bytes
  const pdfBytes = await inputFile.save();

  return pdfBytes;
}