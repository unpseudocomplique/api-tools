import { PDFDocument } from 'pdf-lib'
import { PrismaClient } from '@prisma/client'

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

  const body = await readBody(event)
  const { pdfDataList, fileName } = body

  // Vérifier les tokens de l'utilisateur
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const totalSize = pdfDataList.reduce((acc, pdf) => acc + pdf.length, 0)
  const requiredTokens = Math.ceil(totalSize / (1024 * 1024)) // 1 token par Mo

  if (user.tokens < requiredTokens) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tokens insuffisants',
    })
  }

  try {
    // Fusion des PDFs
    const mergedPdf = await PDFDocument.create()

    for (const pdfData of pdfDataList) {
      const pdf = await PDFDocument.load(pdfData)
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((page) => mergedPdf.addPage(page))
    }

    const mergedPdfBytes = await mergedPdf.save()

    // Mise à jour des tokens et enregistrement de la transaction
    await prisma.user.update({
      where: { id: userId },
      data: { tokens: user.tokens - requiredTokens },
    })

    await prisma.transaction.create({
      data: {
        userId,
        type: 'merge-pdfs',
        amount: requiredTokens,
        status: 'success',
      },
    })

    return {
      mergedPdf: mergedPdfBytes,
      fileName: `merged_${fileName}`,
      tokensUsed: requiredTokens,
    }
  } catch (error) {
    await prisma.transaction.create({
      data: {
        userId,
        type: 'merge-pdfs',
        amount: requiredTokens,
        status: 'failed',
      },
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la fusion des PDFs',
    })
  }
})