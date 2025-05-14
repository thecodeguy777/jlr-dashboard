<template>
  <div class="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow hover:shadow-lg transition">
    <h3 class="text-sm uppercase tracking-wide text-white/70 mb-1">
      {{ title }}
    </h3>
    <p class="text-2xl font-bold text-white">
      {{ value }}
    </p>
  </div>
</template>

<script>
export default {
  name: 'MetricCard',
  props: {
    title: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
};
</script>
