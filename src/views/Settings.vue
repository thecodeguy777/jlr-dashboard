<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const products = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const showSuccessMessage = ref(false)
const selectedCategory = ref('all')
const searchQuery = ref('')

// Fetch all products
async function fetchProducts() {
    isLoading.value = true
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('category')
        .order('name')

    if (error) {
        console.error('Error fetching products:', error)
        return
    }

    products.value = data.map(product => ({
        ...product,
        newPrice: product.price_per_unit,
        newSubconPrice: product.subcon_price,
        isEditing: false,
        percentageChange: 0
    }))
    isLoading.value = false
}

// Update a single product's price
async function updateProductPrice(product) {
    isSaving.value = true
    const { error } = await supabase
        .from('products')
        .update({
            price_per_unit: product.newPrice,
            subcon_price: product.newSubconPrice
        })
        .eq('id', product.id)

    if (error) {
        console.error('Error updating product:', error)
        return false
    }

    product.price_per_unit = product.newPrice
    product.subcon_price = product.newSubconPrice
    product.isEditing = false
    isSaving.value = false
    showSuccessMessage.value = true
    setTimeout(() => {
        showSuccessMessage.value = false
    }, 3000)
    return true
}

// Apply percentage change to a product
function applyPercentageChange(product) {
    if (product.percentageChange) {
        product.newPrice = Math.round(product.price_per_unit * (1 + product.percentageChange / 100))
        product.newSubconPrice = Math.round(product.subcon_price * (1 + product.percentageChange / 100))
    }
}

// Bulk update prices for filtered products
async function bulkUpdatePrices() {
    isSaving.value = true
    const updates = filteredProducts.value
        .filter(p => p.isEditing)
        .map(product => ({
            id: product.id,
            price_per_unit: product.newPrice,
            subcon_price: product.newSubconPrice
        }))

    if (updates.length === 0) {
        isSaving.value = false
        return
    }

    for (const update of updates) {
        const { error } = await supabase
            .from('products')
            .update({
                price_per_unit: update.price_per_unit,
                subcon_price: update.subcon_price
            })
            .eq('id', update.id)

        if (error) {
            console.error('Error in bulk update:', error)
            isSaving.value = false
            return
        }
    }

    // Update local data
    products.value = products.value.map(product => {
        const updated = updates.find(u => u.id === product.id)
        if (updated) {
            return {
                ...product,
                price_per_unit: updated.price_per_unit,
                subcon_price: updated.subcon_price,
                newPrice: updated.price_per_unit,
                newSubconPrice: updated.subcon_price,
                isEditing: false,
                percentageChange: 0
            }
        }
        return product
    })

    isSaving.value = false
    showSuccessMessage.value = true
    setTimeout(() => {
        showSuccessMessage.value = false
    }, 3000)
}

// Filter products based on category and search query
const filteredProducts = computed(() => {
    return products.value.filter(product => {
        const matchesCategory = selectedCategory.value === 'all' || product.category === selectedCategory.value
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        return matchesCategory && matchesSearch
    })
})

// Get unique categories
const categories = computed(() => {
    const uniqueCategories = new Set(products.value.map(p => p.category))
    return Array.from(uniqueCategories).sort()
})

onMounted(() => {
    fetchProducts()
})
</script>

<template>
    <div class="px-6 pt-6 pb-24 space-y-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 class="text-2xl font-bold text-white">⚙️ Price Settings</h1>

            <!-- Success Message -->
            <div v-if="showSuccessMessage"
                class="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
                Prices updated successfully!
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p class="text-white/60 mt-4">Loading products...</p>
        </div>

        <div v-else class="space-y-6">
            <!-- Filters -->
            <div class="flex flex-col sm:flex-row gap-4 bg-white/5 p-4 rounded-xl">
                <div class="flex-1">
                    <input v-model="searchQuery" type="text" placeholder="Search products..."
                        class="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 text-white placeholder-white/40">
                </div>
                <select v-model="selectedCategory"
                    class="px-4 py-2 bg-white/10 rounded-lg border border-white/20 text-white">
                    <option value="all">All Categories</option>
                    <option v-for="category in categories" :key="category" :value="category">
                        {{ category }}
                    </option>
                </select>
            </div>

            <!-- Products Table -->
            <div class="bg-white/5 rounded-xl overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-white/10 text-white text-left">
                                <th class="px-6 py-3">Product Name</th>
                                <th class="px-6 py-3">Category</th>
                                <th class="px-6 py-3">Current Price</th>
                                <th class="px-6 py-3">New Price</th>
                                <th class="px-6 py-3">Current Subcon Price</th>
                                <th class="px-6 py-3">New Subcon Price</th>
                                <th class="px-6 py-3">% Change</th>
                                <th class="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/10">
                            <tr v-for="product in filteredProducts" :key="product.id"
                                class="text-white/80 hover:bg-white/5">
                                <td class="px-6 py-4">{{ product.name }}</td>
                                <td class="px-6 py-4">{{ product.category }}</td>
                                <td class="px-6 py-4">₱{{ product.price_per_unit }}</td>
                                <td class="px-6 py-4">
                                    <input v-if="product.isEditing" v-model="product.newPrice" type="number"
                                        class="w-24 px-2 py-1 bg-white/10 rounded border border-white/20 text-white">
                                    <span v-else>₱{{ product.newPrice }}</span>
                                </td>
                                <td class="px-6 py-4">₱{{ product.subcon_price }}</td>
                                <td class="px-6 py-4">
                                    <input v-if="product.isEditing" v-model="product.newSubconPrice" type="number"
                                        class="w-24 px-2 py-1 bg-white/10 rounded border border-white/20 text-white">
                                    <span v-else>₱{{ product.newSubconPrice }}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <div v-if="product.isEditing" class="flex items-center gap-2">
                                        <input v-model="product.percentageChange" type="number"
                                            class="w-20 px-2 py-1 bg-white/10 rounded border border-white/20 text-white"
                                            placeholder="0">
                                        <button @click="applyPercentageChange(product)"
                                            class="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded hover:bg-blue-500/30">
                                            Apply
                                        </button>
                                    </div>
                                    <span v-else>-</span>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-2">
                                        <button v-if="product.isEditing" @click="updateProductPrice(product)"
                                            :disabled="isSaving"
                                            class="bg-green-500/20 text-green-300 px-3 py-1 rounded hover:bg-green-500/30 disabled:opacity-50">
                                            Save
                                        </button>
                                        <button v-if="product.isEditing" @click="product.isEditing = false"
                                            class="bg-red-500/20 text-red-300 px-3 py-1 rounded hover:bg-red-500/30">
                                            Cancel
                                        </button>
                                        <button v-else @click="product.isEditing = true"
                                            class="bg-blue-500/20 text-blue-300 px-3 py-1 rounded hover:bg-blue-500/30">
                                            Edit
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Bulk Update Button -->
            <div class="flex justify-end">
                <button @click="bulkUpdatePrices" :disabled="isSaving || !filteredProducts.some(p => p.isEditing)"
                    class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    Update All Changes
                </button>
            </div>
        </div>
    </div>
</template>