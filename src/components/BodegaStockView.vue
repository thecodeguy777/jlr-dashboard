<template>
    <div class="space-y-6">
        <!-- Category Totals -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div class="bg-white/5 p-4 rounded-xl shadow">
                <h2 class="text-sm font-medium text-white/70">Single Wall Total</h2>
                <p class="text-3xl font-bold text-green-400 mt-2">{{ singleWallTotal }} pcs</p>
                <p class="text-xs text-white/40 mt-1">From today's stock</p>
            </div>
            <div class="bg-white/5 p-4 rounded-xl shadow">
                <h2 class="text-sm font-medium text-white/70">Double Wall Total</h2>
                <p class="text-3xl font-bold text-blue-400 mt-2">{{ doubleWallTotal }} pcs</p>
                <p class="text-xs text-white/40 mt-1">From today's stock</p>
            </div>
        </div>

        <div class="flex flex-wrap items-end gap-4">
            <div>
                <label class="block text-white/70 text-sm mb-1">Week Start</label>
                <input type="date" v-model="selectedDate"
                    class="bg-gray-800 text-white p-2 rounded border border-white/10" />
            </div>
            <div>
                <button @click="addNewWorkerGroup"
                    class="mt-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                    + Add Bodega Stock
                </button>
            </div>
        </div>
        <div v-if="loading" class="text-white/40 text-sm italic">Loading data...</div>

        <div v-if="groupedKeys.length" class="space-y-4">
            <div v-for="name in groupedKeys" :key="name"
                class="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 shadow relative">
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-white font-semibold text-base">{{ name }}</h2>
                    <button class="text-white/40 hover:text-green-400" @click="toggleEdit(name)">
                        <Pencil class="w-4 h-4" />
                    </button>
                </div>

                <div class="space-y-1">
                    <template v-if="grouped[name].length">
                        <div v-for="entry in grouped[name]" :key="entry.id"
                            class="text-sm text-white flex justify-between items-center">
                            <div>
                                📦 {{ entry.product.name }}
                                <template v-if="editingWorker === name">
                                    —
                                    <input type="number" v-model.number="editBuffer[entry.id]"
                                        class="w-16 p-1 bg-gray-700 text-white rounded text-sm ml-1" />
                                    pcs
                                </template>
                                <template v-else>
                                    — <span class="font-bold">{{ entry.quantity }}</span> pcs
                                </template>
                            </div>
                            <div class="text-green-400 flex items-center gap-2">
                                ₱{{ getSubtotal(entry).toFixed(0) }}
                                <button v-if="editingWorker === name" @click="deleteItem(entry.id)"
                                    class="text-red-400 hover:text-red-300 text-xs" title="Remove item">
                                    ➖
                                </button>
                            </div>
                        </div>
                    </template>
                    <p v-else class="text-white/40 italic text-sm">No products added yet.</p>
                </div>

                <div v-if="editingWorker === name" class="flex justify-between items-center mt-4">
                    <div class="text-sm text-white font-semibold">
                        💰 Total: ₱{{ getWorkerTotal(name) }}
                    </div>
                    <div class="flex gap-3">
                        <button @click="saveWorkerEdit(name)" class="text-green-400 hover:underline text-sm">
                            ✅ Save
                        </button>
                        <button @click="deleteWorker(name)" class="text-red-400 hover:underline text-sm">
                            🗑 Delete All
                        </button>
                    </div>
                </div>

                <div v-if="editingWorker === name" class="mt-4 space-y-2">
                    <button @click="showAddItem[name] = true" class="text-green-400 hover:underline text-sm">
                        + Add Item
                    </button>
                    <div v-if="showAddItem[name]" class="flex gap-2 pt-2">
                        <select v-model="newItemBuffer[name].productId"
                            class="bg-gray-700 text-white rounded p-1 text-sm w-1/2">
                            <option disabled value="">Select a product</option>
                            <option v-for="p in products" :key="p.id" :value="p.id">
                                {{ p.name }} (₱{{ p.price }})
                            </option>
                        </select>
                        <input v-model.number="newItemBuffer[name].quantity" type="number" placeholder="Qty"
                            class="bg-gray-700 text-white rounded p-1 text-sm w-20" />
                        <button @click="addNewItem(name)" class="text-green-400 hover:underline text-sm">Add</button>
                    </div>
                </div>
            </div>
        </div>

        <p v-else class="text-white/50 text-sm italic">No data available.</p>
    </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Pencil } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'

const products = ref([])
const workers = ref([])
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const editingWorker = ref(null)
const editBuffer = ref({})
const newItemBuffer = ref({})
const showAddItem = ref({})
const bodegaStock = ref([])
const loading = ref(false)
const singleWallTotal = computed(() => {
    return bodegaStock.value
        .filter(e => e.product?.category === 'Single Walled')
        .reduce((sum, e) => sum + (e.quantity || 0), 0)
})

const doubleWallTotal = computed(() => {
    return bodegaStock.value
        .filter(e => e.product?.category === 'Double Walled')
        .reduce((sum, e) => sum + (e.quantity || 0), 0)
})


async function fetchStock(date) {
    loading.value = true
    const { data: stock, error } = await supabase
        .from('bodega_stock')
        .select('*')
        .eq('week_start', date)

    if (error) {
        console.error('❌ Failed to fetch stock:', error)
        loading.value = false
        return
    }

    bodegaStock.value = (stock || []).map(entry => {
        const worker = workers.value.find(w => w.id === entry.worker_id)
        const product = products.value.find(p => p.id === entry.product_id)
        return {
            ...entry,
            worker,
            product
        }
    })
    loading.value = false
}

onMounted(async () => {
    const [{ data: prods }, { data: staff }] = await Promise.all([
        supabase.from('products').select('id, name, price_per_unit, category'),
        supabase.from('workers').select('id, name')
    ])

    products.value = prods || []
    workers.value = staff || []
    await fetchStock(selectedDate.value)
})

watch(selectedDate, async (newDate) => {
    await fetchStock(newDate)
})

function addNewWorkerGroup() {
    const name = prompt('Enter worker name:')
    if (!name) return

    const existing = workers.value.find(w => w.name.toLowerCase() === name.toLowerCase())
    if (!existing) {
        alert('Invalid name: this worker does not exist.')
        return
    }

    editingWorker.value = existing.name
    newItemBuffer.value[existing.name] = { productId: '', quantity: 0 }
    showAddItem.value[existing.name] = false

    bodegaStock.value.push({
        id: `group-${Date.now()}`,
        worker: existing,
        _groupOnly: true
    })
}

function toggleEdit(name) {
    editingWorker.value = name
    editBuffer.value = {}
    grouped.value[name]?.forEach(entry => {
        editBuffer.value[entry.id] = entry.quantity
    })
    newItemBuffer.value[name] = { productId: '', quantity: 0 }
    showAddItem.value[name] = false
}

async function saveWorkerEdit(name) {
    const updates = [];

    for (const entry of bodegaStock.value) {
        if (entry.worker.name === name && editBuffer.value[entry.id] != null && !entry._groupOnly) {
            const newQty = editBuffer.value[entry.id];
            if (newQty !== entry.quantity) {
                updates.push({ id: entry.id, quantity: newQty });
            }
        }
    }

    for (const update of updates) {
        const { error } = await supabase
            .from('bodega_stock')
            .update({ quantity: update.quantity })
            .eq('id', update.id);
        if (error) {
            console.error(`❌ Failed to update item ${update.id}:`, error);
        }
    }

    bodegaStock.value = bodegaStock.value.map(entry => {
        if (entry.worker.name === name && editBuffer.value[entry.id] != null) {
            return { ...entry, quantity: editBuffer.value[entry.id] };
        }
        return entry;
    });

    editingWorker.value = null;
    editBuffer.value = {};
}


async function deleteWorker(name) {
    const entriesToDelete = bodegaStock.value.filter(
        entry => entry.worker.name === name && !entry._groupOnly
    );

    const ids = entriesToDelete.map(entry => entry.id);

    if (ids.length === 0) return;

    const { error } = await supabase
        .from('bodega_stock')
        .delete()
        .in('id', ids);

    if (error) {
        console.error('❌ Failed to delete worker items:', error);
        return;
    }

    bodegaStock.value = bodegaStock.value.filter(entry => entry.worker.name !== name);
    editingWorker.value = null;
}


async function deleteItem(id) {
    const { error } = await supabase.from('bodega_stock').delete().eq('id', id);
    if (error) {
        console.error(`❌ Failed to delete item ${id}:`, error);
        return;
    }
    bodegaStock.value = bodegaStock.value.filter(entry => entry.id !== id);
    delete editBuffer.value[id];
}


function addNewItem(name) {
    const buffer = newItemBuffer.value[name]
    if (!buffer?.productId || !buffer?.quantity) return

    const product = products.value.find(p => p.id === buffer.productId)
    const worker = workers.value.find(w => w.name === name)
    if (!product || !worker) return

    const payload = {
        worker_id: worker.id,
        product_id: product.id,
        quantity: buffer.quantity,
        week_start: selectedDate.value,
        price_snapshot: product.price_per_unit,
        remarks: ''
    }

    supabase.from('bodega_stock').insert(payload).select('*').single().then(({ data, error }) => {
        if (!error && data) {
            bodegaStock.value.push({
                ...data,
                worker,
                product
            })
            editBuffer.value[data.id] = data.quantity
        } else {
            console.error('Insert failed:', error)
        }
    })

    newItemBuffer.value[name] = { productId: '', quantity: 0 }
    showAddItem.value[name] = false
}

function getSubtotal(entry) {
    const qty = editingWorker.value === entry.worker.name
        ? editBuffer.value[entry.id] ?? entry.quantity
        : entry.quantity
    return qty * ((entry.price_snapshot ?? entry.product.price_per_unit) || 0)
}

function getWorkerTotal(name) {
    return grouped.value[name].reduce((sum, entry) => {
        const qty = editingWorker.value === name
            ? editBuffer.value[entry.id] ?? entry.quantity
            : entry.quantity
        return sum + qty * ((entry.price_snapshot ?? entry.product.price_per_unit) || 0)
    }, 0).toFixed(0)
}

const grouped = computed(() => {
    const group = {}
    bodegaStock.value.forEach(entry => {
        const name = entry.worker?.name
        if (!group[name]) group[name] = []
        if (!entry._groupOnly) group[name].push(entry)
    })
    return group
})

const groupedKeys = computed(() => Object.keys(grouped.value).sort())

</script>