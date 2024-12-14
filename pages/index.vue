<template>
  <div class="container mx-auto px-4 py-8">
    <BookClubHeader />
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <BookCard 
        v-for="book in selectedBooks" 
        :key="book.id" 
        :book="book"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBookStore } from '~/stores/books';

const bookStore = useBookStore();
const selectedBooks = computed(() => bookStore.selectedBooks);

onMounted(() => {
  bookStore.fetchBooks();
});
</script>