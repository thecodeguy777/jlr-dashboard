<template>
    <div class="p-6 space-y-4">
        <h1 class="text-xl font-bold">📦 Bodega Stock</h1>

        <StockEditorCard :entries="bodegaEntries" @update="handleUpdate" />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import StockEditorCard from '@/components/StockEditorCard.vue'

// Current week start (e.g., latest Sunday)
const weekStart = getWeekStart(new Date())

const bodegaEntries = ref([])

async function loadBodegaStock() {
    const { data, error } = await supabase
        .from('bodega_stock')
        .select(`
        id,
        worker_id,
        product_id,
        quantity,
        week_start,
        workers ( id, name ),
        products ( id, name, price )
      `)
        .eq('week_start', weekStart)

    if (error) {
        console.error('Error loading bodega stock:', error)
        return
    }

    // Flatten structure for display
    bodegaEntries.value = data.map(entry => ({
        id: entry.id,
        worker: {
            id: entry.worker_id,
            name: entry.workers?.name || 'Unknown'
        },
        product: {
            id: entry.product_id,
            name: entry.products?.name || 'Unknown',
            price: entry.products?.price || 0
        },
        quantity: entry.quantity,
        week_start: entry.week_start
    }))
}

onMounted(loadBodegaStock)

async function handleUpdate(updatedList) {
    const toUpdate = updatedList.filter(e => e.id && e.quantity >= 0)
    const toInsert = updatedList.filter(e => !e.id && e.quantity > 0)

    for (const entry of toUpdate) {
        await supabase
            .from('bodega_stock')
            .update({ quantity: entry.quantity })
            .eq('id', entry.id)
    }

    for (const entry of toInsert) {
        await supabase.from('bodega_stock').insert({
            worker_id: entry.worker.id,
            product_id: entry.product.id, // ideally selected from dropdown
            quantity: entry.quantity,
            week_start: weekStart
        })
    }

    await loadBodegaStock() // Refresh the view
}

// Utility
function getWeekStart(date) {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d.toISOString().slice(0, 10)
}
</script>
