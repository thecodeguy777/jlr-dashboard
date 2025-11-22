<template>
    <div v-if="canViewAs" class="fixed top-4 right-4 z-40">
        <div class="flex items-center gap-2">
            <!-- Viewing As Badge -->
            <div v-if="userStore.isViewingAsOther"
                 class="bg-yellow-600 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
                <span>👁️ Viewing as {{ userStore.viewingAsUser.full_name }}</span>
                <button @click="clearView" class="hover:bg-white/20 rounded-full p-1 transition">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Compact Selector -->
            <select
                v-model="selectedUserId"
                @change="handleViewAsChange"
                class="bg-white/10 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 focus:border-green-500 focus:outline-none transition shadow-lg cursor-pointer"
            >
                <option value="">👁️ View As...</option>
                <option v-for="user in users" :key="user.id" :value="user.id">
                    {{ user.full_name }}
                </option>
            </select>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import { supabase } from '@/lib/supabase'

const userStore = useUserStore()
const users = ref([])
const selectedUserId = ref('')

// Only show View As to main admin (not employee_admin)
const canViewAs = computed(() => userStore.role === 'admin')

async function fetchUsers() {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('id, email, full_name, role')
            .order('full_name', { ascending: true })

        if (error) {
            console.error('[ViewAsSelector] Error fetching users:', error)
            return
        }

        users.value = data || []
        console.log('[ViewAsSelector] Loaded users:', users.value.length, users.value)
    } catch (err) {
        console.error('[ViewAsSelector] Unexpected error:', err)
    }
}

function handleViewAsChange() {
    if (!selectedUserId.value) {
        clearView()
        return
    }

    const selectedUser = users.value.find(u => u.id === selectedUserId.value)
    if (selectedUser) {
        userStore.setViewingAs(selectedUser)
        // Emit event to parent to refresh data
        emit('viewChanged')
    }
}

function clearView() {
    selectedUserId.value = ''
    userStore.clearViewingAs()
    emit('viewChanged')
}

const emit = defineEmits(['viewChanged'])

onMounted(() => {
    if (canViewAs.value) {
        fetchUsers()
    }
})
</script>
