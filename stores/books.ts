import { defineStore } from 'pinia';
import type { Book, BookStatus } from '~/types/book';
import { mockBooks } from './books/mock-data';

export const useBookStore = defineStore('books', {
  state: () => ({
    books: [] as Book[]
  }),

  getters: {
    getBooksByStatus: (state) => (status: BookStatus) => {
      return state.books.filter(book => book.status === status).sort((a, b) => {
        if (!a.selectedForDate) return 1
        if (!b.selectedForDate) return -1
        
        const dateA = new Date(a.selectedForDate)
        const dateB = new Date(b.selectedForDate)
        
        if (isNaN(dateA.getTime())) return 1
        if (isNaN(dateB.getTime())) return -1
        
        if (dateA < dateB) return -1
        if (dateA > dateB) return 1
        return 0
      });
    },
    
    selectedBooks: (state) => {
      return state.books
        .filter(book => book.status === 'Selected')
        .sort((a, b) => {
          if (!a.selectedForDate || !b.selectedForDate) return 0;
          return new Date(a.selectedForDate).getTime() - new Date(b.selectedForDate).getTime();
        });
    }
  },

  actions: {
    async fetchBooks() {
      // For now, we'll use mock data
      // TODO: Replace with actual API call
      this.books = mockBooks;
    },

    updateBookStatus(bookId: string, newStatus: BookStatus, selectedForDate?: Date) {
      const book = this.books.find(b => b.id === bookId);
      if (book) {
        book.status = newStatus;
        book.selectedForDate = selectedForDate?.toISOString();
        book.updatedAt = new Date().toISOString();
      }
    },

    checkAndUpdateReadStatus() {
      const now = new Date();
      this.books.forEach(book => {
        if (book.status === 'Selected' && book.selectedForDate && new Date(book.selectedForDate) < now) {
          this.updateBookStatus(book.id, 'Read');
        }
      });
    }
  }
});