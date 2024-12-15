<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-4">All Books</h1>
    <div v-if="books.length">
      <div v-for="status in VALID_STATUSES" :key="status" class="mb-8">
        <h2 class="text-xl font-semibold mb-4">{{ status }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <BookCard
            v-for="book in booksByStatus[status]"
            :key="book.isbn"
            :book="book"
          />
        </div>
      </div>
    </div>
    <div v-else>
      Loading books...
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBookStore } from '~/stores/books'
import { VALID_STATUSES } from '~/utils/status'

const bookStore = useBookStore()
const books = computed(() => bookStore.books)

onMounted(() => {
  if (!books.value.length) {
    bookStore.fetchBooks()
  }
})

const booksByStatus = computed(() => {
  return VALID_STATUSES.reduce((acc, status) => {
    acc[status] = books.value
      .filter(book => book.status === status)
      .sort((a, b) => {
        if (!a.selectedForDate) return 1
        if (!b.selectedForDate) return -1
        
        const dateA = new Date(a.selectedForDate)
        const dateB = new Date(b.selectedForDate)
        
        if (isNaN(dateA.getTime())) return 1
        if (isNaN(dateB.getTime())) return -1
        
        if (dateA < dateB) return -1
        if (dateA > dateB) return 1
        return 0
      })
    return acc
  }, {} as Record<string, typeof books.value>)
})
</script> 