import { getContainer } from '../../utils/cosmos';
import { bookSchema } from '~/stores/books/types';
import type { Book } from '~/types/book';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  try {
    const newBook = bookSchema.parse({
      ...body,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const container = await getContainer();
    const { resource } = await container.items.create<Book>(newBook);
    
    return resource;
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: 'Invalid book data'
    });
  }
});