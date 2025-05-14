<template>
  <div class="bg-card-background p-6 rounded-lg shadow-lg">
    <h2 class="text-2xl font-semibold text-gray-300 mb-4">Delivery Log</h2>

    <table class="min-w-full table-auto">
      <thead>
        <tr class="bg-gray-800 text-left text-sm font-medium text-gray-300">
          <th class="px-6 py-3">Product Type</th>
          <th class="px-6 py-3">Quantity Delivered</th>
          <th class="px-6 py-3">Delivery Date</th>
          <th class="px-6 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(delivery, index) in deliveries" :key="index">
          <td class="px-6 py-4 text-gray-300">{{ delivery.productType }}</td>
          <td class="px-6 py-4 text-gray-300">{{ delivery.quantityDelivered }}</td>
          <td class="px-6 py-4 text-gray-300">{{ delivery.deliveryDate }}</td>
          <td class="px-6 py-4">
            <button @click="editDelivery(index, delivery)" class="text-blue-500 hover:underline">Edit</button>
            <button @click="deleteDelivery(index)" class="text-red-500 hover:underline ml-4">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  props: ['deliveries'],
  methods: {
    deleteDelivery(index) {
      this.$emit('delete-delivery', index);
    },
    editDelivery(index, delivery) {
      this.$emit('edit-delivery', index, delivery);
    }
  }
};
</script>
