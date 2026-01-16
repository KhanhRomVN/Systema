import { NetworkRequest } from '../types';

export interface RequestHistory {
  timestamp: number;
  status: number;
  statusText: string;
  time: number;
  size: number;
  headers: Record<string, string>;
  body: string;
}

export interface SavedRequest extends NetworkRequest {
  savedAt: number;
  collectionId: string;
  notes?: string;
  lastResponse?: RequestHistory;
  history?: RequestHistory[];
}

export interface RequestCollection {
  id: string;
  name: string;
  requests: SavedRequest[];
  createdAt: number;
  updatedAt: number;
  appId: string; // Add appId to collection
}

const STORAGE_KEY_PREFIX = 'systema-request-collections';

function getStorageKey(appId: string): string {
  return `${STORAGE_KEY_PREFIX}-${appId}`;
}

export function loadCollections(appId: string): RequestCollection[] {
  try {
    const data = localStorage.getItem(getStorageKey(appId));
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

export function saveCollections(appId: string, collections: RequestCollection[]): void {
  try {
    localStorage.setItem(getStorageKey(appId), JSON.stringify(collections));
    notifyCollectionsUpdated();
  } catch (error) {
    console.error('Failed to save collections:', error);
  }
}

export function createCollection(appId: string, name: string): RequestCollection {
  const collection: RequestCollection = {
    id: Date.now().toString(),
    name,
    requests: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    appId,
  };

  const collections = loadCollections(appId);
  collections.push(collection);
  saveCollections(appId, collections);

  return collection;
}

export function addRequestToCollection(
  appId: string,
  collectionId: string,
  request: NetworkRequest,
  notes?: string,
): void {
  const collections = loadCollections(appId);
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
  saveCollections(appId, collections);
}

export function deleteCollection(appId: string, collectionId: string): void {
  const collections = loadCollections(appId);
  const filtered = collections.filter((c) => c.id !== collectionId);
  saveCollections(appId, filtered);
}

export function deleteRequestFromCollection(
  appId: string,
  collectionId: string,
  requestId: string,
): void {
  const collections = loadCollections(appId);
  const collection = collections.find((c) => c.id === collectionId);

  if (!collection) return;

  collection.requests = collection.requests.filter((r) => r.id !== requestId);
  collection.updatedAt = Date.now();
  saveCollections(appId, collections);
}

export function renameCollection(appId: string, collectionId: string, newName: string): void {
  const collections = loadCollections(appId);
  const collection = collections.find((c) => c.id === collectionId);

  if (!collection) return;

  collection.name = newName;
  collection.updatedAt = Date.now();
  saveCollections(appId, collections);
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

export function getOrCreateDefaultCollection(appId: string): RequestCollection {
  const collections = loadCollections(appId);
  if (collections.length > 0) {
    return collections[0];
  }

  const defaultCollection: RequestCollection = {
    id: 'default',
    name: 'Saved Requests',
    requests: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    appId,
  };

  saveCollections(appId, [defaultCollection]);
  return defaultCollection;
}

export function addRequestToDefaultCollection(
  appId: string,
  request: NetworkRequest,
  notes?: string,
): void {
  const collection = getOrCreateDefaultCollection(appId);
  addRequestToCollection(appId, collection.id, request, notes);
}

export function updateSavedRequest(
  appId: string,
  collectionId: string,
  requestId: string,
  updates: Partial<SavedRequest>,
): void {
  const collections = loadCollections(appId);
  const collection = collections.find((c) => c.id === collectionId);

  if (!collection) return;

  const requestIndex = collection.requests.findIndex((r) => r.id === requestId);
  if (requestIndex === -1) return;

  collection.requests[requestIndex] = {
    ...collection.requests[requestIndex],
    ...updates,
  };

  collection.updatedAt = Date.now();
  saveCollections(appId, collections);
}
