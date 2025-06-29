<template>
  <div class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
    <div class="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-orange-500/20 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold">{{ getActionTitle(actionType) }}</h2>
        <button @click="$emit('cancel')" class="text-gray-400 hover:text-white text-2xl">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Note Input -->
        <div>
          <label class="block text-sm font-medium mb-2">Add Note (Optional)</label>
          <textarea
            v-model="note"
            placeholder="Enter any notes about this action..."
            rows="3"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          ></textarea>
        </div>

        <!-- Photo Capture -->
        <div>
          <label class="block text-sm font-medium mb-2">Take Photo (Optional)</label>
          
          <!-- Camera Input -->
          <div v-if="!capturedPhoto" class="space-y-3">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              capture="environment"
              @change="handleFileSelect"
              class="hidden"
            />
            <button
              type="button"
              @click="$refs.fileInput.click()"
              class="w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg p-4 text-center transition"
            >
              📸 Take Photo
            </button>
          </div>

          <!-- Photo Preview -->
          <div v-if="capturedPhoto" class="space-y-3">
            <div class="relative">
              <img :src="photoPreview" alt="Captured photo" class="w-full h-48 object-cover rounded-lg" />
              <button
                type="button"
                @click="removePhoto"
                class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition"
              >
                &times;
              </button>
            </div>
            <div class="text-sm text-gray-400 text-center">
              Photo captured ({{ Math.round(capturedPhoto.size / 1024) }}KB)
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="$emit('cancel')"
            class="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-medium transition"
            :disabled="loading"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex-1 bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-medium transition disabled:opacity-50"
            :disabled="loading"
          >
            <div v-if="loading" class="flex items-center justify-center gap-2">
              <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Logging...</span>
            </div>
            <span v-else>{{ getActionTitle(actionType) }}</span>
          </button>
        </div>
      </form>

      <!-- GPS Status Warning -->
      <div class="mt-4 p-3 bg-orange-900/30 border border-orange-500/30 rounded-lg">
        <div class="flex items-center gap-2 text-sm">
          <span>📍</span>
          <span>GPS location will be recorded with this action</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  actionType: {
    type: String,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['confirm', 'cancel'])

// Form data
const note = ref('')
const capturedPhoto = ref(null)
const photoPreview = ref('')

// Methods
const getActionTitle = (actionType) => {
  const titles = {
    start_route: 'Start Route',
    arrived: 'Arrived at Drop-off',
    delivered: 'Delivered',
    end_route: 'End Route',
    break_start: 'Start Break',
    break_end: 'End Break'
  }
  return titles[actionType] || actionType
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Photo size must be less than 5MB')
    return
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }

  capturedPhoto.value = file

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    photoPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const removePhoto = () => {
  capturedPhoto.value = null
  photoPreview.value = ''
  
  // Clear file input
  const fileInput = document.querySelector('input[type="file"]')
  if (fileInput) fileInput.value = ''
}

const handleSubmit = () => {
  emit('confirm', {
    note: note.value.trim(),
    photo: capturedPhoto.value
  })
}
</script> 