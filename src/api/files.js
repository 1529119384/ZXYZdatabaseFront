import request from "../utils/request";

export const fetchList = () => request.get("/api/files");