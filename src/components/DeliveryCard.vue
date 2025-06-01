<script setup>
import { ref, toRefs, watch } from 'vue'
import { supabase } from '../lib/supabase'
// Props and Emits
const props = defineProps({
    worker: Object,
    date: String,
    products: Array,
    onRefresh: Function
})

const emit = defineEmits(['delete', 'update:deliveries', 'edit'])

const { worker, date, products } = toRefs(props)

const isEditing = ref(false)
const localDeliveries = ref([])

// Sync local copy with worker deliveries
watch(
    () => worker.value?.deliveries,
    (newVal) => {
        localDeliveries.value = JSON.parse(JSON.stringify(newVal || []))
    },
    { immediate: true }
)

// Editing
function startEditing() {
    isEditing.value = true
    localDeliveries.value.forEach(d => {
        d.editedQty = d.quantity
        d.editedProductId = d.product_id
        d.editedDate = d.delivery_date
    })
}

// Add new row
function addDeliveryRow() {
    if (!products.value.length) return

    const type = localDeliveries.value[0]?.type || 'inhouse'
    const defaultProduct = products.value[0]

    localDeliveries.value.push({
        id: `new-${Date.now()}`,
        type,
        editedQty: '',
        editedProductId: defaultProduct.id,
        editedDate: date.value,
        quantity: '',
        product: defaultProduct.name,
        delivery_date: date.value,
        isNew: true
    })
}

// Cancel editing
function cancelEditing() {
    isEditing.value = false
    localDeliveries.value = JSON.parse(JSON.stringify(worker.value?.deliveries || []))
}

// Remove item
function removeRow(index) {
    const delivery = localDeliveries.value[index]
    delivery.isNew
        ? localDeliveries.value.splice(index, 1)
        : emit('delete', delivery.id)
}

// Save
async function saveGroupEdit() {
    const updates = localDeliveries.value.map(d => {
        const table = d.type === 'subcon' ? 'subcon_deliveries' : 'deliveries'
        const product = products.value.find(p => p.id === d.editedProductId)
        const price_snapshot = d.type === 'subcon'
            ? product?.subcon_price ?? 0
            : product?.price_per_unit ?? 0

        const payload = {
            quantity: Number(d.editedQty),
            product_id: d.editedProductId,
            delivery_date: d.editedDate,
            price_snapshot
        }

        const insertPayload = {
            ...payload,
            ...(d.type === 'subcon'
                ? { subcon_id: worker.value.subcon_id ?? worker.value.id }
                : { worker_id: worker.value.worker_id ?? worker.value.id })
        }

        if (d.isNew) {
            return supabase.from(table).insert([insertPayload])
        } else {
            return supabase.from(table).update(payload).eq('id', d.id)
        }
    })

    const results = await Promise.all(updates)
    const errors = results.filter(res => res.error)
    if (errors.length > 0) {
        console.error('❌ Some insert/update failed:', errors.map(e => e.error))
        return
    }

    const updatedDeliveries = localDeliveries.value.map(d => ({
        ...d,
        quantity: d.editedQty,
        product: products.value.find(p => p.id === d.editedProductId)?.name || '',
        delivery_date: d.editedDate
    }))

    emit('update:deliveries', updatedDeliveries)
    isEditing.value = false
    if (props.onRefresh) await props.onRefresh()
}


</script>

<template>
    <div class="bg-gray-800 rounded-xl px-6 py-4 space-y-3 shadow-md">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold text-white">
                {{ worker.name }}
                <span class="ml-2 text-xs text-white/40">
                    {{ localDeliveries[0]?.type === 'subcon' ? '📦 Subcon' : '🏭 In-house' }}
                </span>
            </h3>

            <button @click="() => {
                emit('edit', worker.deliveries?.[0]?.type === 'subcon' ? worker.subcon_id || worker.id : worker.id)
                startEditing()
            }" :disabled="!products.length || !worker?.deliveries?.length"
                class="text-orange-400 hover:text-orange-300 text-lg disabled:opacity-40 disabled:cursor-not-allowed">
                ✏️
            </button>
        </div>

        <!-- Deliveries -->
        <ul class="text-white/80 space-y-2">
            <li v-for="(delivery, index) in localDeliveries" :key="delivery.id"
                class="flex items-center justify-between">
                <!-- Edit Mode -->
                <div v-if="isEditing" class="flex items-center gap-2 flex-wrap w-full">
                    <select v-model="delivery.editedProductId"
                        class="bg-gray-700 text-white text-sm rounded px-2 py-1 w-12">
                        <option v-for="p in products" :key="p.id" :value="p.id">
                            {{ p.name }}
                        </option>
                    </select>

                    <input type="number" v-model="delivery.editedQty"
                        class="bg-gray-700 text-white w-24 text-sm rounded px-2 py-1" />
                    <input type="date" v-model="delivery.editedDate"
                        class="bg-gray-700 text-white text-sm rounded px-2 py-1" />
                    <button @click="removeRow(index)" class="text-pink-400 hover:text-pink-300 text-lg">
                        ❌
                    </button>
                </div>

                <!-- Read-Only Mode -->
                <div v-else class="flex justify-between w-full items-center">
                    <span class="text-sm">{{ delivery.product }}: {{ delivery.quantity }} pcs</span>
                </div>
            </li>
        </ul>

        <!-- Add Button -->
        <div v-if="isEditing" class="flex justify-start mt-2">
            <button @click="addDeliveryRow"
                class="text-sm text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                ➕ Add Item
            </button>
        </div>

        <!-- Action Buttons -->
        <div v-if="isEditing" class="flex justify-end gap-3 pt-2">
            <button @click="saveGroupEdit" class="text-green-400 hover:text-green-300">✅ Save</button>
            <button @click="cancelEditing" class="text-white/50 hover:text-white/70">❌ Cancel</button>
        </div>
    </div>
</template>
