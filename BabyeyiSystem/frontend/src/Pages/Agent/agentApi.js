import axios from "axios";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;

export const axAgent = {
  get: (path, params) =>
    axios.get(`${API}/agent${path}`, {
      params,
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    }),
};
