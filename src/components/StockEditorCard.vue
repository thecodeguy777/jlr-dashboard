<template>
    <div class="space-y-4">
        <div v-if="groupedKeys.length" class="space-y-4">
            <div v-for="name in groupedKeys" :key="name"
                class="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 shadow relative">
                <!-- Header -->
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-white font-semibold text-base">{{ name }}</h2>
                    <button class="text-white/40 hover:text-green-400" @click="toggleEdit(name)">
                        <Pencil class="w-4 h-4" />
                    </button>
                </div>

                <!-- Product list -->
                <div class="space-y-1">
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
                </div>

                <!-- Save/Delete Buttons -->
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

                <!-- Add item row -->
                <div v-if="editingWorker === name" class="mt-4 space-y-2">
                    <button @click="showAddItem[name] = true" class="text-green-400 hover:underline text-sm">
                        + Add Item
                    </button>
                    <div v-if="showAddItem[name]" class="flex gap-2 pt-2">
                        <input v-model="newItemBuffer[name].name" type="text" placeholder="Product name"
                            class="bg-gray-700 text-white rounded p-1 text-sm w-1/2" />
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
import { ref, computed, watch } from 'vue'
import { Pencil } from 'lucide-vue-next'
import { toRaw } from 'vue'

const props = defineProps({
    entries: Array
})
const emit = defineEmits(['update'])

const editingWorker = ref(null)
const editBuffer = ref({})
const newItemBuffer = ref({})
const showAddItem = ref({})

const grouped = computed(() => {
    const group = {}
    props.entries.forEach(entry => {
        const name = entry.worker.name
        if (!group[name]) group[name] = []
        group[name].push(entry)
    })
    return group
})

const groupedKeys = computed(() => Object.keys(grouped.value))

function toggleEdit(name) {
    editingWorker.value = name
    editBuffer.value = {}
    grouped.value[name].forEach(entry => {
        editBuffer.value[entry.id] = entry.quantity
    })
    newItemBuffer.value[name] = { name: '', quantity: 0 }
    showAddItem.value[name] = false
}

function saveWorkerEdit(name) {
    const updated = props.entries.map(entry => {
        if (entry.worker.name === name && editBuffer.value[entry.id] != null) {
            return { ...entry, quantity: editBuffer.value[entry.id] }
        }
        return entry
    })
    emit('update', updated)
    editingWorker.value = null
    editBuffer.value = {}
}

function deleteWorker(name) {
    const updated = props.entries.filter(entry => entry.worker.name !== name)
    emit('update', updated)
    editingWorker.value = null
}

function deleteItem(id) {
    const updated = props.entries.filter(entry => entry.id !== id)
    emit('update', updated)
    delete editBuffer.value[id]
}

function addNewItem(name) {
    const buffer = newItemBuffer.value[name]
    if (!buffer?.name || !buffer?.quantity) return

    const newId = Date.now()
    const newEntry = {
        id: newId,
        worker: { name },
        product: { name: buffer.name, price: 0 },
        quantity: buffer.quantity,
        date: new Date().toISOString().slice(0, 10)
    }

    const updated = [...props.entries, newEntry]
    emit('update', updated)

    newItemBuffer.value[name] = { name: '', quantity: 0 }
    showAddItem.value[name] = false
}

function getSubtotal(entry) {
    const qty = editingWorker.value === entry.worker.name
        ? editBuffer.value[entry.id] ?? entry.quantity
        : entry.quantity
    return qty * entry.product.price
}

function getWorkerTotal(name) {
    return grouped.value[name].reduce((sum, entry) => {
        const qty = editingWorker.value === name
            ? editBuffer.value[entry.id] ?? entry.quantity
            : entry.quantity
        return sum + qty * entry.product.price
    }, 0).toFixed(0)
}
</script>