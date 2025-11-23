import axios from "axios";

const request = axios.create({
  baseURL: "",
  timeout: 5000
});

request.interceptors.request.use(
  (request) => {
    return request.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default request;