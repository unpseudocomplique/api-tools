<template>
  <div>
    <h1 class="text-3xl font-bold mb-4">Outils API</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Compression PDF</h2>
        </template>
        <UForm :state="pdfForm" @submit="compressPdf">
          <UFormGroup label="Fichier PDF" name="file">
            <UInput type="file" accept=".pdf" @change="handlePdfFileChange" />
          </UFormGroup>
          <UButton type="submit" label="Compresser" />
        </UForm>
      </UCard>
      
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Réduction d'image</h2>
        </template>
        <UForm :state="imageForm" @submit="reduceImage">
          <UFormGroup label="Image" name="file">
            <UInput type="file" accept="image/*" @change="handleImageFileChange" />
          </UFormGroup>
          <UFormGroup label="Qualité" name="quality">
            <URange v-model="imageForm.quality" :min="1" :max="100" />
          </UFormGroup>
          <UButton type="submit" label="Réduire" />
        </UForm>
      </UCard>
      
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Réduction de vidéo</h2>
        </template>
        <UForm :state="videoForm" @submit="reduceVideo">
          <UFormGroup label="Vidéo" name="file">
            <UInput type="file" accept="video/*" @change="handleVideoFileChange" />
          </UFormGroup>
          <UButton type="submit" label="Réduire" />
        </UForm>
      </UCard>
      
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Fusion de PDFs</h2>
        </template>
        <UForm :state="mergePdfForm" @submit="mergePdfs">
          <UFormGroup label="Fichiers PDF" name="files">
            <UInput type="file" accept=".pdf" multiple @change="handleMergePdfFilesChange" />
          </UFormGroup>
          <UButton type="submit" label="Fusionner" />
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup>
const pdfForm = ref({ file: null })
const imageForm = ref({ file: null, quality: 80 })
const videoForm = ref({ file: null })
const mergePdfForm = ref({ files: [] })

const handlePdfFileChange = (event) => {
  pdfForm.value.file = event.target.files[0]
}

const handleImageFileChange = (event) => {
  imageForm.value.file = event.target.files[0]
}

const handleVideoFileChange = (event) => {
  videoForm.value.file = event.target.files[0]
}

const handleMergePdfFilesChange = (event) => {
  mergePdfForm.value.files = Array.from(event.target.files)
}

const compressPdf = async () => {
  if (!pdfForm.value.file) return

  const formData = new FormData()
  formData.append('pdfData', pdfForm.value.file)
  formData.append('fileName', pdfForm.value.file.name)

  try {
    const response = await $fetch('/api/process/compress-pdf', {
      method: 'POST',
      body: formData,
    })

    // Télécharger le fichier compressé
    const blob = new Blob([response.compressedPdf], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = response.fileName
    link.click()
  } catch (error) {
    console.error('Erreur lors de la compression du PDF:', error)
  }
}

const reduceImage = async () => {
  if (!imageForm.value.file) return

  const formData = new FormData()
  formData.append('imageData', imageForm.value.file)
  formData.append('fileName', imageForm.value.file.name)
  formData.append('quality', imageForm.value.quality)

  try {
    const response = await $fetch('/api/process/reduce-image', {
      method: 'POST',
      body: formData,
    })

    // Télécharger l'image réduite
    const blob = new Blob([response.reducedImage], { type: imageForm.value.file.type })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = response.fileName
    link.click()
  } catch (error) {
    console.error(`Erreur lors de la réduction de l'image:`, error)
  }
}

const reduceVideo = async () => {
  if (!videoForm.value.file) return

  const formData = new FormData()
  formData.append('videoData', videoForm.value.file)
  formData.append('fileName', videoForm.value.file.name)

  try {
    const response = await $fetch('/api/process/reduce-video', {
      method: 'POST',
      body: formData,
    })

    // Télécharger la vidéo réduite
    const blob = new Blob([response.reducedVideo], { type: videoForm.value.file.type })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = response.fileName
    link.click()
  } catch (error) {
    console.error('Erreur lors de la réduction de la vidéo:', error)
  }
}

const mergePdfs = async () => {
  if (mergePdfForm.value.files.length < 2) return

  const formData = new FormData()
  mergePdfForm.value.files.forEach((file, index) => {
    formData.append(`pdfData${index}`, file)
  })
  formData.append('fileName', 'merged.pdf')

  try {
    const response = await $fetch('/api/process/merge-pdfs', {
      method: 'POST',
      body: formData,
    })

    // Télécharger le PDF fusionné
    const blob = new Blob([response.mergedPdf], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = response.fileName
    link.click()
  } catch (error) {
    console.error('Erreur lors de la fusion des PDFs:', error)
  }
}
</script>