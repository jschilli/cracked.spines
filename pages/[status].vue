<template>
  <div class="container mx-auto px-4 py-8">
    <BookClubHeader />
    <h2 class="text-2xl font-bold mb-8 capitalize">{{ status }} Books</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <BookCard 
        v-for="book in filteredBooks" 
        :key="book.id" 
        :book="book"
      />
    </div>
    <BookClubFooter />

  </div>
</template>

<script setup lang="ts">
import { useBookStore } from '~/stores/books';
import { useBookStatus } from '~/composables/useBookStatus';

const route = useRoute();
const { validateStatus } = useBookStatus();

const status = computed(() => {
  try {
    return validateStatus(route.params.status as string);
  } catch (error) {
    navigateTo('/');
    return 'Selected';
  }
});

const bookStore = useBookStore();
const filteredBooks = computed(() => bookStore.getBooksByStatus(status.value));

onMounted(() => {
  bookStore.fetchBooks();
});
</script>