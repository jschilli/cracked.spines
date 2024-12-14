<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden">
    <img :src="book.coverImage" :alt="book.title" class="w-full h-96 object-contain">
    <div class="p-4">
      <h3 class="text-lg font-semibold">{{ book.title }}</h3>
      <p class="text-gray-600">{{ book.author }}</p>
      <p v-if="book.pollCount" class="text-sm text-gray-500 poll-count">
        {{ '📊'.repeat(Math.min(book.pollCount, 5)) }}
        <span class="poll-number">({{ book.pollCount }})</span>
      </p>
      <p v-if="book.pages && book.pages > 500" class="text-sm text-gray-500 book-page-count">&#x1f69a; {{ book.pages }}
        pages</p>
      <div class="mt-2">
        <span class="px-2 py-1 text-sm rounded" :class="statusClass">
          {{ book.status }}
        </span>
      </div>
      <div v-if="book.selectedForDate" class="mt-2 text-sm text-gray-600">
        Selected for: {{ formattedDate }}
      </div>
      <p>
        <a :href="book.link" class="more-info">More Info</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Book } from '~/types/book';
import { getStatusClass } from '~/utils/status';
import { formatDisplayDate } from '~/utils/date';

const props = defineProps<{
  book: Book
}>();

const statusClass = computed(() => getStatusClass(props.book.status));
const formattedDate = computed(() => 
  props.book.selectedForDate ? formatDisplayDate(props.book.selectedForDate) : ''
);
</script>

<style scoped>
.book-page-count {
  font-weight: bold;
}

.more-info {
    display: inline-block;
    margin-top: 10px;
    text-decoration: none;
    color: blue;
}

.more-info:hover {
    text-decoration: underline;
}

.poll-count {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 0;
}

.poll-number {
  color: #666;
  font-size: 0.875rem;
}
</style>