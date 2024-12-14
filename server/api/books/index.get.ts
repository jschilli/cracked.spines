import { getContainer } from '../../utils/cosmos';
import type { Book } from '~/types/book';

export default defineEventHandler(async () => {
  try {
    const container = await getContainer();
    const { resources } = await container.items
      .query<Book>('SELECT * FROM c')
      .fetchAll();
    
    return resources.map(book => ({
      ...book,
      selectedForDate: book.selectedForDate ? new Date(book.selectedForDate) : undefined,
      createdAt: new Date(book.createdAt),
      updatedAt: new Date(book.updatedAt)
    }));
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch books'
    });
  }
});