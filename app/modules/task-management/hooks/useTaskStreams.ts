// app/modules/task-management/hooks/useTaskStreams.ts
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  Firestore,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  Auth,
  User as FirebaseUser,
} from "firebase/auth";

type TaskType = {
  id: string;
  taskName: string;
  details?: string;
  startDate?: number | null;
  dueDate?: number | null;
  assignedTo?: string | string[];
  completed?: boolean;
  createdAt: number;
  updatedAt: number;
  CreatedUser: { id: string; name: string; email?: string };
  priorityScore?: number;
  guests?: string[];
};

type CommentType = {
  id: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
  user: { id: string; name: string; email?: string };
  parentId?: string | null;
  mentions?: string[];
};

type ChatMessageType = {
  id: string;
  text: string;
  createdAt: number;
  user: { id: string; name: string; email?: string };
};

type UseTasksStreamParams = {
  db?: Firestore;
  auth?: Auth;
  canUserSeeTask: (task: TaskType, user: FirebaseUser | null) => boolean;
};

export function useTasksStream(params: UseTasksStreamParams) {
  const db = params.db ?? getFirestore();
  const auth = params.auth ?? getAuth();

  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // keep user reactive
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(collection(db, "Tasks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allTasks: TaskType[] = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as TaskType)
        );

        allTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const visible = user
          ? allTasks.filter((t) => params.canUserSeeTask(t, user))
          : [];

        setTasks(visible);
        setLoading(false);
      },
      (e) => {
        console.error("useTasksStream error:", e);
        setError(e?.message || "Failed to load tasks");
        setTasks([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, user?.uid, user?.email, params.canUserSeeTask]);

  return { tasks, loading, error, user };
}

type UseTaskDetailStreamsParams = {
  taskId: string | null;
  db?: Firestore;
};

export function useTaskDetailStreams(params: UseTaskDetailStreamsParams) {
  const db = params.db ?? getFirestore();
  const taskId = params.taskId;

  const [comments, setComments] = useState<CommentType[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setComments([]);
      setSubtasks([]);
      setChatMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubComments = onSnapshot(
      query(
        collection(db, "Tasks", taskId, "Comments"),
        orderBy("createdAt", "asc")
      ),
      (snapshot) => {
        const all: CommentType[] = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CommentType)
        );
        setComments(all);
      }
    );

    const unsubSubtasks = onSnapshot(
      query(
        collection(db, "Tasks", taskId, "Subtasks"),
        orderBy("createdAt", "asc")
      ),
      (snapshot) => {
        const all: any[] = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as any)
        );
        setSubtasks(all);
      }
    );

    const unsubChat = onSnapshot(
      query(
        collection(db, "Tasks", taskId, "ChatMessages"),
        orderBy("createdAt", "asc")
      ),
      (snapshot) => {
        const all: ChatMessageType[] = snapshot.docs.map(
          (docSnap) =>
            ({ id: docSnap.id, ...docSnap.data() } as ChatMessageType)
        );
        setChatMessages(all);
      }
    );

    setLoading(false);

    return () => {
      unsubComments();
      unsubSubtasks();
      unsubChat();
    };
  }, [db, taskId]);

  return { comments, subtasks, chatMessages, loading };
}
