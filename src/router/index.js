import { createRouter, createWebHistory } from "vue-router";

import Login from "@/views/login/index.vue";

import Layout from "@/views/layout/index.vue";

import Index from "@/views/index/index.vue";
import MyStar from "@/views/my_star/index.vue";
import MyShare from "@/views/my_share/index.vue";
import RecycleBin from "@/views/recycle_bin/index.vue";
import Setting from "@/views/setting/index.vue";

import Temp from '@/views/temp.vue';
import Temp1 from '@/views/temp1.vue';


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/', name: '', component: Layout,
      redirect: '/index',
      children: [
        { path: 'index', name: 'index', component: Index },
        { path: 'myStar', name: 'my_star', component: MyStar },
        { path: 'myShare', name: 'my_share', component: MyShare },
        { path: 'recycleBin', name: 'recycle_bin', component: RecycleBin },
        { path: 'setting', name: 'setting', component: Setting },
      ]
    },
    { path: '/login', name: 'login', component: Login },
    { path: '/temp', name: 'temp', component: Temp },
    { path: '/temp1', name: 'temp1', component: Temp1 },
  ]
})

export default router;