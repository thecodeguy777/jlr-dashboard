<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

// Active section state
const activeSection = ref('pricing')

// Products section (existing functionality)
const products = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const showSuccessMessage = ref(false)
const selectedCategory = ref('all')
const searchQuery = ref('')

// Employee management section
const employees = ref([])
const showEmployeeModal = ref(false)
const employeeForm = ref({
    full_name: '',
    email: '',
    phone: '',
    position: '',
    role: 'employee',
    hourly_rate: 56.25,
    is_active: true
})

// Subcontractor management section
const subcontractors = ref([])
const showSubcontractorModal = ref(false)
const subcontractorForm = ref({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    is_active: true
})

// Driver management section
const drivers = ref([])
const showDriverModal = ref(false)
const driverForm = ref({
    name: '',
    email: '',
    phone: '',
    license_number: '',
    vehicle_type: '',
    vehicle_info: {},
    is_active: true
})

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

// Fetch employees
async function fetchEmployees() {
    const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('name')
    
    if (error) {
        console.error('Error fetching employees:', error)
        return
    }
    
    employees.value = (data || []).map(employee => ({
        ...employee,
        isEditing: false,
        newName: employee.name || '',
        newPosition: employee.position || '',
        newPhone: employee.phone || '',
        newHourlyRate: employee.hourly_rate || employee.inhouse_rate || employee.regular_rate || 56.25
    }))
}

// Fetch subcontractors
async function fetchSubcontractors() {
    const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('name')
    
    if (error) {
        console.error('Error fetching subcontractors:', error)
        return
    }
    
    subcontractors.value = (data || []).map(subcontractor => ({
        ...subcontractor,
        isEditing: false,
        newName: subcontractor.name,
        newContactPerson: subcontractor.contact_person || '',
        newPhone: subcontractor.phone || '',
        newEmail: subcontractor.email || '',
        newAddress: subcontractor.address || ''
    }))
}

// Fetch drivers
async function fetchDrivers() {
    const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name')
    
    if (error) {
        console.error('Error fetching drivers:', error)
        return
    }
    
    drivers.value = (data || []).map(driver => ({
        ...driver,
        isEditing: false,
        newName: driver.name,
        newPhone: driver.phone || '',
        newLicenseNumber: driver.license_number || '',
        newVehicleType: driver.vehicle_type || ''
    }))
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

// Add new employee
async function addEmployee() {
    try {
        isSaving.value = true
        
        // Build insert data - start with required fields
        const insertData = {
            name: employeeForm.value.full_name,
            is_active: employeeForm.value.is_active
        }
        
        // Add optional fields if provided
        if (employeeForm.value.phone) {
            insertData.phone = employeeForm.value.phone
        }
        if (employeeForm.value.position) {
            insertData.position = employeeForm.value.position
        }
        if (employeeForm.value.hourly_rate) {
            insertData.hourly_rate = employeeForm.value.hourly_rate
        }
        
        // Create worker entry
        const { data: workerData, error: workerError } = await supabase
            .from('workers')
            .insert(insertData)
            .select()
            .single()

        if (workerError) throw workerError

        // Optionally create user profile if email is provided
        if (employeeForm.value.email) {
            // Note: In a real app, you'd need to handle auth user creation properly
            // This is a simplified version
            console.log('Employee added to workers table. User profile creation requires admin panel.')
        }

        employees.value.push({
            ...workerData,
            isEditing: false,
            newName: workerData.name || '',
            newPosition: workerData.position || '',
            newPhone: workerData.phone || '',
            newHourlyRate: workerData.hourly_rate || workerData.inhouse_rate || workerData.regular_rate || 56.25
        })
        showEmployeeModal.value = false
        resetEmployeeForm()
        
        showSuccessMessage.value = true
        setTimeout(() => {
            showSuccessMessage.value = false
        }, 3000)
        
    } catch (error) {
        console.error('Error adding employee:', error)
        alert(`Error adding employee: ${error.message}`)
    } finally {
        isSaving.value = false
    }
}

// Add new subcontractor
async function addSubcontractor() {
    try {
        isSaving.value = true
        
        const { data, error } = await supabase
            .from('subcontractors')
            .insert({
                name: subcontractorForm.value.name,
                contact_person: subcontractorForm.value.contact_person,
                phone: subcontractorForm.value.phone,
                email: subcontractorForm.value.email,
                address: subcontractorForm.value.address,
                is_active: subcontractorForm.value.is_active
            })
            .select()
            .single()

        if (error) throw error

        subcontractors.value.push({
            ...data,
            isEditing: false,
            newName: data.name,
            newContactPerson: data.contact_person || '',
            newPhone: data.phone || '',
            newEmail: data.email || '',
            newAddress: data.address || ''
        })
        showSubcontractorModal.value = false
        resetSubcontractorForm()
        
        showSuccessMessage.value = true
        setTimeout(() => {
            showSuccessMessage.value = false
        }, 3000)
        
    } catch (error) {
        console.error('Error adding subcontractor:', error)
        alert('Error adding subcontractor. Please try again.')
    } finally {
        isSaving.value = false
    }
}

// Add new driver
async function addDriver() {
    try {
        isSaving.value = true
        
        const { data, error } = await supabase
            .from('drivers')
            .insert({
                name: driverForm.value.name,
                phone: driverForm.value.phone,
                license_number: driverForm.value.license_number,
                vehicle_type: driverForm.value.vehicle_type,
                vehicle_info: driverForm.value.vehicle_info,
                is_active: driverForm.value.is_active
            })
            .select()
            .single()

        if (error) throw error

        drivers.value.push({
            ...data,
            isEditing: false,
            newName: data.name,
            newPhone: data.phone || '',
            newLicenseNumber: data.license_number || '',
            newVehicleType: data.vehicle_type || ''
        })
        showDriverModal.value = false
        resetDriverForm()
        
        showSuccessMessage.value = true
        setTimeout(() => {
            showSuccessMessage.value = false
        }, 3000)
        
    } catch (error) {
        console.error('Error adding driver:', error)
        alert('Error adding driver. Please try again.')
    } finally {
        isSaving.value = false
    }
}

// Update employee
async function updateEmployee(employee) {
    isSaving.value = true
    
    // Start with basic update - only name which we know exists
    const updateData = {
        name: employee.newName
    }
    
    // Add other fields if they exist in the original data
    if (employee.hasOwnProperty('position') || employee.newPosition) {
        updateData.position = employee.newPosition
    }
    if (employee.hasOwnProperty('phone') || employee.newPhone) {
        updateData.phone = employee.newPhone
    }
    if (employee.hasOwnProperty('hourly_rate') || employee.newHourlyRate) {
        updateData.hourly_rate = employee.newHourlyRate
    }
    
    const { error } = await supabase
        .from('workers')
        .update(updateData)
        .eq('id', employee.id)

    if (error) {
        console.error('Error updating employee:', error)
        alert(`Error updating employee: ${error.message}`)
        isSaving.value = false
        return false
    }

    // Update local data
    employee.name = employee.newName
    if (updateData.position !== undefined) employee.position = employee.newPosition
    if (updateData.phone !== undefined) employee.phone = employee.newPhone
    if (updateData.hourly_rate !== undefined) employee.hourly_rate = employee.newHourlyRate
    employee.isEditing = false
    
    isSaving.value = false
    showSuccessMessage.value = true
    setTimeout(() => {
        showSuccessMessage.value = false
    }, 3000)
    return true
}

// Update subcontractor
async function updateSubcontractor(subcontractor) {
    isSaving.value = true
    const { error } = await supabase
        .from('subcontractors')
        .update({
            name: subcontractor.newName,
            contact_person: subcontractor.newContactPerson,
            phone: subcontractor.newPhone,
            email: subcontractor.newEmail,
            address: subcontractor.newAddress
        })
        .eq('id', subcontractor.id)

    if (error) {
        console.error('Error updating subcontractor:', error)
        isSaving.value = false
        return false
    }

    // Update local data
    subcontractor.name = subcontractor.newName
    subcontractor.contact_person = subcontractor.newContactPerson
    subcontractor.phone = subcontractor.newPhone
    subcontractor.email = subcontractor.newEmail
    subcontractor.address = subcontractor.newAddress
    subcontractor.isEditing = false
    
    isSaving.value = false
    showSuccessMessage.value = true
    setTimeout(() => {
        showSuccessMessage.value = false
    }, 3000)
    return true
}

// Update driver
async function updateDriver(driver) {
    isSaving.value = true
    const { error } = await supabase
        .from('drivers')
        .update({
            name: driver.newName,
            phone: driver.newPhone,
            license_number: driver.newLicenseNumber,
            vehicle_type: driver.newVehicleType
        })
        .eq('id', driver.id)

    if (error) {
        console.error('Error updating driver:', error)
        isSaving.value = false
        return false
    }

    // Update local data
    driver.name = driver.newName
    driver.phone = driver.newPhone
    driver.license_number = driver.newLicenseNumber
    driver.vehicle_type = driver.newVehicleType
    driver.isEditing = false
    
    isSaving.value = false
    showSuccessMessage.value = true
    setTimeout(() => {
        showSuccessMessage.value = false
    }, 3000)
    return true
}

// Toggle active status functions
async function toggleEmployeeStatus(employee) {
    const { error } = await supabase
        .from('workers')
        .update({ is_active: !employee.is_active })
        .eq('id', employee.id)

    if (!error) {
        employee.is_active = !employee.is_active
        showSuccessMessage.value = true
        setTimeout(() => {
            showSuccessMessage.value = false
        }, 3000)
    }
}

async function toggleSubcontractorStatus(subcontractor) {
    const { error } = await supabase
        .from('subcontractors')
        .update({ is_active: !subcontractor.is_active })
        .eq('id', subcontractor.id)

    if (!error) {
        subcontractor.is_active = !subcontractor.is_active
        showSuccessMessage.value = true
        setTimeout(() => {
            showSuccessMessage.value = false
        }, 3000)
    }
}

async function toggleDriverStatus(driver) {
    const { error } = await supabase
        .from('drivers')
        .update({ is_active: !driver.is_active })
        .eq('id', driver.id)

    if (!error) {
        driver.is_active = !driver.is_active
        showSuccessMessage.value = true
        setTimeout(() => {
            showSuccessMessage.value = false
        }, 3000)
    }
}

// Reset forms
function resetEmployeeForm() {
    employeeForm.value = {
        full_name: '',
        email: '',
        phone: '',
        position: '',
        role: 'employee',
        hourly_rate: 56.25,
        is_active: true
    }
}

function resetSubcontractorForm() {
    subcontractorForm.value = {
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        is_active: true
    }
}

function resetDriverForm() {
    driverForm.value = {
        name: '',
        email: '',
        phone: '',
        license_number: '',
        vehicle_type: '',
        vehicle_info: {},
        is_active: true
    }
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

// Switch section
function switchSection(section) {
    activeSection.value = section
    
    // Load data for the selected section
    if (section === 'employees' && employees.value.length === 0) {
        fetchEmployees()
    } else if (section === 'subcontractors' && subcontractors.value.length === 0) {
        fetchSubcontractors()
    } else if (section === 'drivers' && drivers.value.length === 0) {
        fetchDrivers()
    }
}

onMounted(() => {
    fetchProducts()
})
</script>

<template>
    <div class="px-6 pt-6 pb-24 space-y-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 class="text-2xl font-bold text-white">⚙️ Settings</h1>

            <!-- Success Message -->
            <div v-if="showSuccessMessage"
                class="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                Operation completed successfully!
            </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex flex-wrap gap-2 bg-white/5 p-2 rounded-xl">
            <button @click="switchSection('pricing')" 
                :class="['px-4 py-2 rounded-lg transition-all', activeSection === 'pricing' 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20']">
                💰 Product Pricing
            </button>
            <button @click="switchSection('employees')" 
                :class="['px-4 py-2 rounded-lg transition-all', activeSection === 'employees' 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20']">
                👥 Employees
            </button>
            <button @click="switchSection('subcontractors')" 
                :class="['px-4 py-2 rounded-lg transition-all', activeSection === 'subcontractors' 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20']">
                🤝 Subcontractors
            </button>
            <button @click="switchSection('drivers')" 
                :class="['px-4 py-2 rounded-lg transition-all', activeSection === 'drivers' 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20']">
                🚚 Drivers
            </button>
        </div>

        <!-- Product Pricing Section -->
        <div v-if="activeSection === 'pricing'">
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

        <!-- Employees Section -->
        <div v-if="activeSection === 'employees'" class="space-y-6">
            <!-- Header with Add Button -->
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-bold text-white">👥 Employee Management</h2>
                <button @click="showEmployeeModal = true"
                    class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-all">
                    ➕ Add Employee
                </button>
            </div>

            <!-- Employees List -->
            <div class="bg-white/5 rounded-xl overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-white/10 text-white text-left">
                                <th class="px-6 py-3">Name</th>
                                <th class="px-6 py-3">Position</th>
                                <th class="px-6 py-3">Phone</th>
                                <th class="px-6 py-3">Hourly Rate</th>
                                <th class="px-6 py-3">Status</th>
                                <th class="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/10">
                            <tr v-for="employee in employees" :key="employee.id" class="text-white/80 hover:bg-white/5">
                                <td class="px-6 py-4">
                                    <input v-if="employee.isEditing" v-model="employee.newName" type="text"
                                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                                    <span v-else>{{ employee.name }}</span>
                                </td>
                                                                 <td class="px-6 py-4">
                                     <input v-if="employee.isEditing" v-model="employee.newPosition" type="text"
                                         class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                                         placeholder="Position">
                                     <span v-else>{{ employee.position || 'Worker' }}</span>
                                 </td>
                                 <td class="px-6 py-4">
                                     <input v-if="employee.isEditing" v-model="employee.newPhone" type="tel"
                                         class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                                         placeholder="Phone">
                                     <span v-else>{{ employee.phone || '-' }}</span>
                                 </td>
                                 <td class="px-6 py-4">
                                     <input v-if="employee.isEditing" v-model="employee.newHourlyRate" type="number" step="0.01"
                                         class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                                         placeholder="56.25">
                                     <span v-else>₱{{ employee.hourly_rate || employee.inhouse_rate || employee.regular_rate || 56.25 }}</span>
                                 </td>
                                                                 <td class="px-6 py-4">
                                     <button @click="toggleEmployeeStatus(employee)" 
                                         :class="['px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity', employee.is_active 
                                         ? 'bg-green-500/20 text-green-300' 
                                         : 'bg-red-500/20 text-red-300']">
                                         {{ employee.is_active ? 'Active' : 'Inactive' }}
                                     </button>
                                 </td>
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-2">
                                        <button v-if="employee.isEditing" @click="updateEmployee(employee)"
                                            :disabled="isSaving"
                                            class="bg-green-500/20 text-green-300 px-3 py-1 rounded hover:bg-green-500/30 disabled:opacity-50">
                                            Save
                                        </button>
                                        <button v-if="employee.isEditing" @click="employee.isEditing = false"
                                            class="bg-red-500/20 text-red-300 px-3 py-1 rounded hover:bg-red-500/30">
                                            Cancel
                                        </button>
                                                                                 <button v-else @click="employee.isEditing = true"
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
        </div>

        <!-- Subcontractors Section -->
        <div v-if="activeSection === 'subcontractors'" class="space-y-6">
            <!-- Header with Add Button -->
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-bold text-white">🤝 Subcontractor Management</h2>
                <button @click="showSubcontractorModal = true"
                    class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-all">
                    ➕ Add Subcontractor
                </button>
            </div>

            <!-- Subcontractors List -->
            <div class="bg-white/5 rounded-xl overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-white/10 text-white text-left">
                                <th class="px-6 py-3">Name</th>
                                <th class="px-6 py-3">Contact Person</th>
                                <th class="px-6 py-3">Phone</th>
                                <th class="px-6 py-3">Email</th>
                                <th class="px-6 py-3">Status</th>
                                <th class="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/10">
                            <tr v-for="subcontractor in subcontractors" :key="subcontractor.id" class="text-white/80 hover:bg-white/5">
                                <td class="px-6 py-4">
                                    <input v-if="subcontractor.isEditing" v-model="subcontractor.newName" type="text"
                                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                                    <span v-else>{{ subcontractor.name }}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <input v-if="subcontractor.isEditing" v-model="subcontractor.newContactPerson" type="text"
                                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                                    <span v-else>{{ subcontractor.contact_person || '-' }}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <input v-if="subcontractor.isEditing" v-model="subcontractor.newPhone" type="tel"
                                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                                    <span v-else>{{ subcontractor.phone || '-' }}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <input v-if="subcontractor.isEditing" v-model="subcontractor.newEmail" type="email"
                                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                                    <span v-else>{{ subcontractor.email || '-' }}</span>
                                </td>
                                                                 <td class="px-6 py-4">
                                     <button @click="toggleSubcontractorStatus(subcontractor)" 
                                         :class="['px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity', subcontractor.is_active 
                                         ? 'bg-green-500/20 text-green-300' 
                                         : 'bg-red-500/20 text-red-300']">
                                         {{ subcontractor.is_active ? 'Active' : 'Inactive' }}
                                     </button>
                                 </td>
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-2">
                                        <button v-if="subcontractor.isEditing" @click="updateSubcontractor(subcontractor)"
                                            :disabled="isSaving"
                                            class="bg-green-500/20 text-green-300 px-3 py-1 rounded hover:bg-green-500/30 disabled:opacity-50">
                                            Save
                                        </button>
                                        <button v-if="subcontractor.isEditing" @click="subcontractor.isEditing = false"
                                            class="bg-red-500/20 text-red-300 px-3 py-1 rounded hover:bg-red-500/30">
                                            Cancel
                                        </button>
                                                                                 <button v-else @click="subcontractor.isEditing = true"
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
        </div>

        <!-- Drivers Section -->
        <div v-if="activeSection === 'drivers'" class="space-y-6">
            <!-- Header with Add Button -->
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-bold text-white">🚚 Driver Management</h2>
                <button @click="showDriverModal = true"
                    class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-all">
                    ➕ Add Driver
                </button>
            </div>

            <!-- Drivers List -->
            <div class="bg-white/5 rounded-xl overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-white/10 text-white text-left">
                                <th class="px-6 py-3">Name</th>
                                <th class="px-6 py-3">Phone</th>
                                <th class="px-6 py-3">License</th>
                                <th class="px-6 py-3">Vehicle</th>
                                <th class="px-6 py-3">Status</th>
                                <th class="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/10">
                            <tr v-for="driver in drivers" :key="driver.id" class="text-white/80 hover:bg-white/5">
                                <td class="px-6 py-4">
                                    <input v-if="driver.isEditing" v-model="driver.newName" type="text"
                                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                                    <span v-else>{{ driver.name }}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <input v-if="driver.isEditing" v-model="driver.newPhone" type="tel"
                                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                                    <span v-else>{{ driver.phone || '-' }}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <input v-if="driver.isEditing" v-model="driver.newLicenseNumber" type="text"
                                        class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                                    <span v-else>{{ driver.license_number || '-' }}</span>
                                </td>
                                                                 <td class="px-6 py-4">
                                     <select v-if="driver.isEditing" v-model="driver.newVehicleType"
                                         class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                                         <option value="">Select vehicle type</option>
                                         <option value="motorcycle">Motorcycle</option>
                                         <option value="car">Car</option>
                                         <option value="van">Van</option>
                                         <option value="truck">Truck</option>
                                     </select>
                                     <span v-else class="capitalize">{{ driver.vehicle_type || '-' }}</span>
                                 </td>
                                                                 <td class="px-6 py-4">
                                     <button @click="toggleDriverStatus(driver)" 
                                         :class="['px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity', driver.is_active 
                                         ? 'bg-green-500/20 text-green-300' 
                                         : 'bg-red-500/20 text-red-300']">
                                         {{ driver.is_active ? 'Active' : 'Inactive' }}
                                     </button>
                                 </td>
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-2">
                                        <button v-if="driver.isEditing" @click="updateDriver(driver)"
                                            :disabled="isSaving"
                                            class="bg-green-500/20 text-green-300 px-3 py-1 rounded hover:bg-green-500/30 disabled:opacity-50">
                                            Save
                                        </button>
                                        <button v-if="driver.isEditing" @click="driver.isEditing = false"
                                            class="bg-red-500/20 text-red-300 px-3 py-1 rounded hover:bg-red-500/30">
                                            Cancel
                                        </button>
                                                                                 <button v-else @click="driver.isEditing = true"
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
        </div>

        <!-- Employee Modal -->
        <div v-if="showEmployeeModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-gray-900 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-white">➕ Add New Employee</h3>
                    <button @click="showEmployeeModal = false" class="text-white/60 hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form @submit.prevent="addEmployee" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Full Name *</label>
                        <input v-model="employeeForm.full_name" type="text" required
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Position</label>
                        <input v-model="employeeForm.position" type="text"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Phone</label>
                        <input v-model="employeeForm.phone" type="tel"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Email</label>
                        <input v-model="employeeForm.email" type="email"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Hourly Rate</label>
                        <input v-model="employeeForm.hourly_rate" type="number" step="0.01"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div class="flex items-center gap-2">
                        <input v-model="employeeForm.is_active" type="checkbox" id="emp-active"
                            class="rounded border-white/20 bg-white/10 text-orange-500 focus:ring-orange-500">
                        <label for="emp-active" class="text-sm text-white/60">Active</label>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button type="button" @click="showEmployeeModal = false"
                            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg">
                            Cancel
                        </button>
                        <button type="submit" :disabled="isSaving"
                            class="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg disabled:opacity-50">
                            {{ isSaving ? 'Adding...' : 'Add Employee' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Subcontractor Modal -->
        <div v-if="showSubcontractorModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-gray-900 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-white">➕ Add New Subcontractor</h3>
                    <button @click="showSubcontractorModal = false" class="text-white/60 hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form @submit.prevent="addSubcontractor" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Company Name *</label>
                        <input v-model="subcontractorForm.name" type="text" required
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Contact Person</label>
                        <input v-model="subcontractorForm.contact_person" type="text"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Phone</label>
                        <input v-model="subcontractorForm.phone" type="tel"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Email</label>
                        <input v-model="subcontractorForm.email" type="email"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Address</label>
                        <textarea v-model="subcontractorForm.address" rows="3"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"></textarea>
                    </div>
                    <div class="flex items-center gap-2">
                        <input v-model="subcontractorForm.is_active" type="checkbox" id="sub-active"
                            class="rounded border-white/20 bg-white/10 text-orange-500 focus:ring-orange-500">
                        <label for="sub-active" class="text-sm text-white/60">Active</label>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button type="button" @click="showSubcontractorModal = false"
                            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg">
                            Cancel
                        </button>
                        <button type="submit" :disabled="isSaving"
                            class="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg disabled:opacity-50">
                            {{ isSaving ? 'Adding...' : 'Add Subcontractor' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Driver Modal -->
        <div v-if="showDriverModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-gray-900 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-white">➕ Add New Driver</h3>
                    <button @click="showDriverModal = false" class="text-white/60 hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form @submit.prevent="addDriver" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Full Name *</label>
                        <input v-model="driverForm.name" type="text" required
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Phone</label>
                        <input v-model="driverForm.phone" type="tel"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Email</label>
                        <input v-model="driverForm.email" type="email"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">License Number</label>
                        <input v-model="driverForm.license_number" type="text"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-1">Vehicle Type</label>
                        <select v-model="driverForm.vehicle_type"
                            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                            <option value="">Select vehicle type</option>
                            <option value="motorcycle">Motorcycle</option>
                            <option value="car">Car</option>
                            <option value="van">Van</option>
                            <option value="truck">Truck</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-2">
                        <input v-model="driverForm.is_active" type="checkbox" id="drv-active"
                            class="rounded border-white/20 bg-white/10 text-orange-500 focus:ring-orange-500">
                        <label for="drv-active" class="text-sm text-white/60">Active</label>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button type="button" @click="showDriverModal = false"
                            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg">
                            Cancel
                        </button>
                        <button type="submit" :disabled="isSaving"
                            class="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg disabled:opacity-50">
                            {{ isSaving ? 'Adding...' : 'Add Driver' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>