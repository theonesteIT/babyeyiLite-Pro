import { useEffect, useState } from 'react';
import { getSchools } from '../services/chatApi';
import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api';
const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

let sharedUnreadCount = 0;
let sharedTimer = null;
let sharedPollMs = 45000;
let sharedInFlight = null;
const listeners = new Set();

const emit = (value) => {
  sharedUnreadCount = Number(value || 0);
  listeners.forEach((fn) => fn(sharedUnreadCount));
};

const fetchUnread = async () => {
  if (sharedInFlight) return sharedInFlight;
  sharedInFlight = (async () => {
    try {
      const schools = await getSchools();
      const firstSchool = schools?.[0]?.id;
      if (!firstSchool) {
        emit(0);
        return;
      }
      const res = await api.get('/chat/unread-count', { params: { school_id: firstSchool } });
      emit(Number(res?.data?.data?.unread_count || 0));
    } catch {
      emit(0);
    } finally {
      sharedInFlight = null;
    }
  })();
  return sharedInFlight;
};

const ensurePolling = () => {
  if (sharedTimer) return;
  fetchUnread();
  sharedTimer = setInterval(fetchUnread, sharedPollMs);
};

const stopPollingIfUnused = () => {
  if (listeners.size > 0) return;
  if (sharedTimer) {
    clearInterval(sharedTimer);
    sharedTimer = null;
  }
};

export default function useChatUnread(pollMs = 45000) {
  const [count, setCount] = useState(sharedUnreadCount);

  useEffect(() => {
    if (pollMs > sharedPollMs) {
      sharedPollMs = pollMs;
      if (sharedTimer) {
        clearInterval(sharedTimer);
        sharedTimer = setInterval(fetchUnread, sharedPollMs);
      }
    }

    listeners.add(setCount);
    setCount(sharedUnreadCount);
    ensurePolling();

    return () => {
      listeners.delete(setCount);
      stopPollingIfUnused();
    };
  }, [pollMs]);

  return count;
}
