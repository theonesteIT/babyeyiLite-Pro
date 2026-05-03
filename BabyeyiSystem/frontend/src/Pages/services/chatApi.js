import axios from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5100") + "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL || "http://localhost:5100");

export async function getSessionMe() {
  const res = await api.get("/session/me");
  return res?.data?.data || null;
}

/** Schools the current user may use for chat (parents may have several via linked phone). */
export async function getChatSchools() {
  const res = await api.get("/chat/schools");
  return res?.data?.data || [];
}

export async function getThreads(schoolId) {
  const res = await api.get("/chat/threads", { params: { school_id: schoolId } });
  return res?.data?.data || [];
}

export async function getStaff(schoolId, q = "", roleGroup = "all") {
  const res = await api.get("/chat/staff", {
    params: { school_id: schoolId, q, role_group: roleGroup },
  });
  return res?.data?.data || [];
}

export async function createDirectThread(schoolId, participantUserId) {
  const res = await api.post("/chat/threads", {
    school_id: schoolId,
    participant_user_id: participantUserId,
  });
  return res?.data?.data || null;
}

export async function getMessages(schoolId, threadId, q = "") {
  const res = await api.get(`/chat/threads/${threadId}/messages`, {
    params: { school_id: schoolId, limit: 150, q },
  });
  return res?.data?.data || [];
}

export async function markRead(schoolId, threadId) {
  await api.post(`/chat/threads/${threadId}/read`, { school_id: schoolId });
}

export async function uploadAttachment(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/chat/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res?.data?.data || null;
}

export async function sendMessage(
  schoolId,
  threadId,
  body,
  attachmentUrl = null,
  replyToMessageId = null
) {
  const res = await api.post(`/chat/threads/${threadId}/messages`, {
    school_id: schoolId,
    body,
    attachment_url: attachmentUrl,
    reply_to_message_id: replyToMessageId,
  });
  return res?.data?.data || null;
}
