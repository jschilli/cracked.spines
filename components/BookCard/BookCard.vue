<script setup lang="ts">
import type { Book } from '~/types/book';
import StatusBadge from './StatusBadge.vue';
import BookDetails from './BookDetails.vue';

defineProps<{
  book: Book
}>();
</script>

<template>
  <div class="book-card bg-white rounded-lg shadow-md overflow-hidden max-w-sm h-full flex flex-col">
    <div class="relative">
      <img :src="book.coverImage" :alt="book.title" class="w-48 object-contain mx-auto" />
      <div class="absolute top-2 right-2">
        <StatusBadge :status="book.status" />
      </div>
    </div>
    <div class="p-4 flex flex-col flex-1">
      <div class="flex-1">
        <h3 class="text-lg font-semibold">{{ book.title }}</h3>
        <p class="text-gray-600">{{ book.author }}</p>
        <p v-if="book.pages && book.pages > 500" class="text-sm text-gray-500 book-page-count">{{ book.pages }} pages</p>
      </div>
      <BookDetails 
        :pageCount="book.pages"
        :pollCount="book.pollCount"
        :selectedDate="book.selectedForDate"
        :status="book.status"
      />
      <a 
            v-if="book.link"
            :href="book.link" 
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:text-blue-800 text-sm"
          >
            More Info
          </a>
    </div>
  </div>
</template>

<style scoped>
.book-card {
  transition: transform 0.2s;
}

.book-card:hover {
  transform: translateY(-4px);
}
</style>