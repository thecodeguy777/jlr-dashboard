<script setup>
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
//import { useToast } from '@/composables/useToast'

const subconId = ref('')
const productId = ref('')
const quantity = ref(0)
const pickupDate = ref(new Date().toISOString().split('T')[0])
const deliveryDate = ref('')
const isSubmitting = ref(false)

//const toast = useToast()

const isSameDay = computed(() => pickupDate.value && deliveryDate.value && pickupDate.value === deliveryDate.value)

async function submitDelivery() {
    isSubmitting.value = true

    const baseEntry = {
        subcon_id: subconId.value,
        product_id: productId.value,
        quantity: quantity.value,
        pickup_date: pickupDate.value,
        delivery_date: deliveryDate.value || null,
        created_at: new Date().toISOString(),
    }

    try {
        if (deliveryDate.value && isSameDay.value) {
            // Direct delivery, no stock tracking
            await supabase.from('subcon_delivesries').insert([baseEntry])
        } else if (deliveryDate.value && !isSameDay.value) {
            // Stock-in then delivered next day
            await supabase.from('stocks').insert([{
                ...baseEntry,
                status: 'pending_delivery'
            }])

            await supabase.from('subcon_deliveries').insert([baseEntry])
        } else {
            // Just stock-in, not yet delivered
            await supabase.from('stocks').insert([{
                ...baseEntry,
                status: 'pending_delivery'
            }])
        }

        toast.success('Subcon delivery recorded')
        quantity.value = 0
        deliveryDate.value = ''
    } catch (e) {
        console.error(e)
        toast.error('Error saving delivery')
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="space-y-4 bg-white/5 p-6 rounded-xl">
        <h2 class="text-xl text-white font-bold">Log Subcontractor Delivery</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="text-white text-sm">Subcontractor</label>
                <input v-model="subconId" class="w-full bg-gray-800 text-white p-2 rounded" />
            </div>
            <div>
                <label class="text-white text-sm">Product</label>
                <input v-model="productId" class="w-full bg-gray-800 text-white p-2 rounded" />
            </div>
            <div>
                <label class="text-white text-sm">Quantity</label>
                <input type="number" v-model="quantity" class="w-full bg-gray-800 text-white p-2 rounded" />
            </div>
            <div>
                <label class="text-white text-sm">Pickup Date</label>
                <input type="date" v-model="pickupDate" class="w-full bg-gray-800 text-white p-2 rounded" />
            </div>
            <div>
                <label class="text-white text-sm">Delivery Date (optional)</label>
                <input type="date" v-model="deliveryDate" class="w-full bg-gray-800 text-white p-2 rounded" />
            </div>
        </div>
        <button @click="submitDelivery" :disabled="isSubmitting"
            class="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            {{ isSubmitting ? 'Saving...' : 'Save Delivery' }}
        </button>
    </div>
</template>
