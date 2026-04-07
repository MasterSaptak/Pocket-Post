import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, runTransaction, increment } from 'firebase/firestore';
import { db } from '../firebase';

// ─── Save Task ────────────────────────────────────────────────
export async function toggleSaveTask(taskId: string, userId: string): Promise<{ success: boolean; isSaved: boolean; message: string }> {
  if (!taskId || !userId) return { success: false, isSaved: false, message: 'Invalid identifiers.' };

  const saveId = `${taskId}_${userId}`;
  const saveRef = doc(db, 'savedTasks', saveId);

  try {
    const docSnap = await getDoc(saveRef);
    if (docSnap.exists()) {
      await deleteDoc(saveRef);
      return { success: true, isSaved: false, message: 'Removed from saved tasks.' };
    } else {
      await setDoc(saveRef, {
        taskId,
        userId,
        createdAt: serverTimestamp()
      });
      return { success: true, isSaved: true, message: 'Task saved successfully.' };
    }
  } catch (error: any) {
    console.error('Save toggle error:', error);
    return { success: false, isSaved: false, message: error.message };
  }
}


// ─── Follow Task ─────────────────────────────────────────────
export async function toggleFollowTask(taskId: string, userId: string): Promise<{ success: boolean; isFollowing: boolean; message: string }> {
  if (!taskId || !userId) return { success: false, isFollowing: false, message: 'Invalid identifiers.' };

  const followId = `${taskId}_${userId}`;
  const followRef = doc(db, 'follows', followId);
  const taskRef = doc(db, 'tasks', taskId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const followSnap = await transaction.get(followRef);
      const isFollowingInitially = followSnap.exists();

      if (isFollowingInitially) {
        // Unfollow
        transaction.delete(followRef);
        transaction.update(taskRef, {
          followsCount: increment(-1)
        });
        return false; // isFollowing = false
      } else {
        // Follow
        transaction.set(followRef, {
          taskId,
          userId,
          createdAt: serverTimestamp()
        });
        transaction.update(taskRef, {
          followsCount: increment(1)
        });
        return true; // isFollowing = true
      }
    });

    return { 
      success: true, 
      isFollowing: result, 
      message: result ? 'You are now following this task.' : 'Unfollowed task.' 
    };
  } catch (error: any) {
    console.error('Follow toggle error:', error);
    return { success: false, isFollowing: false, message: error.message };
  }
}
