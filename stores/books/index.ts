import { defineStore } from 'pinia';
import type { Book, BookStatus } from '~/types/book';
import { mockBooks } from './mock-data';
import type { UpdateBookStatusPayload } from './types';
import { isDatePassed } from '~/utils/date';

export const useBookStore = defineStore('books', {
  state: () => ({
    books: [] as Book[]
  }),

  getters: {
    getBooksByStatus: (state) => (status: BookStatus) => {
      return state.books.filter(book => book.status === status);
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
      // TODO: Replace with actual API call when implementing backend
      this.books = mockBooks;
    },

    updateBookStatus({ bookId, newStatus, selectedForDate }: UpdateBookStatusPayload) {
      const book = this.books.find(b => b.id === bookId);
      if (book) {
        book.status = newStatus;
        book.selectedForDate = selectedForDate?.toISOString().split('T')[0];
        book.updatedAt = new Date().toISOString();
      }
    },

    checkAndUpdateReadStatus() {
      this.books.forEach(book => {
        if (book.status === 'Selected' && book.selectedForDate && isDatePassed(new Date(book.selectedForDate))) {
          console.log('Updating book status to Read for book:', book.id, book.title);
          this.updateBookStatus({ 
            bookId: book.id, 
            newStatus: 'Read' 
          });
        }
      });
    }
  }
});