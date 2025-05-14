<template>
  <div class="flex h-screen bg-gray-900 overflow-x-hidden">
    <!-- Sidebar -->
    <aside
      :class="[
        'transition-all duration-300 ease-in-out flex flex-col text-white h-full',
        isSidebarCollapsed ? 'w-16 items-center p-2' : 'w-64 p-4',
        'bg-white/10 backdrop-blur-md border-r border-white/10 shadow-xl'
      ]"
    >
      <!-- Toggle Button -->
      <button
        @click="toggleSidebar"
        class="text-xl mb-4 p-2 rounded hover:bg-white/10 transition"
      >
        <span v-if="isSidebarCollapsed">☰</span>
        <span v-else>✖</span>
      </button>

      <!-- App Title -->
      <div v-if="!isSidebarCollapsed" class="text-xl font-bold mb-6 px-2">
        MyDashboard
      </div>

      <!-- Nav Links -->
      <nav class="flex-1 space-y-2 w-full">
        <router-link
          to="/deliveries"
          class="block px-3 py-2 rounded-md hover:bg-white/10 transition"
          active-class="bg-white/10 font-semibold"
        >
          <span v-if="!isSidebarCollapsed">📦 Deliveries</span>
          <span v-else>📦</span>
        </router-link>

        <router-link
          to="/summary"
          class="block px-3 py-2 rounded-md hover:bg-white/10 transition"
          active-class="bg-white/10 font-semibold"
        >
          <span v-if="!isSidebarCollapsed">📊 Summary</span>
          <span v-else>📊</span>
        </router-link>

        <!--<router-link
          to="/chat"
          class="block px-3 py-2 rounded-md hover:bg-white/10 transition"
          active-class="bg-white/10 font-semibold"
        >
          <span v-if="!isSidebarCollapsed">💬 Chat</span>
          <span v-else>💬</span>
        </router-link>-->
      </nav>

      <!-- Footer -->
      <div
        v-if="!isSidebarCollapsed"
        class="text-sm text-white/60 mt-auto px-2 pt-4 border-t border-white/10"
      >
        Logged in as <span class="font-semibold text-white">admin</span>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-6 overflow-y-auto">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isSidebarCollapsed: true,
    };
  },
  methods: {
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
    },
  },
};
</script>

<!-- Removed redundant transition-all style -->
