import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("devflow_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export async function analyzeRepository(repositoryUrl) {
  const { data } = await api.post("/analyses/repository", {
    repository_url: repositoryUrl,
  });

  return data;
}

export async function uploadZip(file) {
  const formData = new FormData();

  formData.append("file", file);

  const { data } = await api.post("/analyses/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
}

export async function listAnalyses() {
  const { data } = await api.get("/analyses");

  return data;
}

export async function downloadAnalysisReport(analysisId) {
  const response = await api.get(`/analyses/${analysisId}/report`, {
    responseType: "blob",
  });

  const fileUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");

  link.href = fileUrl;
  link.setAttribute("download", `devflow-analysis-${analysisId}.pdf`);

  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(fileUrl);
}

export async function loginUser(credentials) {
  const { data } = await api.post("/auth/login", {
    email: credentials.email,
    password: credentials.password,
  });

  return data;
}

export async function registerUser(payload) {
  const { data } = await api.post("/auth/register", payload);

  return data;
}
