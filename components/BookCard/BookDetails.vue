<script setup lang="ts">
import type { Book } from '~/types/book';
import { formatDisplayDate } from '~/utils/date';

const { pageCount, pollCount, selectedDate, status } = defineProps<{
  pageCount: Book['pages'];
  pollCount: Book['pollCount'];
  selectedDate?: Book['selectedForDate'];
  status: Book['status'];
}>();

const formattedDate = computed(() => 
  selectedDate ? formatDisplayDate(new Date(selectedDate + 'T00:00:00')) : ''
);
const dateLabel = computed(() => 
  status === 'Read' ? 'Read:' : 'Selected:'
);
</script>

<template>
  <div class="grid grid-cols-2 gap-2 text-sm mb-4">
    <div class="text-gray-600">
      <div class="flex items-center gap-1">
        <div class="bg-gray-200 rounded-md px-2 py-1 flex items-center">
          <div class="flex gap-1">
            <div v-for="n in 5" :key="n" 
                 class="w-1.5 h-4 rounded-sm"
                 :class="n <= pollCount ? 'bg-blue-500' : 'bg-gray-300'">
            </div>
          </div>
          <span class="ml-2 font-medium">{{ pollCount }}</span>
        </div>
      </div>
    </div>
    <div class="text-gray-600">
      <p v-if="pageCount && pageCount > 500" class="text-sm text-gray-500 book-page-count">&#x1f69a; {{ pageCount }}
        pages</p>
    </div>
    <div v-if="selectedDate" class="text-gray-600 col-span-2">
      <span class="font-medium">{{ dateLabel }}</span> {{ formattedDate }}
    </div>
  </div>
</template>