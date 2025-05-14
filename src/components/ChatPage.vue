<template>
  <div class="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white font-sans">
    <!-- Header -->
    <div class="p-4 text-lg font-bold backdrop-blur-md bg-white/10 border-b border-white/10">
      💬 Chat Support
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="group relative flex"
        :class="message.user === 'You' ? 'justify-end' : 'justify-start'"
      >
        <!-- Message Bubble -->
        <div
          :class="[
            'relative max-w-xs md:max-w-md p-4 rounded-2xl shadow-md backdrop-blur-md border border-white/10',
            message.user === 'You'
              ? 'bg-blue-600 rounded-br-none text-white'
              : 'bg-white/10 rounded-tl-none text-white/90'
          ]"
        >
          <div class="text-sm font-semibold mb-1">{{ message.user }}</div>
          <div class="text-sm">{{ message.text }}</div>
          <div class="text-xs text-gray-300 mt-1 text-right">{{ message.timestamp }}</div>

          <!-- Reactions Display -->
          <div v-if="message.reactions.length" class="mt-2 flex gap-1 text-lg">
            <span v-for="emoji in message.reactions" :key="emoji">{{ emoji }}</span>
          </div>

          <!-- Emoji Trigger -->
          <div
            class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            @click="toggleEmojiPicker(index)"
          >
            😊
          </div>

          <!-- Emoji Picker -->
          <div
            v-if="activeReactionIndex === index"
            class="absolute z-10 bottom-8 right-0 bg-white/10 backdrop-blur-md border border-white/10 p-2 rounded-lg shadow-lg flex gap-2"
          >
            <button
              v-for="emoji in emojiOptions"
              :key="emoji"
              @click="toggleReaction(index, emoji)"
              class="hover:scale-125 transition"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="bg-white/10 backdrop-blur-md p-4 border-t border-white/10">
      <div class="flex gap-2">
        <input
          v-model="newMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Type a message..."
          class="flex-1 p-3 rounded-lg bg-white/10 backdrop-blur-md text-white placeholder-gray-400 focus:outline-none border border-white/10"
        />
        <button
          @click="sendMessage"
          class="bg-blue-600 hover:bg-blue-700 px-4 rounded-lg transition"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      messages: [
        {
          user: "Alice",
          text: "Hello admin!",
          timestamp: "12:00 PM",
          reactions: [],
        },
        {
          user: "You",
          text: "Hi! How can I help?",
          timestamp: "12:01 PM",
          reactions: [],
        },
      ],
      newMessage: "",
      activeReactionIndex: null,
      emojiOptions: ["👍", "❤️", "😂", "📝"],
    };
  },
  methods: {
    sendMessage() {
      if (this.newMessage.trim()) {
        const time = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        this.messages.push({
          user: "You",
          text: this.newMessage.trim(),
          timestamp: time,
          reactions: [],
        });
        this.newMessage = "";

        this.$nextTick(() => {
          const el = this.$el.querySelector(".overflow-y-auto");
          el.scrollTop = el.scrollHeight;
        });
      }
    },
    toggleEmojiPicker(index) {
      this.activeReactionIndex = this.activeReactionIndex === index ? null : index;
    },
    toggleReaction(index, emoji) {
      const msg = this.messages[index];
      const exists = msg.reactions.includes(emoji);
      msg.reactions = exists
        ? msg.reactions.filter(e => e !== emoji)
        : [...msg.reactions, emoji];
      this.activeReactionIndex = null;
    },
  },
};
</script>

<style scoped>
@media (hover: none) {
  .group-hover\:opacity-100 {
    opacity: 1 !important;
  }
}
</style>
