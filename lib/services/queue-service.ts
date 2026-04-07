import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface QueueJoinResult {
  success: boolean;
  position?: number;
  totalQueueLength?: number;
  message: string;
}

/**
 * Transactional securely handles the "Join Queue" logic.
 * Using a deterministic document ID (taskId_userId) to intrinsically prevent duplicate entries,
 * while utilizing a Firestore Transaction to atomically calculate FIFO positions without race conditions.
 */
export async function joinTaskQueue(taskId: string, userId: string): Promise<QueueJoinResult> {
  if (!taskId || !userId) {
    return { success: false, message: 'Invalid intel provided. Missing ID credentials.' };
  }

  const taskRef = doc(db, 'tasks', taskId);
  const queueDocId = `${taskId}_${userId}`;
  const queueRef = doc(db, 'queue', queueDocId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Fetch Task
      const taskDoc = await transaction.get(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Mission does not exist in the matrix.');
      }

      const taskData = taskDoc.data();

      // Ensure joining is purely allowed on 'assigned' tasks.
      if (taskData.status !== 'assigned') {
        throw new Error(`Queue joining denied. Task status is currently: ${taskData.status.toUpperCase()}. Queue is only open for ASSIGNED tasks.`);
      }

      // Ensure carrier isn't tracking a queue for the task they themselves are holding.
      if (taskData.assignedTo === userId) {
        throw new Error('Conflict error: You are already the active primary carrier for this mission.');
      }

      // 2. Fetch Potential Duplicate
      const existingQueueDoc = await transaction.get(queueRef);
      if (existingQueueDoc.exists() && existingQueueDoc.data()?.status !== 'cancelled') {
        throw new Error('Duplicate error: You are already stationed in the backup queue for this operation.');
      }

      // 3. FIFO Logic Implementation
      const currentQueueLength = taskData.queueCount || 0;
      const nextPosition = currentQueueLength + 1;

      // 4. Execute atomic updates
      transaction.update(taskRef, {
        queueCount: nextPosition
      });

      transaction.set(queueRef, {
        taskId,
        userId,
        status: 'waiting',
        position: nextPosition,
        createdAt: serverTimestamp(),
      });

      return {
        position: nextPosition,
        totalQueueLength: nextPosition,
      };
    });

    return {
      success: true,
      position: result.position,
      totalQueueLength: result.totalQueueLength,
      message: `Successfully slotted into the queue! You are position #${result.position}.`
    };

  } catch (error: any) {
    console.error('Queue Join Error:', error);
    return {
      success: false,
      message: error.message || 'Fatal error processing queue injection limit rules.'
    };
  }
}

/**
 * Handle leaving a queue.
 */
export async function leaveTaskQueue(taskId: string, userId: string): Promise<QueueJoinResult> {
  if (!taskId || !userId) {
    return { success: false, message: 'Invalid credentials.' };
  }

  const taskRef = doc(db, 'tasks', taskId);
  const queueDocId = `${taskId}_${userId}`;
  const queueRef = doc(db, 'queue', queueDocId);

  try {
    await runTransaction(db, async (transaction) => {
      const queueDoc = await transaction.get(queueRef);
      if (!queueDoc.exists() || queueDoc.data()?.status !== 'waiting') {
        throw new Error('You are not currently waiting in this queue.');
      }

      const taskDoc = await transaction.get(taskRef);
      if (taskDoc.exists()) {
        const currentCount = taskDoc.data().queueCount || 1;
        transaction.update(taskRef, {
          queueCount: Math.max(0, currentCount - 1)
        });
      }

      transaction.update(queueRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    });

    return { success: true, message: 'Successfully left the backup queue.' };
  } catch (error: any) {
    console.error('Leave Queue Error:', error);
    return { success: false, message: error.message || 'Error leaving queue.' };
  }
}

import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

/**
 * Drops a task and automatically promotes the next person in the queue.
 * Note: Firestore Transactions don't allow queries across multiple collections easily
 * within the transaction block if the query isn't fully pre-determined.
 * To ensure safe atomicity, we'll fetch the next queue entry, then run a transaction
 * to promote them. If the fetched entry is no longer valid, we abort.
 */
export async function dropTaskAndPromoteQueue(taskId: string, userId: string): Promise<QueueJoinResult> {
  if (!taskId || !userId) {
    return { success: false, message: 'Invalid credentials.' };
  }

  const taskRef = doc(db, 'tasks', taskId);

  try {
    // 1. Fetch the eligible users in the queue for this task
    const q = query(
      collection(db, 'queue'),
      where('taskId', '==', taskId),
      where('status', '==', 'waiting')
    );
    
    const queueSnap = await getDocs(q);
    
    let nextQueueEntry = null;
    if (!queueSnap.empty) {
      // Find the oldest queue entry (earliest createdAt)
      const sortedQueue = queueSnap.docs.sort((a, b) => 
        ((a.data().createdAt as any)?.toMillis?.() || 0) - ((b.data().createdAt as any)?.toMillis?.() || 0)
      );
      nextQueueEntry = sortedQueue[0];
    }

    const result = await runTransaction(db, async (transaction) => {
      const taskDoc = await transaction.get(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task does not exist.');
      }

      const taskData = taskDoc.data();

      // Ensure only the current assignee can drop it
      if (taskData.assignedTo !== userId) {
        throw new Error('Unauthorized: You are not the active carrier for this task.');
      }

      if (nextQueueEntry) {
        // Promote the next user
        const queueRef = doc(db, 'queue', nextQueueEntry.id);
        const queueDoc = await transaction.get(queueRef);
        
        if (!queueDoc.exists() || queueDoc.data()?.status !== 'waiting') {
           // Edge case: User left queue exactly when we tried to promote them
           throw new Error('Queue state changed. Please try again.');
        }

        // We fetch the profile of the new user to attach standard assignedToUser intel
        const nextUserId = queueDoc.data().userId;
        const userRef = doc(db, 'users', nextUserId);
        const userDoc = await transaction.get(userRef);
        let assignedToUser = null;
        if (userDoc.exists()) {
           const ud = userDoc.data();
           assignedToUser = {
              name: ud.displayName || 'Unknown',
              email: ud.email || '',
              avatar: ud.photoURL || null
           };
        }

        transaction.update(queueRef, {
          status: 'promoted',
          promotedAt: serverTimestamp()
        });

        const currentCount = taskData.queueCount || 1;
        transaction.update(taskRef, {
          assignedTo: nextUserId,
          assignedToUser: assignedToUser,
          assignedAt: serverTimestamp(),
          queueCount: Math.max(0, currentCount - 1)
        });

        return { promoted: true, nextUserId };
      } else {
        // No one in queue, revert to open
        transaction.update(taskRef, {
          status: 'open',
          assignedTo: null,
          assignedToUser: null,
          assignedAt: null
        });
        return { promoted: false };
      }
    });

    if (result.promoted) {
       return { success: true, message: 'You dropped the task. The next carrier in queue has been promoted automatically.' };
    } else {
       return { success: true, message: 'You dropped the task. It has reverted to Open status.' };
    }

  } catch (error: any) {
    console.error('Drop task error:', error);
    return { success: false, message: error.message || 'Error dropping task.' };
  }
}
