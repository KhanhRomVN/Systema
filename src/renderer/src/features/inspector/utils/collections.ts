import { NetworkRequest } from '../types';

export interface SavedRequest extends NetworkRequest {
  savedAt: number;
  collectionId: string;
  notes?: string;
}

export interface RequestCollection {
  id: string;
  name: string;
  requests: SavedRequest[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'systema-request-collections';

export function loadCollections(): RequestCollection[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load collections:', error);
    return [];
  }
}

export const COLLECTIONS_UPDATED_EVENT = 'systema-collections-updated';

function notifyCollectionsUpdated() {
  window.dispatchEvent(new Event(COLLECTIONS_UPDATED_EVENT));
}

export function saveCollections(collections: RequestCollection[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
    notifyCollectionsUpdated();
  } catch (error) {
    console.error('Failed to save collections:', error);
  }
}

export function createCollection(name: string): RequestCollection {
  const collection: RequestCollection = {
    id: Date.now().toString(),
    name,
    requests: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const collections = loadCollections();
  collections.push(collection);
  saveCollections(collections);

  return collection;
}

export function addRequestToCollection(
  collectionId: string,
  request: NetworkRequest,
  notes?: string,
): void {
  const collections = loadCollections();
  const collection = collections.find((c) => c.id === collectionId);

  if (!collection) {
    throw new Error('Collection not found');
  }

  const savedRequest: SavedRequest = {
    ...request,
    savedAt: Date.now(),
    collectionId,
    notes,
  };

  collection.requests.push(savedRequest);
  collection.updatedAt = Date.now();
  saveCollections(collections);
}

export function deleteCollection(collectionId: string): void {
  const collections = loadCollections();
  const filtered = collections.filter((c) => c.id !== collectionId);
  saveCollections(filtered);
}

export function deleteRequestFromCollection(collectionId: string, requestId: string): void {
  const collections = loadCollections();
  const collection = collections.find((c) => c.id === collectionId);

  if (!collection) return;

  collection.requests = collection.requests.filter((r) => r.id !== requestId);
  collection.updatedAt = Date.now();
  saveCollections(collections);
}

export function renameCollection(collectionId: string, newName: string): void {
  const collections = loadCollections();
  const collection = collections.find((c) => c.id === collectionId);

  if (!collection) return;

  collection.name = newName;
  collection.updatedAt = Date.now();
  saveCollections(collections);
}

export async function replayRequest(request: SavedRequest): Promise<Response> {
  // Build the full URL
  const url = `${request.protocol}://${request.host}${request.path}`;

  // Prepare fetch options
  const options: RequestInit = {
    method: request.method,
    headers: request.requestHeaders,
  };

  // Add body for non-GET requests
  if (request.method !== 'GET' && request.requestBody) {
    options.body = request.requestBody;
  }

  // Make the request
  return fetch(url, options);
}

export function getOrCreateDefaultCollection(): RequestCollection {
  const collections = loadCollections();
  if (collections.length > 0) {
    return collections[0];
  }

  const defaultCollection: RequestCollection = {
    id: 'default',
    name: 'Saved Requests',
    requests: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveCollections([defaultCollection]);
  return defaultCollection;
}

export function addRequestToDefaultCollection(request: NetworkRequest, notes?: string): void {
  const collection = getOrCreateDefaultCollection();
  addRequestToCollection(collection.id, request, notes);
}
