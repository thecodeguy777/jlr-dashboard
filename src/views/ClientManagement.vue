<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-900 via-blue-950 to-gray-900 text-white p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">📍 Client Location Management</h1>
        <p class="text-sm text-white/60">Manage client locations for delivery geofencing</p>
      </div>
      <button @click="showAddModal = true"
        class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition">
        ➕ Add New Client
      </button>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white/10 rounded-xl p-4 shadow">
        <h3 class="text-sm font-medium text-white/70">Total Clients</h3>
        <p class="text-3xl font-bold text-blue-400 mt-2">{{ stats.total }}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4 shadow">
        <h3 class="text-sm font-medium text-white/70">Active</h3>
        <p class="text-3xl font-bold text-green-400 mt-2">{{ stats.active }}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4 shadow">
        <h3 class="text-sm font-medium text-white/70">With GPS Location</h3>
        <p class="text-3xl font-bold text-orange-400 mt-2">{{ stats.withLocation }}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-4 shadow">
        <h3 class="text-sm font-medium text-white/70">Need GPS Setup</h3>
        <p class="text-3xl font-bold text-red-400 mt-2">{{ stats.needLocation }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
      <div class="flex flex-wrap gap-4 items-center">
        <div class="flex items-center gap-2">
          <label class="text-sm text-white/70">Filter:</label>
          <select v-model="filter" 
            class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm">
            <option value="all">All Clients</option>
            <option value="active">Active Only</option>
            <option value="no-location">Missing GPS Location</option>
            <option value="with-location">With GPS Location</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <input 
            type="text" 
            v-model="searchTerm"
            placeholder="Search clients..."
            class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm w-64"
          />
        </div>
        <button @click="refreshClients" :disabled="loading"
          class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition disabled:opacity-50">
          🔄 {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Clients Table -->
    <div class="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-white/10 bg-white/5">
            <tr>
              <th class="text-left p-4">Client Info</th>
              <th class="text-left p-4">Location</th>
              <th class="text-left p-4">GPS Coordinates</th>
              <th class="text-left p-4">Geofence</th>
              <th class="text-left p-4">Status</th>
              <th class="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="client in filteredClients" :key="client.id" 
              class="border-b border-white/5 hover:bg-white/5">
              <td class="p-4">
                <div class="font-medium">{{ client.name }}</div>
                <div class="text-xs text-gray-400">{{ client.phone || 'No phone' }}</div>
                <div class="text-xs text-gray-400">{{ client.email || 'No email' }}</div>
              </td>
              <td class="p-4">
                <div class="text-sm">{{ client.address || 'No address' }}</div>
                <div v-if="client.notes" class="text-xs text-gray-400 mt-1">{{ client.notes }}</div>
              </td>
              <td class="p-4">
                <div v-if="client.location_lat && client.location_lng" class="text-xs font-mono">
                  <div>📍 {{ parseFloat(client.location_lat).toFixed(6) }}</div>
                  <div>📍 {{ parseFloat(client.location_lng).toFixed(6) }}</div>
                  <button @click="viewOnMap(client)" 
                    class="text-blue-400 hover:text-blue-300 text-xs mt-1">
                    🗺️ View on Map
                  </button>
                </div>
                <div v-else class="text-red-400 text-xs">
                  ❌ No GPS coordinates
                </div>
              </td>
              <td class="p-4">
                <div v-if="client.location_lat && client.location_lng">
                  <span class="bg-orange-900 text-orange-300 px-2 py-1 rounded text-xs">
                    {{ client.geofence_radius }}m radius
                  </span>
                </div>
                <div v-else class="text-gray-500 text-xs">—</div>
              </td>
              <td class="p-4">
                <span :class="[
                  'px-2 py-1 rounded text-xs',
                  client.is_active 
                    ? 'bg-green-900 text-green-300' 
                    : 'bg-red-900 text-red-300'
                ]">
                  {{ client.is_active ? '✅ Active' : '❌ Inactive' }}
                </span>
              </td>
              <td class="p-4">
                <div class="flex gap-2">
                  <button @click="editClient(client)"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition">
                    ✏️ Edit
                  </button>
                  <button @click="toggleClientStatus(client)"
                    :class="[
                      'px-2 py-1 rounded text-xs transition',
                      client.is_active 
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    ]">
                    {{ client.is_active ? '🚫' : '✅' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredClients.length === 0" class="p-8 text-center text-gray-400">
        <div class="text-4xl mb-4">📍</div>
        <div class="text-lg font-medium mb-2">No clients found</div>
        <div class="text-sm">Try adjusting your filters or add a new client</div>
      </div>
    </div>

    <!-- Add/Edit Client Modal -->
    <div v-if="showAddModal || showEditModal" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-orange-500/20 max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-semibold text-white mb-6">
          {{ showAddModal ? '➕ Add New Client' : '✏️ Edit Client' }}
        </h3>
        
        <form @submit.prevent="submitClientForm" class="space-y-4">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-gray-300 mb-2">Client Name *</label>
              <input 
                type="text" 
                v-model="clientForm.name"
                required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="ABC Company"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-300 mb-2">Phone</label>
              <input 
                type="text" 
                v-model="clientForm.phone"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="(02) 123-4567"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-2">Email</label>
            <input 
              type="email" 
              v-model="clientForm.email"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="contact@company.com"
            />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-2">Address</label>
            <textarea 
              v-model="clientForm.address"
              rows="2"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="123 Business Street, City"
            ></textarea>
          </div>

          <!-- GPS Location -->
          <div class="border-t border-gray-600 pt-4">
            <h4 class="text-lg font-medium text-white mb-4">📍 GPS Location (for Geofencing)</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-300 mb-2">Latitude</label>
                <input 
                  type="number" 
                  step="0.000001"
                  v-model="clientForm.location_lat"
                  class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  placeholder="14.599512"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-300 mb-2">Longitude</label>
                <input 
                  type="number" 
                  step="0.000001"
                  v-model="clientForm.location_lng"
                  class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  placeholder="120.984222"
                />
              </div>
            </div>

            <div class="mt-4">
              <label class="block text-sm text-gray-300 mb-2">Geofence Radius (meters)</label>
              <input 
                type="number" 
                min="10"
                max="5000"
                v-model="clientForm.geofence_radius"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="100"
              />
              <p class="text-xs text-gray-400 mt-1">Area around the location where deliveries will be detected (10-5000 meters)</p>
            </div>

            <div class="mt-4">
              <button type="button" @click="getCurrentLocation"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm">
                📱 Use My Current Location
              </button>
              <p class="text-xs text-gray-400 mt-1">Get GPS coordinates from your current position</p>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm text-gray-300 mb-2">Notes</label>
            <textarea 
              v-model="clientForm.notes"
              rows="2"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="Additional notes about this client..."
            ></textarea>
          </div>

          <!-- Active Status -->
          <div class="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="is_active"
              v-model="clientForm.is_active"
              class="w-4 h-4"
            />
            <label for="is_active" class="text-sm text-gray-300">Active (available for geofencing)</label>
          </div>

          <!-- Form Actions -->
          <div class="flex gap-3 pt-6 border-t border-gray-600">
            <button 
              type="submit" 
              :disabled="saving"
              class="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
            >
              {{ saving ? 'Saving...' : (showAddModal ? '➕ Add Client' : '💾 Save Changes') }}
            </button>
            <button 
              type="button" 
              @click="closeModal"
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

// State
const loading = ref(false)
const saving = ref(false)
const clients = ref([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingClient = ref(null)
const filter = ref('all')
const searchTerm = ref('')

// Form state
const clientForm = ref({
  name: '',
  address: '',
  phone: '',
  email: '',
  location_lat: null,
  location_lng: null,
  geofence_radius: 100,
  notes: '',
  is_active: true
})

// Computed
const stats = computed(() => {
  const total = clients.value.length
  const active = clients.value.filter(c => c.is_active).length
  const withLocation = clients.value.filter(c => c.location_lat && c.location_lng).length
  const needLocation = clients.value.filter(c => c.is_active && (!c.location_lat || !c.location_lng)).length
  
  return { total, active, withLocation, needLocation }
})

const filteredClients = computed(() => {
  let filtered = clients.value

  // Apply status filter
  if (filter.value === 'active') {
    filtered = filtered.filter(c => c.is_active)
  } else if (filter.value === 'no-location') {
    filtered = filtered.filter(c => !c.location_lat || !c.location_lng)
  } else if (filter.value === 'with-location') {
    filtered = filtered.filter(c => c.location_lat && c.location_lng)
  }

  // Apply search term
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(term) ||
      (c.address && c.address.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term))
    )
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

// Methods
const refreshClients = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')

    if (error) throw error
    clients.value = data || []
  } catch (error) {
    console.error('Error fetching clients:', error)
    alert('Failed to fetch clients')
  } finally {
    loading.value = false
  }
}

const editClient = (client) => {
  editingClient.value = client
  clientForm.value = { ...client }
  showEditModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingClient.value = null
  resetForm()
}

const resetForm = () => {
  clientForm.value = {
    name: '',
    address: '',
    phone: '',
    email: '',
    location_lat: null,
    location_lng: null,
    geofence_radius: 100,
    notes: '',
    is_active: true
  }
}

const submitClientForm = async () => {
  saving.value = true
  try {
    const clientData = { ...clientForm.value }
    
    // Convert empty strings to null for lat/lng
    if (clientData.location_lat === '') clientData.location_lat = null
    if (clientData.location_lng === '') clientData.location_lng = null

    if (showAddModal.value) {
      const { error } = await supabase
        .from('clients')
        .insert(clientData)

      if (error) throw error
      alert('✅ Client added successfully!')
    } else {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', editingClient.value.id)

      if (error) throw error
      alert('✅ Client updated successfully!')
    }

    closeModal()
    refreshClients()
  } catch (error) {
    console.error('Error saving client:', error)
    alert(`❌ Error saving client: ${error.message}`)
  } finally {
    saving.value = false
  }
}

const toggleClientStatus = async (client) => {
  const newStatus = !client.is_active
  const action = newStatus ? 'activate' : 'deactivate'
  
  if (!confirm(`Are you sure you want to ${action} "${client.name}"?`)) return

  try {
    const { error } = await supabase
      .from('clients')
      .update({ is_active: newStatus })
      .eq('id', client.id)

    if (error) throw error
    
    client.is_active = newStatus
    alert(`✅ Client ${action}d successfully!`)
  } catch (error) {
    console.error('Error updating client status:', error)
    alert(`❌ Error updating client: ${error.message}`)
  }
}

const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert('❌ Geolocation is not supported by this browser')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      clientForm.value.location_lat = position.coords.latitude
      clientForm.value.location_lng = position.coords.longitude
      alert(`✅ Location captured!\nAccuracy: ±${Math.round(position.coords.accuracy)}m`)
    },
    (error) => {
      console.error('Error getting location:', error)
      alert('❌ Error getting location. Please enable GPS and try again.')
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    }
  )
}

const viewOnMap = (client) => {
  const url = `https://www.google.com/maps?q=${client.location_lat},${client.location_lng}`
  window.open(url, '_blank')
}

// Initialize
onMounted(() => {
  refreshClients()
})
</script> 
