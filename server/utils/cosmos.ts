import { CosmosClient } from '@azure/cosmos';

const endpoint = process.env.COSMOS_ENDPOINT || '';
const key = process.env.COSMOS_KEY || '';
const databaseId = 'BookClubDB';
const containerId = 'Books';

// export const client = new CosmosClient({ endpoint, key });

export const getContainer = async () => {
  // const { database } = await client.databases.createIfNotExists({ id: databaseId });
  // const { container } = await database.containers.createIfNotExists({
  //   id: containerId,
  //   partitionKey: { paths: ['/id'] }
  // });
  // return container;
};