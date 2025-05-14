<template>
  <div class="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto p-6 pb-20">
      <router-view />
    </main>

    <!-- Bottom Navigation -->
    <nav
      class="fixed bottom-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-t border-white/10 shadow-xl flex justify-around items-center h-16"
    >
      <!-- Home -->
      <router-link
        to="/"
        class="flex flex-col items-center justify-center text-xs"
        active-class="text-green-400 font-semibold"
      >
        <IconLucideHome class="w-5 h-5" />
        <span class="mt-0.5">Home</span>
      </router-link>

      <!-- Summary -->
      <router-link
        to="/summary"
        class="flex flex-col items-center justify-center text-xs"
        active-class="text-green-400 font-semibold"
      >
        <IconLucideBarChart class="w-5 h-5" />
        <span class="mt-0.5">Summary</span>
      </router-link>

      <!-- Floating Log Button -->
      <router-link
        to="/deliveries"
        class="relative -top-6"
        active-class="text-green-400"
      >
        <div
          class="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:bg-green-600 transition-all"
        >
          <IconLucidePlus class="w-6 h-6 text-white" />
        </div>
      </router-link>

      <!-- Notifications -->
      <router-link
        to="/notifications"
        class="flex flex-col items-center justify-center text-xs"
        active-class="text-green-400 font-semibold"
      >
        <IconLucideBell class="w-5 h-5" />
        <span class="mt-0.5">Alerts</span>
      </router-link>

      <!-- Account -->
      <router-link
        to="/account"
        class="flex flex-col items-center justify-center text-xs"
        active-class="text-green-400 font-semibold"
      >
        <IconLucideUser class="w-5 h-5" />
        <span class="mt-0.5">Account</span>
      </router-link>
    </nav>
  </div>
</template>

<script>
export default {};
</script>
