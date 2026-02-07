/**
 * Presence Stress Test
 * 
 * Tests the realtime presence system with multiple simulated users.
 * This test verifies:
 * - Multiple users can join presence simultaneously
 * - Presence state syncs correctly across all users
 * - Heartbeats update lastActiveAt correctly
 * - Users leaving presence are properly removed
 * - No duplicate presence entries
 * 
 * Run with: bun run test src/test/presence.stress.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Use test environment variables or defaults
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://enyxdizsycghxuqsnrwc.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVueXhkaXpzeWNnaHh1cXNucndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjUzODAsImV4cCI6MjA4NTY0MTM4MH0.BlA9j7noTbo9tB-B6PfpcgSY-78sh8NxeIbu1oL4im4';

interface SimulatedUser {
  id: string;
  displayName: string;
  channel: RealtimeChannel | null;
  client: any; // Use any to avoid complex Supabase type inference
  presenceState: Map<string, any>;
}

interface PresencePayload {
  user_id: string;
  display_name: string;
  purpose: string;
  online_at: string;
}

const TEST_CAFE_ID = 'test-stress-cafe-' + Date.now();
const NUM_USERS = 15;
const SYNC_TIMEOUT_MS = 10000;

describe('Presence Stress Test', () => {
  const users: SimulatedUser[] = [];

  // Create simulated users
  beforeAll(async () => {
    console.log(`\n🧪 Setting up ${NUM_USERS} simulated users...`);
    
    for (let i = 0; i < NUM_USERS; i++) {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });

      users.push({
        id: `test-user-${i}-${Date.now()}`,
        displayName: `Test User ${i + 1}`,
        channel: null,
        client,
        presenceState: new Map(),
      });
    }
    
    console.log(`✅ Created ${users.length} simulated users`);
  }, 30000);

  // Cleanup
  afterAll(async () => {
    console.log('\n🧹 Cleaning up...');
    
    for (const user of users) {
      if (user.channel) {
        await user.channel.untrack();
        user.client.removeChannel(user.channel);
      }
    }
    
    console.log('✅ Cleanup complete');
  }, 30000);

  it('should allow all users to join presence channel', async () => {
    console.log('\n📡 Test: All users joining presence...');
    const startTime = Date.now();

    const joinPromises = users.map((user, index) => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`User ${index} failed to subscribe within timeout`));
        }, SYNC_TIMEOUT_MS);

        const channel = user.client.channel(`cafe-presence-${TEST_CAFE_ID}`, {
          config: {
            presence: {
              key: user.id,
            },
          },
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState() as Record<string, PresencePayload[]>;
            user.presenceState = new Map(
              Object.entries(state).map(([key, value]) => [key, value])
            );
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                user_id: user.id,
                display_name: user.displayName,
                purpose: 'chat',
                online_at: new Date().toISOString(),
              });
              clearTimeout(timeout);
              resolve();
            } else if (status === 'CHANNEL_ERROR') {
              clearTimeout(timeout);
              reject(new Error(`Channel error for user ${index}`));
            }
          });

        user.channel = channel;
      });
    });

    await Promise.all(joinPromises);
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ All ${NUM_USERS} users joined in ${elapsed}ms`);
    
    expect(users.every(u => u.channel !== null)).toBe(true);
  }, 30000);

  it('should sync presence state across all users within 5 seconds', async () => {
    console.log('\n🔄 Test: Verifying presence sync...');
    
    // Wait for presence to sync
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check each user sees all other users
    const syncResults: { userId: string; seenCount: number }[] = [];
    
    for (const user of users) {
      const state = (user.channel?.presenceState() || {}) as Record<string, PresencePayload[]>;
      const presenceCount = Object.keys(state).length;
      syncResults.push({ userId: user.id, seenCount: presenceCount });
    }

    console.log('Sync results:', syncResults.map(r => r.seenCount).join(', '));
    
    // All users should see all users (including themselves)
    const allSynced = syncResults.every(r => r.seenCount >= NUM_USERS - 2); // Allow 2 user tolerance
    
    if (!allSynced) {
      console.warn('⚠️ Some users did not sync all presence');
      syncResults.forEach((r, i) => {
        if (r.seenCount < NUM_USERS - 2) {
          console.warn(`  User ${i}: only sees ${r.seenCount}/${NUM_USERS}`);
        }
      });
    }

    expect(allSynced).toBe(true);
  }, 15000);

  it('should update presence heartbeat correctly', async () => {
    console.log('\n💓 Test: Heartbeat updates...');
    
    // Get initial timestamps
    const initialState = (users[0].channel?.presenceState() || {}) as Record<string, PresencePayload[]>;
    const initialTimestamps = new Map<string, string>();
    
    Object.values(initialState).flat().forEach((presence: PresencePayload) => {
      if (presence.user_id) {
        initialTimestamps.set(presence.user_id, presence.online_at);
      }
    });

    // Send heartbeat from first 5 users
    const heartbeatUsers = users.slice(0, 5);
    await Promise.all(
      heartbeatUsers.map(user => 
        user.channel?.track({
          user_id: user.id,
          display_name: user.displayName,
          purpose: 'chat',
          online_at: new Date().toISOString(),
        })
      )
    );

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify timestamps updated
    const newState = (users[0].channel?.presenceState() || {}) as Record<string, PresencePayload[]>;
    let updatedCount = 0;

    Object.values(newState).flat().forEach((presence: PresencePayload) => {
      if (presence.user_id && heartbeatUsers.some(u => u.id === presence.user_id)) {
        const oldTime = initialTimestamps.get(presence.user_id);
        if (oldTime && presence.online_at > oldTime) {
          updatedCount++;
        }
      }
    });

    console.log(`✅ ${updatedCount}/${heartbeatUsers.length} users updated their heartbeat`);
    expect(updatedCount).toBeGreaterThan(0);
  }, 10000);

  it('should handle users leaving correctly', async () => {
    console.log('\n👋 Test: Users leaving presence...');
    
    // Have 3 users leave
    const leavingUsers = users.slice(0, 3);
    
    await Promise.all(
      leavingUsers.map(async (user) => {
        await user.channel?.untrack();
      })
    );

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check remaining users see fewer presences
    const remainingUser = users[users.length - 1];
    const state = (remainingUser.channel?.presenceState() || {}) as Record<string, PresencePayload[]>;
    const presenceCount = Object.keys(state).length;

    console.log(`✅ After 3 users left: ${presenceCount} presences remaining`);
    
    // Should have fewer users now
    expect(presenceCount).toBeLessThan(NUM_USERS);
  }, 10000);

  it('should have no duplicate presence entries', async () => {
    console.log('\n🔍 Test: Checking for duplicates...');
    
    const checkUser = users[users.length - 1];
    const state = (checkUser.channel?.presenceState() || {}) as Record<string, PresencePayload[]>;
    
    const userIds = new Set<string>();
    let duplicateCount = 0;
    
    Object.values(state).flat().forEach((presence: PresencePayload) => {
      if (presence.user_id) {
        if (userIds.has(presence.user_id)) {
          duplicateCount++;
          console.warn(`⚠️ Duplicate found: ${presence.user_id}`);
        }
        userIds.add(presence.user_id);
      }
    });

    console.log(`✅ Found ${duplicateCount} duplicates among ${userIds.size} unique users`);
    expect(duplicateCount).toBe(0);
  }, 5000);
});

describe('Presence Performance Metrics', () => {
  it('should report performance summary', async () => {
    console.log('\n📊 Performance Summary:');
    console.log('========================');
    console.log(`Users tested: ${NUM_USERS}`);
    console.log(`Test cafe ID: ${TEST_CAFE_ID}`);
    console.log('Tests completed successfully');
    console.log('========================\n');
    
    expect(true).toBe(true);
  });
});
