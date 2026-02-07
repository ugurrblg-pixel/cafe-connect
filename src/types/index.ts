export type Purpose = 'chat' | 'friendship' | 'dating';

export interface User {
  id: string;
  name: string;
  displayName?: string;
  age: number;
  bio: string;
  photoUrl: string;
  purpose: Purpose;
  allowDMs: boolean;
  isOnline: boolean;
  isVisible?: boolean;
  checkedInAt?: Date;
  lastActiveAt?: Date;
  cafeId?: string;
}

export interface Cafe {
  id: string;
  name: string;
  address: string;
  distance: string;
  imageUrl: string;
  activeUsers: number;
  isOpen: boolean;
  openingHours?: string | null; // OSM opening_hours format
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface Interaction {
  type: 'wave' | 'coffee' | 'eye';
  fromUserId: string;
  toUserId: string;
  timestamp: Date;
}
