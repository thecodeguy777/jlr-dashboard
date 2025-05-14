<template>
  <div class="flex flex-col min-h-screen bg-gray-900 text-white font-sans">
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <div class="bg-blue-600 p-6 rounded-xl shadow-lg">
        <h3 class="text-sm font-medium uppercase text-white/80">Single-Walled</h3>
        <p class="text-3xl font-bold">{{ totalSingleWalledDelivered }} pcs</p>
      </div>
      <div class="bg-purple-600 p-6 rounded-xl shadow-lg">
        <h3 class="text-sm font-medium uppercase text-white/80">Double-Walled</h3>
        <p class="text-3xl font-bold">{{ totalDoubleWalledDelivered }} pcs</p>
      </div>
      <div class="bg-green-600 p-6 rounded-xl shadow-lg">
        <h3 class="text-sm font-medium uppercase text-white/80">Total</h3>
        <p class="text-3xl font-bold">{{ totalDeliveries }} pcs</p>
      </div>
    </div>

    <!-- Main Section -->
    <div class="flex flex-col lg:flex-row flex-1 overflow-hidden">
      <DeliveryForm
        class="w-full lg:w-1/3 bg-gray-800 p-6 overflow-y-auto"
        :delivery-date="deliveryDate"
        :editing-index="editingIndex"
        :edit-mode="isEditing"
        :form-data="formData"
        @submit="handleSubmit"
        @cancel-edit="resetForm"
      />
      <DeliveryTable
        class="flex-1 bg-gray-900 p-6 overflow-hidden"
        :grouped-deliveries="groupedDeliveries"
        @edit="editDelivery"
        @delete="deleteDelivery"
      />

    </div>
  </div>
</template>

<script>
import DeliveryForm from './DeliveryForm.vue';
import DeliveryTable from './DeliveryTable.vue';

export default {
  components: { DeliveryForm, DeliveryTable },
  data() {
    return {
      formData: {
        workerName: '',
        productType: '1L',
        quantityDelivered: 0,
        deliveryDate: this.getCurrentDate(),
        notes: '',
      },
      deliveryDate: '',
      deliveries: [],
      isEditing: false,
      editingIndex: null,
    };
  },
  computed: {
    totalSingleWalledDelivered() {
      const types = ['1L'];
      return this.deliveries
        .filter(d => types.includes(d.productType))
        .reduce((sum, d) => sum + Number(d.quantityDelivered || 0), 0);
    },
    totalDoubleWalledDelivered() {
      const types = ['1.5L', 'Gallon', '330mL'];
      return this.deliveries
        .filter(d => types.includes(d.productType))
        .reduce((sum, d) => sum + Number(d.quantityDelivered || 0), 0);
    },
    totalDeliveries() {
      return this.deliveries.reduce((sum, d) => sum + Number(d.quantityDelivered || 0), 0);
    },
    groupedDeliveries() {
      const map = {};

      this.deliveries.forEach(d => {
        const date = d.deliveryDate || 'Unknown';
        if (!map[date]) map[date] = [];
        map[date].push(d);
      });

      return map;
    }

  },
  mounted() {
    this.deliveryDate = this.getCurrentDate();
    const saved = localStorage.getItem('deliveries');
    if (saved) this.deliveries = JSON.parse(saved);
  },
  watch: {
    deliveries: {
      handler(newVal) {
        localStorage.setItem('deliveries', JSON.stringify(newVal));
      },
      deep: true,
    },
  },
  methods: {
    getCurrentDate() {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    },
    handleSubmit(delivery) {
      if (this.isEditing) {
        this.deliveries.splice(this.editingIndex, 1, delivery);
      } else {
        this.deliveries.push(delivery);
      }
      this.resetForm();
    },
    editDelivery(index, delivery) {
    this.formData = { ...delivery };
    this.isEditing = true;
    this.editingIndex = index;

    this.$nextTick(() => {
      const el = document.querySelector('#delivery-form');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  },




    deleteDelivery(index) {
      this.deliveries.splice(index, 1);
    },
    resetForm() {
      this.formData = {
        workerName: '',
        productType: '1L',
        quantityDelivered: 0,
        deliveryDate: this.getCurrentDate(),
        notes: '',
      };
      this.isEditing = false;
      this.editingIndex = null;
    },
  },
};
</script>
