<template>
  <div class="flex flex-col bg-gray-900 min-h-screen">
    <!-- Delivery Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <div class="bg-blue-600 text-white p-6 rounded-lg shadow-lg">
        <h3 class="text-lg font-semibold">Total Deliveries (Single-Walled)</h3>
        <p class="text-2xl font-bold">{{ totalSingleWalledDelivered }} pcs</p>
      </div>
      <div class="bg-purple-600 text-white p-6 rounded-lg shadow-lg">
        <h3 class="text-lg font-semibold">Total Deliveries (Double-Walled)</h3>
        <p class="text-2xl font-bold">{{ totalDoubleWalledDelivered }} pcs</p>
      </div>
      <div class="bg-green-600 text-white p-6 rounded-lg shadow-lg">
        <h3 class="text-lg font-semibold">Total Deliveries (Overall)</h3>
        <p class="text-2xl font-bold">{{ totalDeliveries }} pcs</p>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- Left side: Delivery Form -->
      <div class="bg-gray-800 text-white w-full sm:w-1/3 p-6 overflow-y-auto">
        <h2 class="text-2xl font-semibold mb-4">Log New Delivery</h2>

        <!-- Form for New Delivery -->
        <div class="mb-4">
          <label for="worker_name" class="block text-sm font-medium text-gray-200">Worker Name</label>
          <select v-model="workerName" id="worker_name" class="mt-1 block w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-md">
            <option value="" disabled>Select a worker</option>
            <option value="Bong">Bong</option>
            <option value="Joper">Joper</option>
            <option value="Mhar">Mhar</option>
          </select>
        </div>

        <div class="mb-4">
          <label for="product_type" class="block text-sm font-medium text-gray-200">Product Type</label>
          <select v-model="productType" id="product_type" class="mt-1 block w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-md">
            <option value="1L">1L</option>
            <option value="1.5L">1.5L</option>
            <option value="Gallon">Gallon</option>
            <option value="330mL">330mL</option>
          </select>
        </div>

        <div class="mb-4">
          <label for="quantity_delivered" class="block text-sm font-medium text-gray-200">Quantity Delivered</label>
          <input v-model="quantityDelivered" type="number" id="quantity_delivered" class="mt-1 block w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-md" />
        </div>

        <div class="mb-4">
          <label for="delivery_date" class="block text-sm font-medium text-gray-200">Delivery Date</label>
          <input v-model="deliveryDate" type="date" id="delivery_date" class="mt-1 block w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-md" />
        </div>

        <div class="mb-4">
          <label for="notes" class="block text-sm font-medium text-gray-200">Notes</label>
          <textarea v-model="notes" id="notes" class="mt-1 block w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-md"></textarea>
        </div>

        <button @click="submitForm" class="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
          {{ isEditing ? 'Update Delivery' : 'Log Delivery' }}
        </button>
      </div>

      <!-- Right side: Delivery Log -->
      <div class="flex-1 bg-gray-900 text-white p-6 overflow-hidden">
        <h2 class="text-2xl font-semibold mb-4">Delivery Log</h2>

        <!-- Make the Delivery Log Table Scrollable -->
        <div class="overflow-y-auto max-h-[calc(100vh-16rem)]">
          <table class="min-w-full table-auto text-gray-300">
            <thead class="bg-gray-800 text-sm font-medium">
              <tr>
                <th class="px-6 py-3">Worker Name</th>
                <th class="px-6 py-3">Product Type</th>
                <th class="px-6 py-3">Quantity Delivered</th>
                <th class="px-6 py-3">Delivery Date</th>
                <th class="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(delivery, index) in deliveries" :key="index" :class="{'bg-gray-800': index % 2 === 0, 'bg-gray-700': index % 2 !== 0, 'hover:bg-gray-600': true}">
                <td class="px-6 py-4">{{ delivery.workerName }}</td>
                <td class="px-6 py-4">{{ delivery.productType }}</td>
                <td class="px-6 py-4">{{ delivery.quantityDelivered }}</td>
                <td class="px-6 py-4">{{ delivery.deliveryDate }}</td>
                <td class="px-6 py-4">
                  <button @click="editDelivery(index, delivery)" class="text-blue-500 hover:underline">Edit</button>
                  <button @click="deleteDelivery(index)" class="text-red-500 hover:underline ml-4">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      workerName: "", // Worker name is now a dropdown selection
      productType: "1L",
      quantityDelivered: 0,
      deliveryDate: "", // This will be updated to today’s date on mounted
      notes: "",
      deliveries: [],
      isEditing: false,
      editingIndex: null,
    };
  },
  computed: {
    totalSingleWalledDelivered() {
      return this.deliveries.filter(d => d.productType === '1L').reduce((sum, delivery) => sum + delivery.quantityDelivered, 0);
    },
    totalDoubleWalledDelivered() {
      return this.deliveries.filter(d => d.productType === '1.5L' || d.productType === 'Gallon' || d.productType === '330mL')
                            .reduce((sum, delivery) => sum + delivery.quantityDelivered, 0);
    },
    totalDeliveries() {
      return this.deliveries.reduce((sum, delivery) => sum + delivery.quantityDelivered, 0);
    }
  },
  methods: {
    submitForm() {
      if (!this.workerName.trim()) {
        alert("Please select a worker.");
        return;
      }

      const newDelivery = {
        workerName: this.workerName,
        productType: this.productType,
        quantityDelivered: this.quantityDelivered,
        deliveryDate: this.deliveryDate,
        notes: this.notes
      };

      if (this.isEditing) {
        // Update the existing delivery at the editing index
        this.deliveries.splice(this.editingIndex, 1, newDelivery);
      } else {
        // Add new delivery to the deliveries list
        this.deliveries.push(newDelivery);
      }

      this.resetForm();
    },
    resetForm() {
      this.workerName = "";  // Reset the worker name field
      this.productType = "1L";
      this.quantityDelivered = 0;
      this.deliveryDate = this.getCurrentDate();  // Reset delivery date to today's date
      this.notes = "";
      this.isEditing = false;
      this.editingIndex = null;
    },
    deleteDelivery(index) {
      this.deliveries.splice(index, 1);
    },
    editDelivery(index, delivery) {
      this.workerName = delivery.workerName;
      this.productType = delivery.productType;
      this.quantityDelivered = delivery.quantityDelivered;
      this.deliveryDate = delivery.deliveryDate;
      this.notes = delivery.notes;
      this.isEditing = true;
      this.editingIndex = index;
    },
    getCurrentDate() {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  },
  mounted() {
    // Set the default delivery date to today when the component is mounted
    this.deliveryDate = this.getCurrentDate();
  }
};
</script>

<style scoped>
/* Ensuring that the background color stays consistent */
body, .bg-gray-900 {
  background-color: #1a202c; /* Set background color to gray-900 */
}

/* Optional: Styling for alternating rows and hover effect */
tr:hover {
  background-color: #4a5568; /* Darker gray on hover */
}
</style>
