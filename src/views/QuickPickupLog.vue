<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

// State
const subcontractors = ref([])
const products = ref([])
const todayPickups = ref([])
const isLoading = ref(true)
const isSubmitting = ref(false)

// Form state
const selectedSubconId = ref('')
const pickupEntries = ref([{ product_id: '', quantity: 1 }])
const notes = ref('')

// Add new state for edit mode
const isEditMode = ref(false)
const editingPickup = ref(null)

// Modify form state to handle batch entries
const formState = ref({
    subcon_id: '',
    entries: [{ product_id: '', quantity: 1 }],
    notes: ''
})

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0]

// Modify visibility states to use a single activeSection
const activeSection = ref(null) // Can be 'summary', 'form', or 'history'
const isCompactView = ref(false)

// Helper function to toggle sections
const toggleSection = (section) => {
    activeSection.value = activeSection.value === section ? null : section
}

// Computed properties
const todayTotal = computed(() => {
    return todayPickups.value.reduce((sum, pickup) => sum + (pickup.quantity || 0), 0)
})

const groupedPickups = computed(() => {
    const grouped = {}
    todayPickups.value.forEach(pickup => {
        const subconName = pickup.subcontractors?.name || 'Unknown'
        if (!grouped[subconName]) {
            grouped[subconName] = []
        }
        grouped[subconName].push(pickup)
    })
    return grouped
})

// Add new computed property for product categories
const productCategories = computed(() => {
    const categories = {}
    todayPickups.value.forEach(pickup => {
        const product = pickup.products
        if (!product) return

        const category = product.category || 'Uncategorized'
        if (!categories[category]) {
            categories[category] = []
        }

        // Find existing product entry or create new one
        const existingProduct = categories[category].find(p => p.name === product.name)
        if (existingProduct) {
            existingProduct.quantity += pickup.quantity
        } else {
            categories[category].push({
                name: product.name,
                unit: product.unit,
                quantity: pickup.quantity
            })
        }
    })
    return categories
})

const totalQuantity = computed(() => {
    return todayPickups.value.reduce((sum, pickup) => sum + (pickup.quantity || 0), 0)
})

// Methods
const fetchOptions = async () => {
    try {
        const [productRes, subconRes] = await Promise.all([
            supabase.from('products').select('id, name, category, unit, subcon_price').order('name'),
            supabase.from('subcontractors').select('id, name').order('name')
        ])

        if (productRes.error) throw productRes.error
        if (subconRes.error) throw subconRes.error

        products.value = productRes.data || []
        subcontractors.value = subconRes.data || []
    } catch (error) {
        console.error('Error fetching options:', error)
        alert('Failed to load form data. Please refresh the page.')
    }
}

const fetchTodayPickups = async () => {
    try {
        const { data, error } = await supabase
            .from('subcon_deliveries')
            .select('*, products(*), subcontractors(*)')
            .eq('pickup_date', today)
            .order('created_at', { ascending: false })

        if (error) throw error
        todayPickups.value = data || []
    } catch (error) {
        console.error('Error fetching today\'s pickups:', error)
        alert('Failed to load today\'s pickups. Please refresh the page.')
    } finally {
        isLoading.value = false
    }
}

const addProductEntry = () => {
    formState.value.entries.push({ product_id: '', quantity: 1 })
}

const removeProductEntry = (index) => {
    if (formState.value.entries.length > 1) {
        formState.value.entries.splice(index, 1)
    }
}

// Helper function to reset form
const resetForm = () => {
    formState.value = {
        subcon_id: '',
        entries: [{ product_id: '', quantity: 1 }],
        notes: ''
    }
    isEditMode.value = false
    editingPickup.value = null
}

// Handle edit pickup
const handleEdit = async (pickup) => {
    try {
        // Fetch all pickups from the same subcontractor on the same date
        const { data: relatedPickups, error } = await supabase
            .from('subcon_deliveries')
            .select('*')
            .eq('subcon_id', pickup.subcon_id)
            .eq('pickup_date', pickup.pickup_date)
            .order('created_at')

        if (error) throw error

        isEditMode.value = true
        editingPickup.value = {
            subcon_id: pickup.subcon_id,
            pickup_date: pickup.pickup_date,
            entries: relatedPickups.map(p => ({
                id: p.id,
                product_id: p.product_id,
                quantity: p.quantity
            }))
        }

        formState.value = {
            subcon_id: pickup.subcon_id,
            entries: relatedPickups.map(p => ({
                id: p.id,
                product_id: p.product_id,
                quantity: p.quantity
            })),
            notes: pickup.notes || ''
        }
        activeSection.value = 'form'
    } catch (error) {
        console.error('Error fetching related pickups:', error)
        alert('Failed to load related pickups for editing. Please try again.')
    }
}

// Handle delete pickup
const handleDelete = async (pickup) => {
    if (!confirm('Are you sure you want to delete this pickup?')) return

    try {
        const { error } = await supabase
            .from('subcon_deliveries')
            .delete()
            .eq('id', pickup.id)

        if (error) throw error

        await fetchTodayPickups()
    } catch (error) {
        console.error('Error deleting pickup:', error)
        alert('Failed to delete pickup. Please try again.')
    }
}

// Handle delete all pickups for a subcontractor
const handleDeleteAll = async (pickups) => {
    if (!confirm(`Are you sure you want to delete all ${pickups.length} entries for ${pickups[0].subcontractors.name}?`)) return

    try {
        const ids = pickups.map(p => p.id)
        const { error } = await supabase
            .from('subcon_deliveries')
            .delete()
            .in('id', ids)

        if (error) throw error

        await fetchTodayPickups()
        alert('All entries deleted successfully!')
    } catch (error) {
        console.error('Error deleting pickups:', error)
        alert('Failed to delete entries. Please try again.')
    }
}

// Modify handleSubmit to handle batch edit
const handleSubmit = async () => {
    if (!formState.value.subcon_id) {
        alert('Please select a subcontractor')
        return
    }

    // Validate all entries
    const invalidEntries = formState.value.entries.filter(
        entry => !entry.product_id || entry.quantity < 1
    )
    if (invalidEntries.length > 0) {
        alert('Please fill in all fields with valid values')
        return
    }

    isSubmitting.value = true

    try {
        if (isEditMode.value && editingPickup.value) {
            // Get the list of IDs to delete (entries that were removed)
            const currentIds = new Set(formState.value.entries.map(e => e.id).filter(Boolean))
            const originalIds = new Set(editingPickup.value.entries.map(e => e.id))
            const idsToDelete = [...originalIds].filter(id => !currentIds.has(id))

            // Delete removed entries
            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('subcon_deliveries')
                    .delete()
                    .in('id', idsToDelete)
                if (deleteError) throw deleteError
            }

            // Update existing entries and insert new ones
            for (const entry of formState.value.entries) {
                const product = products.value.find(p => p.id === entry.product_id)
                const price_snapshot = product?.subcon_price || 0

                const payload = {
                    subcon_id: formState.value.subcon_id,
                    product_id: entry.product_id,
                    quantity: entry.quantity,
                    pickup_date: editingPickup.value.pickup_date,
                    delivery_date: editingPickup.value.pickup_date,
                    price_snapshot,
                    notes: formState.value.notes || '',
                }

                if (entry.id) {
                    // Update existing entry
                    const { error: updateError } = await supabase
                        .from('subcon_deliveries')
                        .update(payload)
                        .eq('id', entry.id)
                    if (updateError) throw updateError
                } else {
                    // Insert new entry
                    const { error: insertError } = await supabase
                        .from('subcon_deliveries')
                        .insert([{ ...payload, created_at: new Date().toISOString() }])
                    if (insertError) throw insertError
                }
            }
        } else {
            // Create new pickups (existing code)
            const entries = formState.value.entries.map(entry => {
                const product = products.value.find(p => p.id === entry.product_id)
                const price_snapshot = product?.subcon_price || 0

                return {
                    subcon_id: formState.value.subcon_id,
                    product_id: entry.product_id,
                    quantity: entry.quantity,
                    pickup_date: today,
                    delivery_date: today,
                    price_snapshot,
                    notes: formState.value.notes || '',
                    created_at: new Date().toISOString()
                }
            })

            const { error: insertError } = await supabase
                .from('subcon_deliveries')
                .insert(entries)
            if (insertError) throw insertError
        }

        // Reset form and refresh data
        resetForm()
        await fetchTodayPickups()
        activeSection.value = 'history'

        alert(isEditMode.value ? 'Pickups updated successfully!' : 'Pickups recorded successfully!')
    } catch (error) {
        console.error('Error saving pickups:', error)
        alert('Failed to save pickups. Please try again.')
    } finally {
        isSubmitting.value = false
    }
}

// Initialize
onMounted(() => {
    fetchOptions()
    fetchTodayPickups()
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 text-white">
        <!-- Summary Card -->
        <Transition name="fade">
            <div v-if="!isLoading"
                class="bg-gray-800/95 border-b border-gray-700 backdrop-blur-md sticky top-0 z-10 shadow-xl transition-all duration-300">
                <div class="max-w-3xl mx-auto">
                    <!-- Summary Header -->
                    <div class="p-4 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl hover-transition hover:rotate-12">🚚</span>
                            <h1 class="text-xl font-bold">Pickup Summary</h1>
                        </div>
                        <div class="flex items-center gap-4">
                            <button @click="isCompactView = !isCompactView"
                                class="text-sm px-3 py-1 rounded-full bg-gray-700 hover:bg-gray-600 hover-transition"
                                v-if="activeSection === 'summary'">
                                {{ isCompactView ? 'Show Details' : 'Compact View' }}
                            </button>
                            <button @click="toggleSection('summary')"
                                class="text-sm hover-transition flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700"
                                :class="{ 'bg-gray-700': activeSection === 'summary' }">
                                <span :class="{ 'rotate-180': activeSection !== 'summary' }">▼</span>
                                <span class="text-xs text-gray-400">Click to {{ activeSection === 'summary' ? 'hide' :
                                    'show' }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Summary Content -->
                    <Transition name="slide">
                        <div v-show="activeSection === 'summary'" class="border-t border-gray-700">
                            <!-- Compact View -->
                            <div v-if="isCompactView" class="p-4">
                                <div class="flex flex-wrap gap-4">
                                    <div v-for="(products, category) in productCategories" :key="category"
                                        class="flex items-center gap-2 bg-gray-900/50 rounded-full px-4 py-2">
                                        <span class="text-gray-400">{{ category }}:</span>
                                        <span class="font-bold text-green-400">
                                            {{products.reduce((sum, p) => sum + p.quantity, 0).toLocaleString()}}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-2 bg-orange-600/20 rounded-full px-4 py-2">
                                        <span class="text-gray-300">Total:</span>
                                        <span class="font-bold text-orange-400">{{ totalQuantity.toLocaleString()
                                            }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Detailed View -->
                            <div v-else class="p-4 space-y-4">
                                <div v-for="(products, category) in productCategories" :key="category"
                                    class="bg-gray-900/50 rounded-xl p-4 border border-gray-700 hover-card">
                                    <h3 class="text-lg font-medium text-gray-300 mb-3">{{ category }}</h3>
                                    <div class="space-y-2">
                                        <div v-for="product in products" :key="product.name"
                                            class="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                                            <div>
                                                <div class="font-medium">{{ product.name }}</div>
                                                <div class="text-sm text-gray-500">{{ product.unit }}</div>
                                            </div>
                                            <div class="text-xl font-bold text-green-400">
                                                {{ product.quantity.toLocaleString() }}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="mt-6 pt-4 border-t border-gray-700">
                                    <div class="flex justify-between items-center">
                                        <span class="text-lg text-gray-300">Total Items</span>
                                        <span class="text-2xl font-bold text-green-400">{{
                                            totalQuantity.toLocaleString() }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>
        </Transition>

        <div class="max-w-3xl mx-auto p-4 space-y-6">
            <Transition name="fade" mode="out-in">
                <div v-if="isLoading" class="text-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                    <p class="mt-4 text-gray-400">Loading...</p>
                </div>

                <div v-else class="space-y-6">
                    <!-- Form Section -->
                    <div class="bg-gray-800 rounded-xl overflow-hidden hover-card">
                        <button @click="toggleSection('form')"
                            class="w-full p-4 text-left bg-gray-700 flex justify-between items-center hover-transition hover:bg-gray-600"
                            :class="{ 'bg-orange-600/20': activeSection === 'form' }">
                            <div class="flex items-center gap-3">
                                <span class="text-xl">{{ isEditMode ? '✏️' : '📝' }}</span>
                                <div>
                                    <span class="font-medium">{{ isEditMode ? 'Edit Pickup' : 'Add New Pickup' }}</span>
                                    <p class="text-sm text-gray-400">
                                        {{ isEditMode ? 'Modify existing pickup record' : 'Record a new pickup' }}
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button v-if="isEditMode" @click.stop="resetForm"
                                    class="text-xs px-2 py-1 rounded bg-gray-600 hover:bg-gray-500">
                                    Cancel Edit
                                </button>
                                <span class="transition-transform duration-300"
                                    :class="{ 'rotate-180': activeSection !== 'form' }">▼</span>
                            </div>
                        </button>

                        <Transition name="slide">
                            <form v-show="activeSection === 'form'" @submit.prevent="handleSubmit"
                                class="p-4 space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Subcontractor</label>
                                    <select v-model="formState.subcon_id"
                                        class="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-orange-500 hover-transition hover:border-gray-500"
                                        required>
                                        <option value="">Select subcontractor</option>
                                        <option v-for="s in subcontractors" :key="s.id" :value="s.id">{{ s.name }}
                                        </option>
                                    </select>
                                </div>

                                <!-- Product Entries -->
                                <div class="space-y-4">
                                    <div v-for="(entry, index) in formState.entries" :key="index"
                                        class="bg-gray-700/50 rounded-lg p-4 relative">
                                        <!-- Remove Entry Button -->
                                        <button v-if="formState.entries.length > 1" @click="removeProductEntry(index)"
                                            type="button"
                                            class="absolute top-2 right-2 text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-red-400/10"
                                            title="Remove entry">❌</button>

                                        <div class="space-y-4">
                                            <div>
                                                <label
                                                    class="block text-sm font-medium text-gray-300 mb-2">Product</label>
                                                <select v-model="entry.product_id"
                                                    class="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-orange-500 hover-transition hover:border-gray-500"
                                                    required>
                                                    <option value="">Select product</option>
                                                    <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}
                                                        ({{ p.unit }})</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label
                                                    class="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                                                <input type="number" v-model.number="entry.quantity" min="1"
                                                    class="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-orange-500 hover-transition hover:border-gray-500"
                                                    required />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Add Entry Button -->
                                    <button type="button" @click="addProductEntry"
                                        class="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover-transition">
                                        <span>➕</span> Add Another Product
                                    </button>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
                                    <textarea v-model="formState.notes" rows="2"
                                        class="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 resize-none hover-transition hover:border-gray-500"
                                        placeholder="Any additional notes..."></textarea>
                                </div>

                                <button type="submit" :disabled="isSubmitting"
                                    class="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50 text-lg scale-button">{{
                                        isSubmitting ? 'Saving...' : (isEditMode ? 'Update Pickup' : 'Record All Pickups')
                                    }}</button>
                            </form>
                        </Transition>
                    </div>

                    <!-- Recent Pickups Section -->
                    <div class="bg-gray-800 rounded-xl overflow-hidden hover-card">
                        <button @click="toggleSection('history')"
                            class="w-full p-4 text-left bg-gray-700 flex justify-between items-center hover-transition hover:bg-gray-600"
                            :class="{ 'bg-orange-600/20': activeSection === 'history' }">
                            <div class="flex items-center gap-3">
                                <span class="text-xl">📋</span>
                                <div>
                                    <span class="font-medium">Recent Pickups</span>
                                    <p class="text-sm text-gray-400">View and manage today's pickup records</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-gray-400">{{ activeSection === 'history' ? 'Click to hide' :
                                    'Click to show' }}</span>
                                <span class="transition-transform duration-300"
                                    :class="{ 'rotate-180': activeSection !== 'history' }">▼</span>
                            </div>
                        </button>

                        <Transition name="slide">
                            <div v-show="activeSection === 'history'" class="p-4 space-y-4">
                                <!-- Empty State -->
                                <div v-if="!Object.keys(groupedPickups).length" class="text-center py-8 text-gray-400">
                                    <p class="text-xl mb-2">No pickups recorded today</p>
                                    <p class="text-sm">Click "Add New Pickup" above to start recording</p>
                                </div>

                                <!-- Pickup History -->
                                <TransitionGroup v-else name="fade" tag="div" class="space-y-4">
                                    <div v-for="(pickups, subconName) in groupedPickups" :key="subconName"
                                        class="bg-gray-700/50 rounded-lg p-4 hover-card">
                                        <div class="flex justify-between items-start mb-4">
                                            <h3 class="font-medium text-lg">{{ subconName }}</h3>
                                            <div class="flex gap-2">
                                                <button @click="handleEdit(pickups[0])"
                                                    class="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                                                    title="Edit all entries">
                                                    ✏️ Edit All
                                                </button>
                                                <button @click="handleDeleteAll(pickups)"
                                                    class="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    title="Delete all entries">
                                                    🗑️ Delete All
                                                </button>
                                            </div>
                                        </div>
                                        <div class="space-y-3">
                                            <div v-for="pickup in pickups" :key="pickup.id"
                                                class="flex items-center justify-between py-2 border-b border-gray-600 last:border-0">
                                                <div>
                                                    <div class="font-medium text-gray-300">
                                                        {{ pickup.products?.name }} ({{ pickup.products?.unit }})
                                                    </div>
                                                    <div class="text-sm text-gray-400">{{ pickup.quantity }} pcs</div>
                                                    <div v-if="pickup.notes" class="text-xs text-gray-500 mt-1">
                                                        Note: {{ pickup.notes }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TransitionGroup>
                            </div>
                        </Transition>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<style scoped>
/* Base transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Slide transitions for collapsible sections */
.slide-enter-active,
.slide-leave-active {
    transition: all 0.3s ease-out;
    max-height: 1000px;
    /* Adjust based on content */
    overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
}

/* Hover transitions */
.hover-transition {
    transition: all 0.2s ease;
}

/* Scale transition for buttons */
.scale-button {
    transition: transform 0.2s ease, background-color 0.2s ease;
}

.scale-button:hover:not(:disabled) {
    transform: scale(1.02);
}

.scale-button:active:not(:disabled) {
    transform: scale(0.98);
}

/* Card hover effects */
.hover-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}
</style>