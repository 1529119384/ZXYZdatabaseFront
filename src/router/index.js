import { createRouter, createWebHistory } from "vue-router";
import { isLoggedIn } from "@/utils/auth";

import Login from "@/views/login/index.vue";
import Layout from "@/views/layout/index.vue";
import Index from "@/views/index/index.vue";
import MyStar from "@/views/my_star/index.vue";
import MyShare from "@/views/my_share/index.vue";
import RecycleBin from "@/views/recycle_bin/index.vue";
import Setting from "@/views/setting/index.vue";
import Temp from "@/views/temp.vue";

const publicRouteNames = new Set(["login", "temp"]);

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "layout",
      component: Layout,
      redirect: "/index",
      children: [
        { path: "index", name: "index", component: Index },
        { path: "myStar", name: "my_star", component: MyStar },
        { path: "myShare", name: "my_share", component: MyShare },
        { path: "recycleBin", name: "recycle_bin", component: RecycleBin },
        { path: "setting", name: "setting", component: Setting },
      ],
    },
    { path: "/login", name: "login", component: Login },
    { path: "/temp", name: "temp", component: Temp },
  ],
});

router.beforeEach((to, from, next) => {
  if (publicRouteNames.has(to.name)) return next();

  if (!isLoggedIn()) {
    next({ name: "login", query: { redirect: to.fullPath } });
    return;
  }

  next();
});

export default router;
